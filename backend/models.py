from sqlalchemy import Column,Integer,String,Boolean,DateTime
from sqlalchemy.sql import func
from database import base

class  User(base):

    __tablename__ = "users"

    id = Column(Integer,primary_key=True ,index= True )

    username = Column(String,unique=True ,index=True ,nullable= False)
    email = Column(String, unique=True, index=True , nullable=False)

    hashed_password = Column(String , nullable= False)
    role = Column(String , default="user")

    is_active = Column(Boolean , default= True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())