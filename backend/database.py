from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os 

load_dotenv()
database_url = os.getenv("database_url")


engine = create_engine(
    database_url,
    pool_pre_ping = True
)

Sessionlocal = sessionmaker(
    autoflush=False,autocommit = False,bind = engine
)

base = declarative_base()
def get_db():
    db = Sessionlocal()
    try:
        yield db
    finally:
        db.close()