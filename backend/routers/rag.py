
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from auth import get_current_user
import tempfile
import os
import sys
RAG_CHAIN = None


sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from rag_pipeline import process_pdfs, ask_question, load_and_build_chain, vectorstore_exist

router = APIRouter(prefix="/rag", tags=["RAG Pipeline"])

@router.post("/process")
async def process_uploaded_pdfs(
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        temp_paths = []

        for file in files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
                content = await file.read()
                temp.write(content)
                temp_paths.append(temp.name)

        global RAG_CHAIN
        RAG_CHAIN = process_pdfs(temp_paths)

        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)

        return {"message": "PDFs processed successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask")
async def ask_pdf_question(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    global RAG_CHAIN

    try:
        if RAG_CHAIN is None:
            raise HTTPException(
                status_code=400,
                detail="No PDFs processed yet. Please process PDFs first."
            )

        question = payload.get("question")
        chat_history = payload.get("chat_history", [])

        if not question:
            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )

        answer, sources = ask_question(
            RAG_CHAIN,
            question,
            chat_history
        )

        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/load")
async def load_saved_vectorstore(
    current_user: dict = Depends(get_current_user)
):
    try:
        global RAG_CHAIN
        RAG_CHAIN = load_and_build_chain()
        return {"message": "Vectorstore loaded"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exists")
async def check_exists(current_user: dict = Depends(get_current_user)):
    return {"exists": vectorstore_exist()}