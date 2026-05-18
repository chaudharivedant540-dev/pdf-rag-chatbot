from pydantic import BaseModel,EmailStr
from typing import Annotated,Optional
from datetime import datetime

class UserCreate(BaseModel):
    username : str
    email : EmailStr
    password : str
    role : Optional[str] = "user"

class UserLogin(BaseModel):
    username : str
    password : str

class UserResponse(BaseModel):
    id : int
    username : str
    email : EmailStr
    role: str 
    is_active : bool 
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token :str 
    token_type  : str
    username : str
    role : str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str]  = None


