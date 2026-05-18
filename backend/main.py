from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, base
from routers import user,rag
from models import User  # import so Base knows about this table
import os
from dotenv import load_dotenv
from auth import hash_password
from database import Sessionlocal

load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="PDF RAG Chatbot API",
    description="Backend API for PDF Q&A Chatbot with JWT Auth",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base.metadata.create_all(bind=engine)

@app.on_event("startup")
def create_default_admin():

    db = Sessionlocal()
    try: 
        user_count = db.query(User).count()
        if user_count == 0:
            admin = User(
                username = "admin",
                email = "vedu.chaudhari18@gmail.com",
                hashed_password = hash_password("admin123"),
                role = "admin"
            )
            db.add(admin)
            db.commit()
            print("default admin created  admin , password :admin123")
    finally:
        db.close()


app.include_router(user.router)
app.include_router(rag.router)

@app.get("/")
def root():
    return {"message": "PDF RAG Chatbot API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}