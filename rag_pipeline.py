import os 
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings 
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains import create_history_aware_retriever
from langchain_classic.chains import create_retrieval_chain
from langchain_core.prompts import MessagesPlaceholder
from langchain_core.messages import HumanMessage , AIMessage


load_dotenv()

groq_api_key  = os.getenv("GROQ_API_KEY")

def load_and_split_pdf(pdf_paths):
    all_chunks = []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size = 1000,
        chunk_overlap = 200
    )

    for pdf_path in pdf_paths:
        print(f"Loading: {pdf_path}")
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        chunks = splitter.split_documents(documents)
        all_chunks.extend(chunks)
        print(f" {len(chunks)} chunks extracted")
    
    print(f"Total chunks from all pdfs: {len(all_chunks)}")
    return all_chunks


def create_vectorstore(chunks):
    embeddings = HuggingFaceEmbeddings(model_name = "all-MiniLM-L6-v2") 

    vectorstore= FAISS.from_documents(chunks,embeddings)
    return vectorstore

def save_vectorstore(vecotrstore ,save_path = "vectorstore"):
    """save FAISS vectorestore to disk 
    creates a folder with 2 files: index.faiss and index.pkl 
    save path = folder naem where files will be saved"""


    vecotrstore.save_local(save_path)
    print(f"Vectorstore saved to {save_path} folder")

def load_vectorstore(save_path ="vectorestore"):
    """ load faiss Vectore from disk 
    returns vectorestores ready to use _no re_processig needed"""

    embeddings = HuggingFaceEmbeddings(
        model_name= "all-MiniLM-L6-v2"
    )

    vectorstore = FAISS.load_local(
        save_path,
        embeddings,
        allow_dangerous_deserialization=True 
    )
    print(f" Vectorstore loaded from {save_path} folder")
    return vectorstore

def vectorstore_exist(save_path = "vectorestore"):
    """ cheak if a saved vectorestore already exist on disk 
    returns True if found, false if not"""

    return os.path.exists(os.path.join(save_path,"index.faiss"))


def build_rag_chain(vectorstore):
    retriever = vectorstore.as_retriever(
        search_kwargs = {"k" : 3}
    )

    llm = ChatGroq(
        api_key= groq_api_key,
        model_name = "llama-3.3-70b-versatile",
        temperature= 0
    )

    contextualize_promot = ChatPromptTemplate.from_messages([
        ("system", """given the chat history and the latest user question,
         rewrite the question to be standlone and clear.
         DO Not answer the question - just rewrite it if needed.
         If it's already clear,return it as is."""),
         MessagesPlaceholder("chat_history"),
         ("human" , "{input}")
         ])
    
    history_aware_retriever = create_history_aware_retriever(
        llm, 
        retriever,
        contextualize_promot
    )

    answer_promot = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful assistant.
         Answer the question based ONLY on the context below.
         If the answer is not in the context,
         say 'I don't know based on the provided document.'

         Context:
         {context}"""),
         MessagesPlaceholder("chat_history"),
         ("human", "{input}")
    ])

    document_chain = create_stuff_documents_chain(llm, answer_promot)
    
    rag_chain = create_retrieval_chain(
        history_aware_retriever,
        document_chain
    )
    
    return rag_chain


def process_pdfs(pdf_paths, save_path="vectorstore"):
    """
    Process PDFs and save vectorstore to disk automatically
    Next time use load_and_build_chain() instead to skip processing
    """
    print("Loading and splitting all PDFs...")
    chunks = load_and_split_pdf(pdf_paths)

    print("Creating combined vector store...")
    vectorstore = create_vectorstore(chunks)

    # Save to disk right after creating
    print("Saving vectorstore to disk...")
    save_vectorstore(vectorstore, save_path)

    print("Building RAG chain...")
    rag_chain = build_rag_chain(vectorstore)
    print("RAG chain ready!")

    return rag_chain

def load_and_build_chain(save_path="vectorstore"):
    """
    Skip PDF processing entirely — load from disk and build chain
    Use this when vectorstore already exists on disk
    """
    print("Loading vectorstore from disk...")
    vectorstore = load_vectorstore(save_path)

    print("Building RAG chain...")
    rag_chain = build_rag_chain(vectorstore)
    print("RAG chain ready! (loaded from disk)")

    return rag_chain


def ask_question(rag_chain,question ,chat_history=[]):
    """
    chat_history = list of past messages in LangChain format
    We convert our simple dict history into HumanMessage/AIMessage objects
    """

    formatted_history = []
    for msg in chat_history:
        if msg["role"] == "user":
            formatted_history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            formatted_history.append(AIMessage(content=msg["content"]))

    response = rag_chain.invoke({
        "input": question,
        "chat_history" : formatted_history
    })

    answer = response["answer"]

    sources = []
    for doc in response["context"]:
        page = doc.metadata.get("page","unknown")
        source = doc.metadata.get("source","unknown")
        snippet = doc.page_content[:150]

        sources.append({
            "page": page+1,
            "source": source,
            "snippet": snippet
        })
    
    seen_sources = set()
    unique_sources = []
    for s in sources:
        source_key =(s["source"],s["page"])

        if source_key not in seen_sources:
            seen_sources.add(source_key)
            unique_sources.append(s)
    return answer,unique_sources






