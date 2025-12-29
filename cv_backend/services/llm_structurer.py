# import os
# import json
# from dotenv import load_dotenv
# import httpx 
# import traceback

# load_dotenv()
# GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
# timeout = httpx.Timeout(90.0, connect=10.0, read=90.0, write=90.0)

# async def convert_to_structured_json(markdown_text: str) -> dict:
#     prompt = f"""
#       Convert this resume markdown into structured JSON format:
#       {markdown_text}
#       Use this exact JSON schema:
#       {{
#         "name": "string",
#         "contact": {{
#           "email": "string",
#           "phone": "string",
#           "github": "string | null",
#           "linkedin": "string | null"
#         }},
#         "education": [{{
#           "institution": "string",
#           "location": "string",
#           "degree": "string",
#           "dates": "string",
#           "courses": "string"
#         }}],
#         "work_experience": [{{
#           "organization": "string",
#           "location": "string",
#           "position": "string",
#           "dates": "string",
#           "achievements": ["string"]
#         }}],
#         "projects": [{{
#           "name": "string",
#           "description": "string",
#           "link": "string | null"
#         }}],
#         "activities": [{{
#           "title": "string",
#           "role": "string",
#           "dates": "string | null"
#         }}],
#         "skills": ["string"],
#         "certifications": ["string"],
#         "references": [
#           {{
#             "name": "string",
#             "title": "string",
#             "company": "string",
#             "email": "string | null",
#             "phone": "string | null"
#           }}
#         ]
#       }}
#       Follow these rules:
#       1. Extract dates in "Month YYYY" or "YYYY - YYYY" format
#       2. For projects, extract links from bracketed text like [Link]
#       3. For education/work, split location to separate field
#       4. Use null for missing values
#       5. Convert all bullet points to array elements
#       6. Keep descriptions concise but preserve key details
#       7. Extract only the main skills section, ignore mentions in other sections
#       8. If no references are found, return an empty list for `references`.
      
#       Return only valid JSON, no additional text or formatting.
#       """

#     # Gemini API endpoint
#     url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
#     headers = {
#         "Content-Type": "application/json"
#     }
    
#     payload = {
#         "contents": [{
#             "parts": [{
#                 "text": prompt
#             }]
#         }],
#         "generationConfig": {
#             "response_mime_type": "application/json",
#             "temperature": 0.1,
#             "maxOutputTokens": 4096
#         }
#     }

#     async with httpx.AsyncClient(timeout=timeout) as client:
#         try:
#             response = await client.post(url, headers=headers, json=payload)
#             response.raise_for_status()
#         except httpx.HTTPStatusError as e:
#             print(f"[GEMINI HTTP ERROR] Status code: {e.response.status_code}")
#             print(f"Response content: {e.response.text}")
#             raise Exception("Gemini HTTP request failed")
#         except Exception as e:
#             print(f"[GEMINI GENERAL ERROR] Exception during HTTP request: {e}")
#             traceback.print_exc()
#             raise Exception("Gemini request error")

#         try:
#             result = response.json()
#         except Exception as e:
#             print(f"[GEMINI JSON ERROR] Failed to parse JSON: {e}")
#             print(f"Raw response content: {response.text}")
#             traceback.print_exc()
#             raise Exception("Gemini JSON parsing failed")

#         try:
#             # Extract content from Gemini's response structure
#             content = result["candidates"][0]["content"]["parts"][0]["text"]
#             return json.loads(content)
#         except (KeyError, IndexError) as e:
#             print(f"[GEMINI STRUCTURE ERROR] Unexpected response structure: {e}")
#             print(f"Raw response: {response.text}")
#             traceback.print_exc()
#             raise Exception("Gemini response structure error")
#         except json.JSONDecodeError as e:
#             print(f"[JSON PARSE ERROR] {e}")
#             print(f"Content to parse: {content}")
#             traceback.print_exc()
#             raise Exception("Gemini structuring failed unexpectedly")





import os
import json
import time
import asyncio
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import httpx 
import traceback

load_dotenv()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")  # Add this to your .env file
timeout = httpx.Timeout(90.0, connect=10.0, read=90.0, write=90.0)

class MistralRateLimiter:
    def __init__(self, max_requests=100, time_window=60):  # Mistral has more generous limits
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
    
    def wait_if_needed(self):
        now = datetime.now()
        # Remove requests older than time_window
        self.requests = [req_time for req_time in self.requests 
                        if now - req_time < timedelta(seconds=self.time_window)]
        
        if len(self.requests) >= self.max_requests:
            sleep_time = self.time_window - (now - self.requests[0]).total_seconds() + 1
            if sleep_time > 0:
                print(f"Rate limit approaching. Waiting {sleep_time:.1f} seconds...")
                time.sleep(sleep_time)
                self.requests = []
        
        self.requests.append(now)

