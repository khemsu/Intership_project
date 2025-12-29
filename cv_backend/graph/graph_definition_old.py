from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, Any, List, Tuple
import re
import threading
import time
import uuid

from chains.classifier_chain import classifier_chain
from chains.cypher_generator import cypher_generator_chain
from chains.neo4j_query_executor import run_cypher
from chains.mongo_supabase_resolver import resolve_pdf_urls

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import os
# from langchain_openai import ChatOpenAI

load_dotenv()



# === Utility ===
def clean_cypher_query(query: str) -> str:
    return re.sub(r"```(?:cypher)?\n?(.*?)```", r"\1", query, flags=re.DOTALL | re.IGNORECASE).strip()

# === Session Management ===
class SessionManager:
    def __init__(self):
        self.sessions = {}
        self.lock = threading.Lock()
        self.cleanup_thread = threading.Thread(target=self._cleanup_daemon, daemon=True)
        self.cleanup_thread.start()

    def _cleanup_daemon(self):
        while True:
            time.sleep(300)
            with self.lock:
                now = time.time()
                inactive_keys = [k for k, v in self.sessions.items() if now - v.last_active > 1800]
                for key in inactive_keys:
                    del self.sessions[key]

    def get_session(self, session_id: str) -> 'GraphState':
        with self.lock:
            if session_id not in self.sessions:
                self.sessions[session_id] = GraphState(session_id=session_id)
            return self.sessions[session_id]

    def delete_session(self, session_id: str):
        with self.lock:
            if session_id in self.sessions:
                del self.sessions[session_id]

session_manager = SessionManager()

# === State ===
class GraphState(BaseModel):
    query: str = Field(default="")
    query_type: Optional[str] = Field(default=None)
    cypher: Optional[str] = Field(default=None)
    final_results: Optional[Any] = Field(default=None)
    history: List[Tuple[str, str]] = Field(default_factory=list)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_active: float = Field(default_factory=time.time)
    summary: str = Field(default="")
    turn_count: int = Field(default=0)
    last_person_mentioned: Optional[str] = Field(default=None)

# === Prompts ===
general_chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful and polite assistant named Trinetra. Respond using plain text only. Do not use markdown or bold formatting. Avoid asterisks. You remember facts and entities shared. Ask clarifying questions if needed. Here is what you know so far:\n{summary}"),
    ("user", "{query}")
])


format_results_prompt = ChatPromptTemplate.from_messages([
    ("system", "Convert structured query results into a clear, human-readable plain-text response. Do not use markdown, asterisks, or bold formatting. Keep the tone polite and factual. Use plain sentences only. Conversation summary: {summary}"),
    ("user", "User query: '{query}'.\nQuery results: {results}")
])


summarize_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an intelligent assistant helping manage memory of a conversation. Maintain a factual, structured summary of people, facts, and goals in plain text only. Do not use markdown, asterisks, or bold formatting."),
    ("user", "Previous memory:\n{current_summary}\n\nNew exchange:\nUser: {user_input}\nAssistant: {assistant_response}\n\nUpdate the memory.")
])


# === LLM ===
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3,
    convert_system_message_to_human=True,
)


# llm = ChatOpenAI(
#     model="gpt-4",
#     temperature=0.3,
#     openai_api_key=os.getenv("OPENAI_API_KEY")
# )

# === Nodes ===
def sanitize(state: GraphState):
    state.query = state.query.strip().lower()

    # Resolve simple pronouns to last known person
    if state.last_person_mentioned:
        state.query = re.sub(r"\b(he|him|his|she|her|they|them|their)\b", state.last_person_mentioned, state.query, flags=re.IGNORECASE)

    return state

def classify(state: GraphState):
    classification = classifier_chain.invoke({"query": state.query})
    state.query_type = classification.strip().lower()
    return state

