from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv() 

#, "mongodb://localhost:27017"
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["resume"]
collection = db["resume"]

async def save_to_mongo(resume_data: dict, filename: str):
    resume_data["file_name"] = filename
    collection.insert_one(resume_data)

def get_pdf_filename_from_mongo(name: str) -> str | None:
    doc = collection.find_one({"name": name}, {"pdf_filename": 1})
    if doc:
        return doc.get("pdf_filename")
    return None

def delete_person_from_mongo(name: str):
    collection.delete_many({"name": name})

def get_collection():
    return collection
