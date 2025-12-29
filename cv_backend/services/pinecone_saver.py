import pinecone 
from uuid import uuid4
import os 
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

if INDEX_NAME not in pc.list_indexes().names():
    pc.create_index(
        name="cv-index", 
        dimension=768, 
        metric="cosine", 
        spec = ServerlessSpec(
            cloud = 'aws', 
            region = 'us-west-1'
        )

    )
def get_pinecone_index():
    return pc.Index(INDEX_NAME)

async def save_to_pinecone(embeddings: list , extracted_text: str , person_name:str) : 
    index = get_pinecone_index()
    index.upsert([
        (str(uuid4()), embeddings, {
            "name" : person_name,
            "text": extracted_text
        })
    ])

async def delete_person_from_pinecone(name:str): 
    index = get_pinecone_index()
    print(index)
    print(name)
    index.delete(filter={"name": name}) 

