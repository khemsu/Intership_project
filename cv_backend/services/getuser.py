from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv() 
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["users"]


def get_user_collections():
    return db["users"]

