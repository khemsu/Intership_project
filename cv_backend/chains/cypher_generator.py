from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from services.prompt_manager import get_prompt_by_id  

# Fetch the cypher prompt text from your DB
prompt_text = get_prompt_by_id("cypher_prompt")

cypher_prompt = ChatPromptTemplate.from_messages([
    ("system", prompt_text),
    ("user", "{query}")
])

cypher_model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    convert_system_message_to_human=True
)

cypher_generator_chain = cypher_prompt | cypher_model | StrOutputParser()
