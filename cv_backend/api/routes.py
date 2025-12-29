from fastapi import APIRouter, UploadFile, File, HTTPException, Query , Request
from pydantic import BaseModel
import os
from supabase import create_client
import uuid
from services.process_file import extract_text
from services.llm_structurer import convert_to_structured_json
from services.mongo_saver import save_to_mongo, delete_person_from_mongo, get_pdf_filename_from_mongo
from services.graphdb_saver import (
    save_to_neo4j,
    person_exists_in_neo4j,
    delete_person_from_neo4j
)
from services.supabase_uploader import (
    upload_pdf_to_supabase_async,
    delete_file_from_supabase
)
from services.mongo_saver import get_collection
from services.embeddings import get_embeddings
from services.graphdb_saver import get_driver
from services.prompt_manager import get_prompt_by_id, update_prompt , list_prompt_ids , get_collections
from typing import List
from fastapi import Depends
from utils.jwt import get_current_user , decode_token
from services.getuser import get_user_collections
from utils.thread_runner import run_in_thread
import asyncio
import jwt 
from fastapi.responses import JSONResponse

collection = get_collection()
usr_collection = get_user_collections()
driver = get_driver()

router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


from fastapi import APIRouter, HTTPException, Depends , Response
from pydantic import BaseModel, EmailStr
from utils.passwords import hash_password, verify_password
from utils.jwt import create_access_token, get_current_user
from services.mongo_user import get_user_by_email, create_user
from services.pinecone_saver import save_to_pinecone, delete_person_from_pinecone, get_pinecone_index

import uuid

router = APIRouter()

class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    role: str  # "admin" or "user"

@router.post("/register")
def register(input: RegisterInput):
    if get_user_by_email(input.email):
        raise HTTPException(status_code=400, detail="User already exists")
    create_user(input.email, hash_password(input.password), input.role)
    return {"message": "User registered successfully"}

