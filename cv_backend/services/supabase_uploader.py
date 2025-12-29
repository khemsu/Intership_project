import os
from supabase import create_client, Client
import asyncio

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = "resume"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def upload_pdf_to_supabase_async(file_path: str, file_name: str) -> str:
    def blocking_upload():
        with open(file_path, 'rb') as f:
            supabase.storage.from_(SUPABASE_BUCKET).upload(file_name, f, {
                "content-type": "application/pdf"
            })
        return file_name

    filename_only = await asyncio.to_thread(blocking_upload)
    return filename_only

def delete_file_from_supabase(filename: str):
    try:
        print(f"[Supabase] Deleting {filename} from bucket '{SUPABASE_BUCKET}'")

        result = supabase.storage.from_(SUPABASE_BUCKET).remove([filename])

        if not isinstance(result, list) or "error" in result:
            raise Exception(f"Unexpected response: {result}")

        print(f"[Supabase] Deleted {filename} successfully")

    except Exception as e:
        print(f"[ERROR] Failed to delete {filename} from Supabase: {e}")
        raise