# Global rate limiter instance
rate_limiter = MistralRateLimiter()

async def convert_to_structured_json(markdown_text: str, max_retries: int = 3) -> dict:
    system_prompt = """You are a resume parser that converts markdown resumes into structured JSON format. 
    Follow the provided schema exactly and return only valid JSON with no additional text or formatting."""
    
    user_prompt = f"""
    Convert this resume markdown into structured JSON format:
    {markdown_text}
    
    Use this exact JSON schema:
    {{
      "name": "string",
      "contact": {{
        "email": "string",
        "phone": "string",
        "github": "string | null",
        "linkedin": "string | null"
      }},
      "education": [{{
        "institution": "string",
        "location": "string",
        "degree": "string",
        "dates": "string",
        "courses": "string"
      }}],
      "work_experience": [{{
        "organization": "string",
        "location": "string",
        "position": "string",
        "dates": "string",
        "achievements": ["string"]
      }}],
      "projects": [{{
        "name": "string",
        "description": "string",
        "link": "string | null"
      }}],
      "activities": [{{
        "title": "string",
        "role": "string",
        "dates": "string | null"
      }}],
      "skills": ["string"],
      "certifications": ["string"],
      "references": [
        {{
          "name": "string",
          "title": "string",
          "company": "string",
          "email": "string | null",
          "phone": "string | null"
        }}
      ]
    }}
    
    Follow these rules:
    1. Extract dates in "Month YYYY" or "YYYY - YYYY" format
    2. For projects, extract links from bracketed text like [Link]
    3. For education/work, split location to separate field
    4. Use null for missing values
    5. Convert all bullet points to array elements
    6. Keep descriptions concise but preserve key details
    7. Extract only the main skills section, ignore mentions in other sections
    8. If no references are found, return an empty list for `references`.
    
    Return only valid JSON, no additional text or formatting.
    """

    # Mistral API endpoint
    url = "https://api.mistral.ai/v1/chat/completions"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MISTRAL_API_KEY}"
    }
    
    payload = {
        "model": "mistral-small-latest",  # Smaller model with higher rate limits
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"}  # Forces JSON output
    }

    for attempt in range(max_retries):
        try:
            # Apply rate limiting before each request
            rate_limiter.wait_if_needed()
            
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                # If we reach here, the request was successful
                break
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                if attempt < max_retries - 1:
                    # Exponential backoff for rate limiting
                    wait_time = min((2 ** attempt) + random.uniform(1, 5), 60)
                    print(f"Rate limited (429). Attempt {attempt + 1}/{max_retries}. Waiting {wait_time:.1f} seconds...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    print(f"[MISTRAL HTTP ERROR] Max retries exceeded. Status code: {e.response.status_code}")
                    print(f"Response content: {e.response.text}")
                    raise Exception("Mistral HTTP request failed after all retries")
            elif e.response.status_code == 401:
                print(f"[MISTRAL AUTH ERROR] Invalid API key. Please check your MISTRAL_API_KEY in .env file")
                raise Exception("Mistral authentication failed")
            else:
                print(f"[MISTRAL HTTP ERROR] Status code: {e.response.status_code}")
                print(f"Response content: {e.response.text}")
                raise Exception("Mistral HTTP request failed")
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                print(f"[MISTRAL GENERAL ERROR] Attempt {attempt + 1}/{max_retries}. Retrying in {wait_time:.1f}s. Error: {e}")
                await asyncio.sleep(wait_time)
                continue
            else:
                print(f"[MISTRAL GENERAL ERROR] Exception during HTTP request: {e}")
                traceback.print_exc()
                raise Exception("Mistral request error after all retries")

    try:
        result = response.json()
    except Exception as e:
        print(f"[MISTRAL JSON ERROR] Failed to parse JSON: {e}")
        print(f"Raw response content: {response.text}")
        traceback.print_exc()
        raise Exception("Mistral JSON parsing failed")

    try:
        # Extract content from Mistral's response structure
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)
    except (KeyError, IndexError) as e:
        print(f"[MISTRAL STRUCTURE ERROR] Unexpected response structure: {e}")
        print(f"Raw response: {response.text}")
        traceback.print_exc()
        raise Exception("Mistral response structure error")
    except json.JSONDecodeError as e:
        print(f"[JSON PARSE ERROR] {e}")
        print(f"Content to parse: {content}")
        traceback.print_exc()
        raise Exception("Mistral structuring failed unexpectedly")