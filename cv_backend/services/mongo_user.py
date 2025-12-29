from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv() 
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["users"]
user_collection = db["users"]


def get_user_by_email(email: str):
    return user_collection.find_one({"email": email})

def create_user(email: str, hashed_password: str, role: str):
    user_collection.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role
    })