def general_chat(state: GraphState):
    prompt = general_chat_prompt.partial(summary=state.summary)
    response = prompt | llm
    llm_reply = response.invoke({"query": state.query})
    state.final_results = llm_reply.content
    state.history.append((state.query, llm_reply.content))
    state.turn_count += 1
    return update_summary(state)

def generate_cypher(state: GraphState):
    cypher = cypher_generator_chain.invoke({"query": state.query})
    state.cypher = clean_cypher_query(cypher)
    return state

def run_cypher_state(state: GraphState):
    try:
        results = run_cypher(state.cypher)
        state.final_results = results or "No matching candidates found"
    except Exception as e:
        state.final_results = f"Database query failed: {str(e)}"
    return state

def resolve_pdfs(state: GraphState):
    try:
        if isinstance(state.final_results, list):
            state.final_results = resolve_pdf_urls(state.final_results)
    except Exception as e:
        state.final_results = f"PDF resolution failed: {str(e)}"
    return state

def format_results(state: GraphState):
    if not state.final_results:
        state.final_results = "No results found"
        return state

    # Track last mentioned person if found
    if isinstance(state.final_results, list):
        for item in state.final_results:
            if isinstance(item, dict) and "name" in item:
                state.last_person_mentioned = item["name"]
                break

    if state.query_type == "resume" and isinstance(state.final_results, list):
        response = "I found these resumes:\n\n"
        for res in state.final_results:
            if isinstance(res, dict):
                response += f"- [{res['name']}]({res['pdf_url']})\n"
        state.final_results = response
    elif isinstance(state.final_results, list):
        prompt = format_results_prompt.partial(summary=state.summary)
        response = prompt | llm
        try:
            llm_reply = response.invoke({
                "query": state.query,
                "results": "\n".join(str(item) for item in state.final_results)
            })
            state.final_results = llm_reply.content
        except Exception:
            state.final_results = "Here's what I found:\n" + "\n".join(str(item) for item in state.final_results)

    state.history.append((state.query, state.final_results))
    state.turn_count += 1
    return update_summary(state)

def update_summary(state: GraphState):
    if state.turn_count % 3 != 0 and state.turn_count > 1:
        return state
    if not state.history:
        return state
    user_input, assistant_response = state.history[-1]
    chain = summarize_prompt | llm
    new_summary = chain.invoke({
        "current_summary": state.summary,
        "user_input": user_input,
        "assistant_response": assistant_response
    }).content
    state.summary = new_summary
    if len(state.history) > 6:
        state.history = state.history[-6:]
    return state

def process_query(session_id: str, query: str) -> str:
    session_state = session_manager.get_session(session_id)
    session_state.query = query
    updated_state = app_graph.invoke(session_state)
    if not isinstance(updated_state, GraphState):
        updated_state = GraphState(**updated_state)
    with session_manager.lock:
        session_manager.sessions[session_id] = updated_state
        session_manager.sessions[session_id].last_active = time.time()
    return updated_state.final_results

# === Graph ===
builder = StateGraph(state_schema=GraphState)

builder.add_node("sanitize", sanitize)
builder.add_node("classify", classify)
builder.add_node("general_chat", general_chat)
builder.add_node("generate_cypher", generate_cypher)
builder.add_node("run_cypher", run_cypher_state)
builder.add_node("resolve_pdfs", resolve_pdfs)
builder.add_node("format_results", format_results)

builder.set_entry_point("sanitize")
builder.add_edge("sanitize", "classify")
builder.add_conditional_edges("classify", lambda state: state.query_type, {
    "general": "general_chat",
    "graph": "generate_cypher",
    "resume": "generate_cypher"
})
builder.add_edge("generate_cypher", "run_cypher")
builder.add_conditional_edges("run_cypher", lambda state: state.query_type, {
    "graph": "format_results",
    "resume": "resolve_pdfs"
})
builder.add_edge("resolve_pdfs", "format_results")
builder.add_edge("format_results", END)
builder.add_edge("general_chat", END)

app_graph = builder.compile()


