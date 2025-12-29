# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router  # Your real router here

app = FastAPI()

origins = [
    "https://cv-frontend-1092536125686.asia-south1.run.app",
    "https://recruitment.shivautomation.com",
    "https://cvanalyser.amoebalabs.co",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router, prefix="/api")