class LoginInput(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(input: LoginInput , response: Response):
    user = get_user_by_email(input.email)
    if not user or not verify_password(input.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create access token
    session_id = f"sess_{os.urandom(8).hex()}"
    token = create_access_token({"sub": user["email"], "role": user["role"] , "jti":session_id })

    response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=True,         
    samesite="None",    
    max_age=12 * 60 * 60
    )

    return {
            "email": user["email"],
            "role" : user["role"]
    }

@router.post("/logout")
def logout(request: Request , response:Response):
    response.delete_cookie(
        key = "access_token", 
        httponly = True, 
        secure = True, 
        samesite= "Lax"
    )
    return {"message": "Logged out successfully"}

@router.post("/upload/single")
async def upload_single(file: UploadFile = File(...),
                        force_update: bool = Query(False, description="Force update if person already exists")):
    try:
        ext = file.filename.split(".")[-1]
        temp_id = uuid.uuid4().hex
        temp_path = f"/tmp/{temp_id}.{ext}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        try:
            extracted_text = await run_in_thread(extract_text , temp_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")
        try:
            structured_json = await convert_to_structured_json(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM structuring failed: {str(e)}")

        person_name = structured_json.get("name")

        if person_exists_in_neo4j(person_name):
            if not force_update:
                # Return with status 409 (Conflict) to make it clearer this is a duplicate
                return JSONResponse(
                    status_code=200,  # Keep 200 for frontend compatibility
                    content={
                        "message": f"Person '{person_name}' already exists. Use force_update=true to overwrite.",
                        "status": "duplicate",
                        "person_name": person_name
                    }
                )
            else:
                await run_in_thread(delete_person_from_neo4j, person_name)
                await run_in_thread(delete_person_from_mongo, person_name)

                old_pdf_filename = get_pdf_filename_from_mongo(person_name)
                if old_pdf_filename:
                    try:
                        delete_file_from_supabase(old_pdf_filename)
                    except Exception as e:
                        print(f"Warning: Failed to delete old file from Supabase: {e}")

                    filename_only = old_pdf_filename
                else:
                    filename_only = f"{temp_id}.{ext}"
        else:
            filename_only = f"{temp_id}.{ext}"

        supabase_filename = await upload_pdf_to_supabase_async(temp_path, filename_only)

        embedding = await get_embeddings(extracted_text)
        await save_to_pinecone(embedding , extracted_text , person_name)
        await save_to_mongo(structured_json, filename_only)
        await save_to_neo4j(structured_json)

        return {
            "message": "Resume processed successfully", 
            "filename": supabase_filename,
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/upload/bulk")
async def upload_bulk(files: List[UploadFile] = File(...),
                      force_update: bool = Query(False)):
    async def process_file(file: UploadFile):
        temp_path = None
        try:
            ext = file.filename.split(".")[-1]
            temp_id = uuid.uuid4().hex
            temp_path = f"/tmp/{temp_id}.{ext}"
            with open(temp_path, "wb") as f:
                f.write(await file.read())

            # Run text extraction & LLM structuring in background thread
            extracted_text = await run_in_thread(extract_text, temp_path)
            structured_json = await convert_to_structured_json(extracted_text)
            person_name = structured_json.get("name")

            if person_exists_in_neo4j(person_name):
                if not force_update:
                    return {"filename": file.filename, "status": "duplicate", "name": person_name}
                else:
                    await run_in_thread(delete_person_from_neo4j, person_name)
                    await run_in_thread(delete_person_from_mongo, person_name)

                    old_pdf_filename = get_pdf_filename_from_mongo(person_name)
                    if old_pdf_filename:
                        try:
                            delete_file_from_supabase(old_pdf_filename)
                        except Exception as e:
                            print(f"Warning: Failed to delete old file from Supabase: {e}")
                        filename_only = old_pdf_filename
                    else:
                        filename_only = f"{temp_id}.{ext}"
            else:
                filename_only = f"{temp_id}.{ext}"

            
            # Upload and save
            embedding = await get_embeddings(extracted_text)
            supabase_filename = await upload_pdf_to_supabase_async(temp_path, filename_only)
            await save_to_mongo(structured_json, filename_only)
            await save_to_neo4j(structured_json)
            await save_to_pinecone(embedding, extracted_text , person_name)

            return {"filename": file.filename, "status": "success"}
        except Exception as e:
            return {"filename": file.filename, "status": "failed", "error": str(e)}
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    tasks = [process_file(file) for file in files]
    results = await asyncio.gather(*tasks)
    return results

@router.delete("/delete/all")
async def delete_all_resumes():
    try:
        # 1. Collect all filenames BEFORE deleting Mongo documents
        all_pdf_filenames = list(collection.distinct("pdf_filename"))
        
        # 2. Delete all Mongo documents
        collection.delete_many({})

        # 3. Delete all Neo4j nodes and relationships
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")


        index = get_pinecone_index()
        index.delete(delete_all=True, namespace="__default__")

        # 4. Delete all files from Supabase bucket
        delete_errors = []
        for filename in all_pdf_filenames:
            try:
                delete_file_from_supabase(filename)
            except Exception as e:
                delete_errors.append(f"Failed to delete {filename} from Supabase: {e}")

        if delete_errors:
            return {
                "message": "Deleted Mongo and Neo4j data but some files failed to delete from Supabase.",
                "errors": delete_errors,
            }
        
        return {"message": "All resumes and files deleted from MongoDB, Neo4j, and Supabase."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatInput(BaseModel):
    query: str
    
from graph.graph_definition import chat_interface
import jwt 

@router.post("/chat")
async def query_llm(request: Request, input: ChatInput):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing session ID")
    
    try:
        payload = decode_token(token)
        session_id = payload.get("jti")
        if not session_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        response_text = await chat_interface(input.query, session_id)
        return {"final_results": response_text}
    
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/cvs")
async def get_all_cvs():
    results = []
    for doc in collection.find({}, {"_id": 0}):
        results.append(doc)
    return results


class DeleteRequest(BaseModel):
    ids: List[str]  # these are pdf_filenames

@router.delete("/cvs/delete")
async def delete_selected_resumes(request: DeleteRequest):
    try:
        deleted_count = 0
        for pdf_filename in request.ids:
            person_doc = collection.find_one({"file_name": pdf_filename})
            if not person_doc:
                continue

            name = person_doc.get("name")
            if name:
                delete_person_from_neo4j(name)
                delete_person_from_mongo(name)
                await delete_person_from_pinecone(name)

            try:
                delete_file_from_supabase(pdf_filename)
            except Exception as e:
                print(f"Could not delete file {pdf_filename} from Supabase: {e}")

            deleted_count += 1

        return {"message": f"{deleted_count} CV(s) deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-signed-url/{filename}")
def get_signed_url(filename: str):
    try:
        response = supabase.storage.from_("resume").create_signed_url(filename, 3600)
        signed_url = response.get("signedURL") or response.get("signed_url")  # depending on SDK version
        if not signed_url:
            raise HTTPException(status_code=404, detail="Could not generate signed URL")
        return {"url": signed_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

class PromptUpdateRequest(BaseModel):
    prompt_id: str
    content: str

@router.get("/prompt/{prompt_id}")
async def fetch_prompt(prompt_id: str):
    return {"prompt_id": prompt_id, "content": get_prompt_by_id(prompt_id)}

@router.post("/prompt/update")
async def update_prompt_api(request: PromptUpdateRequest):
    update_prompt(request.prompt_id, request.content)
    return {"message": "Prompt updated successfully."}

@router.get("/prompts")
async def list_prompts():
    prompt_collection = get_collections("prompts")
    prompt_ids = prompt_collection.distinct("_id")
    return prompt_ids


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # 'admin' or 'user'

@router.post("/admin/create-user")
def create_user_admin_only(req: CreateUserRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")

    if get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_pw = hash_password(req.password)
    create_user(req.email, hashed_pw, req.role)
    return {"message": f"{req.role.title()} created successfully"}

@router.get("/admin/users")
def list_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    # Return all users except password field
    users = list(usr_collection.find({}, {"_id": 0, "password": 0}))
    return users


class DeleteUserRequest(BaseModel):
    email: EmailStr

@router.delete("/admin/delete-user")
def delete_user_admin_only(req: DeleteUserRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Implement your user deletion logic here
    # Example: delete user document from MongoDB
    result = usr_collection.delete_one({"email": req.email})

    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete user")

    return {"message": f"User {req.email} deleted successfully"}

@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "role": current_user["role"],
    }
