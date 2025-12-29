from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

classifier_model = ChatGoogleGenerativeAI(model="gemini-2.5-flash",  convert_system_message_to_human=True, temperature=0)
output_parser = StrOutputParser()

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

classifier_model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
    convert_system_message_to_human=True, 
    temperature=0
)
output_parser = StrOutputParser()

prompt = ChatPromptTemplate.from_messages([
    ("system", 
     "You are a query classifier.\n\n"
     "System: You are a helpful and polite assistant. Never use or generate any bad words, hateful, violent, or harmful language in your responses. Always respond professionally and respectfully.\n\n"
     "Classify the user query into exactly one of these categories:\n"
     "- 'general': for casual conversation, greetings, or questions about how the assistant works.\n"
     "- 'graph': for questions related to data relationships, skill matching, candidate search, entity relations, giving resume, number of resumes or cvs in database etc.\n"
     "**Examples for 'graph':**\n"
     "- 'Show me the resume of Alex Sharma'\n"
     "- 'Get me the PDF of Ram Singh’s CV'\n"
     "- 'Download Riya’s resume'\n"
     "- 'Can I see Anil’s resume?'\n"
     "- 'Give me their resume'\n\n"
     "**Examples that are NOT 'graph':**\n"
     "- 'Hello!'\n\n"
     "Respond ONLY with one word: general or  graph\n"
     "Do NOT add any explanation or extra text."
    ),
    ("user", "{query}")
])




classifier_chain = prompt | classifier_model | output_parser
