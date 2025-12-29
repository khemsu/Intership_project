from pymongo import MongoClient
from supabase import create_client
import os
from fastapi import HTTPException
import re 
from dotenv import load_dotenv
load_dotenv() 

# MongoDB Setup
mongo = MongoClient(os.getenv("MONGO_URI"))
collection = mongo.resume.resume

# Supabase Setup
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def resolve_pdf_links(results):
    responses = []
    for item in results:
        # Handle if item is a dict or a string
        if isinstance(item, dict):
            name = item.get("name")
        else:
            # If item is just a string (name)
            name = item
        
        if not name:
            continue  # skip if no name found
        
        doc = collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        if doc:
            filename = doc.get("pdf_filename")
            if filename:
                file_url = supabase.storage.from_("resume").get_public_url(filename)
                responses.append({"name": name, "pdf_url": file_url})
    return responses


def get_signed_url(filename: str):
    try:
        response = supabase.storage.from_("resume").create_signed_url(filename, 3600)
        signed_url = response.get("signedURL") or response.get("signed_url")  # depending on SDK version
        if not signed_url:
            raise HTTPException(status_code=404, detail="Could not generate signed URL")
        return signed_url
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# def resolve_pdf_urls(results):
#     if not results:
#         return "No matching resumes found"
    
#     responses = []
#     for item in results:
#         # Extract name from different result formats
#         if hasattr(item, 'data'):  # Neo4j record format
#             name = item.data().get('name')
#         elif isinstance(item, dict):  # Dictionary format
#             name = item.get('name')
#         else:  # String format
#             name = str(item)
        
#         if not name:
#             continue
            
#         # Use aggregation for better partial matching
#         pipeline = [
#             {"$addFields": {
#                 "lowerName": {"$toLower": "$name"}
#             }},
#             {"$match": {
#                 "lowerName": {"$regex": f".*{name.lower()}.*"}
#             }}
#         ]
        
#         doc = next(collection.aggregate(pipeline), None)
        
#         if doc:
#             filename = doc.get("pdf_filename") or doc.get("file_name")
#             if filename:
#                 try:
#                     signed_url = get_signed_url(filename)
#                     responses.append({"name": doc["name"], "pdf_url": signed_url})
#                 except Exception as e:
#                     responses.append({
#                         "name": name, 
#                         "error": f"Failed to generate URL: {str(e)}"
#                     })
    
#     return responses or "No downloadable resumes found"