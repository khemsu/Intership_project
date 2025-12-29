# services/process_file.py
import os
import base64
import pdfplumber
from PIL import Image
import mimetypes
from mistralai.client import MistralClient
from dotenv import load_dotenv
from docx import Document

load_dotenv()



MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
client = MistralClient(api_key=MISTRAL_API_KEY)

def get_mime_type(file_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type

def process_pdf(file_path: str) -> str:
    with pdfplumber.open(file_path) as pdf:
        return "\n".join([page.extract_text() or "" for page in pdf.pages]).strip()

def process_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()
    
def process_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs]).strip()

def convert_image_to_pdf(image_path: str) -> str:
    image = Image.open(image_path).convert("RGB")
    temp_pdf_path = image_path.rsplit(".", 1)[0] + ".pdf"
    image.save(temp_pdf_path, "PDF")
    return temp_pdf_path

def process_image_with_ocr(file_path: str) -> str:
    pdf_path = convert_image_to_pdf(file_path)
    with open(pdf_path, "rb") as f:
        base64_pdf = base64.b64encode(f.read()).decode("utf-8")
    data_url = f"data:application/pdf;base64,{base64_pdf}"
    ocr_response = client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": data_url,
        },
        include_image_base64=False
    )
    return ocr_response.pages[0].markdown.strip()

def extract_text(file_path: str) -> str:
    mime_type = get_mime_type(file_path)
    if mime_type == "application/pdf":
        return process_pdf(file_path)
    elif mime_type == "text/plain":
        return process_txt(file_path)
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return process_docx(file_path)
    elif mime_type in ["image/jpeg", "image/png"]:
        return process_image_with_ocr(file_path)
    else:
        
        raise ValueError(f"Unsupported file type: {mime_type}")
