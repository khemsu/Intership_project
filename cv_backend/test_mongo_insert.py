from pymongo import MongoClient
import os

# Get MongoDB URI from environment or use default
uri = os.getenv("MONGO_URI", "mongodb+srv://sandiplimbu319:testpasswordforproject@conversationmemory.fo7qu1x.mongodb.net/?appName=conversationmemory")

# Connect to MongoDB
client = MongoClient(uri)
db = client["test_db"]  # You can change the database name
collection = db["test_collection"]  # You can change the collection name

# Insert a document
doc = {"name": "Alice", "email": "alice@example.com", "role": "admin"}
result = collection.insert_one(doc)
print(f"Inserted document ID: {result.inserted_id}")

# Find the document
found = collection.find_one({"email": "alice@example.com"})
print("Found document:", found)
