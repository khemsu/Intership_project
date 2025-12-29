
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv() 
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["prompts"]


def ensure_collection_exists(collection_name: str):
    existing = db.list_collection_names()
    if collection_name not in existing:
        db.create_collection(collection_name)
    return db[collection_name]


def get_collections(collection_name: str):
    return ensure_collection_exists(collection_name)

def list_prompt_ids() -> list[str]:
    return [doc["_id"] for doc in prompt_collection.find({}, {"_id": 1})]

def get_prompt_by_id(prompt_id: str) -> str:
    doc = prompt_collection.find_one({"_id": prompt_id})
    return doc["content"] if doc else ""
    
def update_prompt(prompt_id: str, content: str):
    prompt_collection.update_one(
        {"_id": prompt_id},
        {"$set": {"content": content}},
        upsert=True
    )
prompt_collection = get_collections("prompts")
