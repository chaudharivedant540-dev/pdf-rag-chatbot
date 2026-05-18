from datetime import datetime,timedelta, timezone
from typing  import Optional
from jose import JWTError,jwt
from passlib.context import CryptContext
from fastapi import Depends,HTTPException,status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
    truncate_error=False)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl = "/auth/login")

def hash_password(plain_password : str):

    truncated = plain_password[:72]
    return pwd_context.hash(truncated)


def verify_password(plain_password :str ,hashed_passwords:str) -> bool:
    return pwd_context.verify(plain_password,hashed_passwords)

def create_access_token(data: dict, expires_delta: Optional[timedelta]=None):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire })
    
    encode_jwt = jwt.encode(to_encode,SECRET_KEY,algorithm= ALGORITHM)
    return  encode_jwt

def verify_token(token: str):

    credentials_exception = HTTPException(
        status_code= status.HTTP_401_UNAUTHORIZED,
        detail="could not validate credentials",
        headers={"WWW-Authenticate":"Bearer"},
    )

    try:
        payload = jwt.decode(token,SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role : str = payload.get("role")

        if username is None:
            raise credentials_exception
        
        return {"username" : username , "role": role}
    
    except JWTError:
        raise credentials_exception
    

def get_current_user(token:str = Depends(oauth2_scheme)):
    return verify_token(token)

def get_admin_user(current_user: dict = Depends(get_current_user)):

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code= status.HTTP_403_FORBIDDEN,
            detail= "admin Access required"
        )
    return current_user
