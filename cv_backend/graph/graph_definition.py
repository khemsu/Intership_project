
import os
import logging
import redis
import time
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from langchain_community.graphs import Neo4jGraph
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI, HarmBlockThreshold, HarmCategory
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_community.embeddings import HuggingFaceEmbeddings
from pinecone import Pinecone as PineconeClient, ServerlessSpec
import asyncio
from functools import lru_cache
import random
from services.prompt_manager import get_prompt_by_id, update_prompt, list_prompt_ids

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Configuration class
class Config:
    def __init__(self):
        self.neo4j_uri = os.getenv("NEO4J_URI")
        self.neo4j_user = os.getenv("NEO4J_USER")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD")
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME")
        self.redis_url = os.getenv("REDIS_URL")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        
        
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "all-mpnet-base-v2")
        self.embedding_dimension = int(os.getenv("EMBEDDING_DIMENSION", "768"))
        self.llm_model = os.getenv("LLM_MODEL", "gemini-2.5-flash")
        self.llm_temperature = float(os.getenv("LLM_TEMPERATURE", "0.1"))
        self.llm_max_tokens = int(os.getenv("LLM_MAX_TOKENS", "2048"))
        self.llm_timeout = int(os.getenv("LLM_TIMEOUT", "15"))
        self.max_search_results = int(os.getenv("MAX_SEARCH_RESULTS", "5"))
        self.max_content_length = int(os.getenv("MAX_CONTENT_LENGTH", "1500"))
        self.search_score_threshold = float(os.getenv("SEARCH_SCORE_THRESHOLD", "0.3"))
        self.history_ttl = int(os.getenv("HISTORY_TTL", "86400"))  # Default to 24 hours
        self.prompt_cache_ttl = int(os.getenv("PROMPT_CACHE_TTL", "3600"))  # 1 hour cache for prompts

        required_vars = [
            "neo4j_uri", "neo4j_user", "neo4j_password",
            "pinecone_api_key", "pinecone_index_name",
            "redis_url", "google_api_key"
        ]
        missing = [v for v in required_vars if not getattr(self, v)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

config = Config()

# Initialize LLM with safety
safety_settings = {
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
}
llm = ChatGoogleGenerativeAI(
    model=config.llm_model,
    temperature=config.llm_temperature,
    safety_settings=safety_settings,
    max_tokens=config.llm_max_tokens,
    timeout=config.llm_timeout
)

# Initialize embeddings
embeddings = HuggingFaceEmbeddings(
    model_name=config.embedding_model,
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

sllm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")

# -----------------------------------------------------------------------------
# Prompt management functions
# -----------------------------------------------------------------------------

def get_prompt_from_db(prompt_id: str) -> str:
    """Fetch prompt from MongoDB via prompt_manager with caching"""
    cache_key = f"prompt:{prompt_id}"
    
    # Try Redis cache first
    try:
        if cached := get_cached_result(cache_key):
            logger.debug(f"Retrieved prompt '{prompt_id}' from cache")
            return cached
    except Exception as e:
        logger.warning(f"Cache retrieval failed for prompt '{prompt_id}': {e}")
    
    # Fetch from MongoDB via prompt_manager
    try:
        content = get_prompt_by_id(prompt_id)
        
        if not content:
            logger.error(f"Prompt with _id '{prompt_id}' not found or empty")
            return f"Error: Prompt '{prompt_id}' not found. Please check your prompt configuration."
        
        # Cache the prompt
        try:
            cache_result(cache_key, content, config.prompt_cache_ttl)
            logger.debug(f"Cached prompt '{prompt_id}' for {config.prompt_cache_ttl} seconds")
        except Exception as e:
            logger.warning(f"Failed to cache prompt '{prompt_id}': {e}")
        
        logger.info(f"Retrieved prompt '{prompt_id}' from MongoDB")
        return content
        
    except Exception as e:
        logger.error(f"Failed to fetch prompt '{prompt_id}' from MongoDB: {e}")
        return f"Error retrieving prompt '{prompt_id}': {str(e)}"

# -----------------------------------------------------------------------------
# Async connection setup
# -----------------------------------------------------------------------------

async def setup_neo4j_connection(max_retries=3):
    for i in range(max_retries):
        try:
            logger.info(f"Connecting to Neo4j (attempt {i+1})...")
            g = Neo4jGraph(
                url=config.neo4j_uri,
                username=config.neo4j_user,
                password=config.neo4j_password,
                database="neo4j"
            )
            g.query("RETURN 1 AS test")  # Sync call
            logger.info("Neo4j connected successfully")
            return g
        except Exception as e:
            logger.error(f"Neo4j connect failed (attempt {i+1}): {e}")
            if i == max_retries - 1:
                raise
            await asyncio.sleep(2**i)

async def setup_pinecone_connection(max_retries=3):
    for i in range(max_retries):
        try:
            logger.info(f"Initializing Pinecone (attempt {i+1})...")
            pc = PineconeClient(api_key=config.pinecone_api_key)
            indexes = pc.list_indexes().names()
            
            if config.pinecone_index_name not in indexes:
                logger.info(f"Creating Pinecone index: {config.pinecone_index_name}")
                pc.create_index(
                    name=config.pinecone_index_name,
                    dimension=config.embedding_dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                logger.info("Waiting for Pinecone index to initialize...")
                await asyncio.sleep(30)
            
            vs = PineconeVectorStore.from_existing_index(
                index_name=config.pinecone_index_name,
                embedding=embeddings,
                namespace="__default__"
            )
            logger.info("Pinecone connected successfully")
            return vs
        except Exception as e:
            logger.error(f"Pinecone init failed (attempt {i+1}): {e}")
            if i == max_retries - 1:
                raise
            await asyncio.sleep(2**i)

async def setup_redis_connection(max_retries=3):
    for i in range(max_retries):
        try:
            logger.info(f"Connecting to Redis (attempt {i+1})...")
            r = redis.Redis.from_url(
                config.redis_url,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            r.ping()
            logger.info("Redis connected successfully")
            return r
        except Exception as e:
            logger.error(f"Redis connect failed (attempt {i+1}): {e}")
            if i == max_retries - 1:
                raise
            await asyncio.sleep(2**i)

# Initialize connections in background
neo4j_graph = None
vectorstore = None
redis_client = None

async def initialize_connections():
    global neo4j_graph, vectorstore, redis_client
    neo4j_graph = await setup_neo4j_connection()
    vectorstore = await setup_pinecone_connection()
    redis_client = await setup_redis_connection()
    logger.info("All connections established")

asyncio.create_task(initialize_connections())

# -----------------------------------------------------------------------------
# Cached helper functions
# -----------------------------------------------------------------------------

@lru_cache(maxsize=128)
def clean_cypher_query(query: str) -> str:
    if not query:
        return ""
    
    if "```" in query:
        query = query.split("```")[-2]
    
    query = re.sub(r'//.*', '', query)
    lines = [ln.strip() for ln in query.splitlines() if ln.strip()]
    return "\n".join(lines)

async def format_neo4j_results(results: List[Dict[str, Any]]) -> str:
    """
    Convert Neo4j JSON into a friendly, human-like answer.
    """
    if not results:
        return "I didn't find anything for that query."

    # Pretty-print JSON for the LLM
    result_json = json.dumps(results, indent=2)

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are TriNetra, a helpful CV assistant. "
         "Rephrase the following structured data into a short, warm, conversational answer. "
         "Avoid technical labels like 'node', 'property', or JSON. "
         "Use bullets only if the list is long. Keep it under 5 sentences."),
        ("human", "{result_json}")
    ])
    response = llm.invoke(prompt.format_messages(result_json=result_json))
    return response.content.strip()

def format_semantic_results_for_llm(results: List[Any], query: str) -> str:
    chunks = []
    for doc in results:
        md = getattr(doc, "metadata", {})
        text = md.get("text", "") or getattr(doc, "page_content", "")
        
        text = re.sub(r'\n{2,}', "\n\n", text).strip()
        chunks.append(text)
    
    return "\n---\n".join(chunks)

def cache_result(key: str, result: str, ttl=600):
    try:
        redis_client.setex(f"cache:{hash(key)}", ttl, result)
    except Exception as e:
        logger.error(f"Cache set failed: {e}")

def get_cached_result(key: str) -> Optional[str]:
    try:
        v = redis_client.get(f"cache:{hash(key)}")
        return v.decode() if v else None
    except Exception as e:
        logger.error(f"Cache get failed: {e}")
        return None

def check_meaningful_results(results: List[Dict[str, Any]], query: str) -> bool:
    if not results:
        return False
    
    for result in results:
        if isinstance(result, dict):
            meaningful_values = [v for v in result.values() if v is not None and v != ""]
            if meaningful_values:
                return True
        elif result is not None and result != "":
            return True
    
    return False

# -----------------------------------------------------------------------------
# Enhanced Intent classification
# -----------------------------------------------------------------------------

async def classify_intent_enhanced(query: str) -> dict:
    cache_key = f"intent_v2:{hash(query)}"
    if cached := get_cached_result(cache_key):
        return json.loads(cached)
    
    # Get prompt from MongoDB via prompt_manager
    prompt_template = get_prompt_from_db("intent_classification")
    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm
    
    try:
        resp = await chain.ainvoke({"input": query})
        m = re.search(r'\{.*\}', resp.content, re.DOTALL)
        if not m:
            raise ValueError("No JSON in intent response")
            
        data = json.loads(m.group(0))
        intent = data.get("intent", "").lower()
        
        valid_intents = ["neo4j_cv_query", "semantic_search_required", "general_chat"]
        if intent not in valid_intents:
            intent = "general_chat"
        
        result = {
            "intent": intent,
            "confidence": data.get("confidence", "low"),
            "entities": data.get("entities", {}),
            "reasoning": data.get("reasoning", "")
        }
        
        cache_result(cache_key, json.dumps(result))
        return result
        
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return {"intent": "general_chat", "confidence": "low", "entities": {}, "reasoning": "Classification error"}

# -----------------------------------------------------------------------------
# Enhanced search functions
# -----------------------------------------------------------------------------

async def enhanced_neo4j_query(input_query: str, entities: dict) -> Tuple[str, bool]:
    cache_key = f"neo4j_enhanced:{input_query}:{entities}"
    if cached := get_cached_result(cache_key):
        cached_data = json.loads(cached)
        return cached_data["response"], cached_data["has_results"]
    
    fallbacks = [
        "Hmm... nothing came up for that. Try rewording your question?",
        "I couldn't find any matching data in the graph.",
        "That one stumped me — nothing matched in our database"
    ]

    try:
        schema = neo4j_graph.schema
        
        # Get prompt from MongoDB via prompt_manager
        prompt_template = get_prompt_from_db("cypher_generation")
        
        prompt = prompt_template.format(
            input=input_query,
            schema=schema
        )
        
        cypher_resp = await llm.ainvoke(prompt)
        cypher = clean_cypher_query(cypher_resp.content)
        print(f"Generated Cypher: {cypher}")
        
        if not cypher:
            return "Unable to generate query", False
        
        results = neo4j_graph.query(cypher)
        logger.info(f"Neo4j query results: {len(results)} records")
        
        has_meaningful_results = check_meaningful_results(results, input_query)
        
        if has_meaningful_results:
            response = await format_neo4j_results(results)
            cache_data = {"response": response, "has_results": True}
            cache_result(cache_key, json.dumps(cache_data))
            return response, True
        else:
            logger.info(f"No meaningful Neo4j results for: {input_query}")
            return random.choice(fallbacks), False
        
    except Exception as e:
        logger.error(f"Neo4j query failed: {e}")
        return random.choice(fallbacks), False

async def pinecone_search_with_context(query: str, entities: dict, search_context: str, history_context: str = "") -> str:
    cache_key = f"pinecone_v2:{query}:{entities}:{search_context}:{history_context}"
    if cached := get_cached_result(cache_key):
        return cached
    
    try:
        enhanced_query = query
        if search_context == "neo4j_fallback":
            enhanced_query = f"Find information about: {query}"
        
        if person_name := entities.get("person_name"):
            enhanced_query = f"{person_name} {enhanced_query}"
        
        docs = vectorstore.similarity_search(
            enhanced_query,
            k=config.max_search_results
        )
        
        chunks = format_semantic_results_for_llm(docs, query)
        if not chunks:
            if search_context == "neo4j_fallback":
                return f"I couldn't find specific information about '{query}' in either structured data or document contents."
            else:
                return "No relevant information found in the resume database."
        
        if search_context == "neo4j_fallback":
            synthesis_context = f"The user asked: '{query}'. Structured data search found no results, so I'm searching through resume content. "
        else:
            synthesis_context = f"The user asked: '{query}'. "
        
        # Get prompt from MongoDB via prompt_manager
        prompt_template = get_prompt_from_db("semantic_synthesis")
        
        enhanced_synthesis_prompt = f"""
        {history_context}
        {synthesis_context}
        
        {prompt_template}
        """
        
        synth_prompt = enhanced_synthesis_prompt.format(
            original_query=query,
            search_results=chunks
        )
        print(f"Synthesis prompt: {synth_prompt}")

        response = (await llm.ainvoke(synth_prompt)).content
        print(f"Synthesis response: {response}")
        cache_result(cache_key, response)
        return response
        
    except Exception as e:
        logger.error(f"Enhanced Pinecone search error: {e}")
        return "I encountered an error searching through the resume database."

async def general_chat(query: str) -> str:
    query_lower = query.lower()
    if re.match(r"(hi|hello|hey|greetings|good morning|good afternoon)", query_lower):
        return "Hello! How can I assist with your CV/Resume today?"
    
    if re.match(r"(thanks|thank you|appreciate it|cheers)", query_lower):
        return "You're welcome! Is there anything else I can help with?"
    
    if re.match(r"(great|good|nice|awesome)", query_lower):
        return "I'm glad! What else can I help you with?"
    
    # Get prompt from MongoDB via prompt_manager
    prompt_template = get_prompt_from_db("general_chat")
    prompt = prompt_template.format(input=query)
    return (await llm.ainvoke(prompt)).content

# -----------------------------------------------------------------------------
# Enhanced main chat interface
# -----------------------------------------------------------------------------

async def enhanced_chat_interface(query: str, session_id: str) -> str:
    fallbacks = [
        "Hmm... nothing came up for that. Try rewording your question?",
        "I couldn't find any matching data in the database.",
        "That one stumped me — nothing matched in our database.",
        "No relevant information found. Want to refine your query?"
    ]

    start_time = time.time()
    
    try:
        if not query.strip():
            return "Please provide a valid query."
        
        if re.match(r"(hi|hello|hey|greetings|good morning|good afternoon)", query.lower()):
            return "Hello! How can I assist with your CV/Resume today?"
        
        history = get_message_history(session_id)
        history_messages = history.messages
        history_context = ""
        if history_messages:
            history_context = "\n".join(
                [f"{'User' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}"
                 for msg in history_messages[-10:]]
            )
            history_context = f"**Conversation History:**\n{history_context}\n\n"
        
        intent_data = await classify_intent_enhanced(query)
        intent = intent_data["intent"]
        entities = intent_data["entities"]
        
        logger.info(f"Intent: {intent}, Confidence: {intent_data['confidence']}")
        
        if intent == "general_chat":
            prompt_template = get_prompt_from_db("general_chat")
            prompt = f"{history_context}{prompt_template.format(input=query)}"
            response = (await llm.ainvoke(prompt)).content
            
        elif intent == "neo4j_cv_query":
            neo4j_response, has_results = await enhanced_neo4j_query(query, entities)
            
            if has_results:
                response = neo4j_response
                logger.info("Query satisfied by Neo4j")
            else:
                logger.info("Neo4j returned no results, falling back to Pinecone")
                response = await pinecone_search_with_context(query, entities, "neo4j_fallback", history_context)
                print(f"Latest response: {response}")
                
        elif intent == "semantic_search_required":
            response = await pinecone_search_with_context(query, entities, "direct_semantic", history_context)
            print(f"Latest response: {response}")
            
        else:
            prompt_template = get_prompt_from_db("general_chat")
            prompt = f"{history_context}{prompt_template.format(input=query)}"
            response = (await llm.ainvoke(prompt)).content
        
        asyncio.create_task(update_history(session_id, query, response))
        
        elapsed = time.time() - start_time
        logger.info(f"Query: '{query[:50]}...' | Intent: {intent} | Time: {elapsed:.2f}s")

        if not response:
            return random.choice(fallbacks)
        
        return response
    
    except Exception as e:
        logger.error(f"Enhanced chat error: {str(e)}")
        return "I encountered an error processing your request. Please try again."

# -----------------------------------------------------------------------------
# Message history and utilities
# -----------------------------------------------------------------------------

def get_message_history(session_id: str) -> RedisChatMessageHistory:
    try:
        history = RedisChatMessageHistory(
            session_id=session_id, 
            url=config.redis_url,
            ttl=config.history_ttl
        )
        return history
    except Exception as e:
        logger.error(f"Failed to retrieve message history for session {session_id}: {str(e)}")
        return RedisChatMessageHistory(session_id=session_id, url=config.redis_url, ttl=config.history_ttl)

async def update_history(session_id: str, query: str, response: str):
    try:
        history = get_message_history(session_id)
        history.add_user_message(query)
        history.add_ai_message(response)
        logger.info(f"Updated history for session {session_id}")
    except Exception as e:
        logger.error(f"History update failed for session {session_id}: {str(e)}")

async def get_conversation_history(session_id: str) -> str:
    try:
        history = get_message_history(session_id)
        messages = history.messages
        if not messages:
            return "No conversation history found."
        
        formatted_history = "\n".join(
            [f"{'User' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}"
             for msg in messages]
        )
        return formatted_history
    except Exception as e:
        logger.error(f"Failed to retrieve conversation history for session {session_id}: {str(e)}")
        return "Error retrieving conversation history."

def clear_user_memory(session_id: str):
    try:
        get_message_history(session_id).clear()
        logger.info(f"Cleared history for session {session_id}")
    except Exception as e:
        logger.error(f"Failed to clear history for session {session_id}: {str(e)}")

# -----------------------------------------------------------------------------
# Prompt management utilities
# -----------------------------------------------------------------------------

def update_prompt_in_db(prompt_id: str, content: str) -> bool:
    """Update or create a prompt in MongoDB via prompt_manager"""
    try:
        update_prompt(prompt_id, content)
        
        # Clear cache
        cache_key = f"prompt:{prompt_id}"
        try:
            redis_client.delete(f"cache:{hash(cache_key)}")
        except Exception as e:
            logger.warning(f"Failed to clear cache for prompt '{prompt_id}': {e}")
        
        logger.info(f"Updated prompt '{prompt_id}' in MongoDB")
        return True
        
    except Exception as e:
        logger.error(f"Failed to update prompt '{prompt_id}' in MongoDB: {e}")
        return False

def list_prompts_from_db() -> List[str]:
    """List all prompt IDs from MongoDB via prompt_manager"""
    try:
        prompts = list_prompt_ids()
        return prompts
    except Exception as e:
        logger.error(f"Failed to list prompts from MongoDB: {e}")
        return []

# -----------------------------------------------------------------------------
# Enhanced health check
# -----------------------------------------------------------------------------

async def enhanced_health_check() -> Dict[str, str]:
    status = {}
    
    # Neo4j check
    try:
        neo4j_graph.query("RETURN 1")
        status["neo4j"] = "healthy"
    except Exception as e:
        status["neo4j"] = f"error: {str(e)}"
    
    # Pinecone check
    try:
        vectorstore.similarity_search("test", k=1)
        status["pinecone"] = "healthy"
    except Exception as e:
        status["pinecone"] = f"error: {str(e)}"
    
    # Redis check
    try:
        redis_client.ping()
        test_session = "test_session_health"
        history = get_message_history(test_session)
        history.add_user_message("test")
        history.add_ai_message("test response")
        if len(history.messages) >= 2:
            status["redis"] = "healthy"
        else:
            status["redis"] = "error: history not saved"
        history.clear()
    except Exception as e:
        status["redis"] = f"error: {str(e)}"
    
    # MongoDB check via prompt_manager
    try:
        # Test prompt retrieval
        test_prompt = get_prompt_from_db("cypher_generation")
        if test_prompt and "Error" not in test_prompt:
            status["mongodb"] = "healthy"
        else:
            status["mongodb"] = "error: cannot retrieve prompts"
    except Exception as e:
        status["mongodb"] = f"error: {str(e)}"
    
    # LLM check
    try:
        await llm.ainvoke("test")
        status["llm"] = "healthy"
    except Exception as e:
        status["llm"] = f"error: {str(e)}"
    
    # Fallback system check
    try:
        test_query = "nonexistent person skills"
        neo4j_response, has_results = await enhanced_neo4j_query(test_query, {})
        
        if not has_results:
            pinecone_response = await pinecone_search_with_context(test_query, {}, "neo4j_fallback")
            status["fallback_system"] = "healthy"
        else:
            status["fallback_system"] = "neo4j_returned_unexpected_results"
            
    except Exception as e:
        status["fallback_system"] = f"error: {str(e)}"
    
    return status

# -----------------------------------------------------------------------------
# Backward compatibility aliases
# -----------------------------------------------------------------------------

async def chat_interface(query: str, session_id: str) -> str:
    return await enhanced_chat_interface(query, session_id)

async def health_check() -> Dict[str, str]:
    return await enhanced_health_check()

# Export interface
__all__ = [
    'enhanced_chat_interface', 
    'enhanced_health_check', 
    'clear_user_memory',
    'get_conversation_history',
    'chat_interface',
    'health_check',
    'get_prompt_from_db',
    'update_prompt_in_db',
    'list_prompts_from_db'
]