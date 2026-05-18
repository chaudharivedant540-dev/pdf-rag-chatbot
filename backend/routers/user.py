from fastapi import APIRouter,Depends, HTTPException, status,UploadFile,File
from sqlalchemy.orm import Session
from datetime import timedelta
import os 
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import User
from schemas import UserCreate,UserLogin,UserResponse,Token
from auth import(
    hash_password,
    verify_password,
    create_access_token,
    get_admin_user,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model= UserResponse)
def register(user_data: UserCreate, db : Session = Depends(get_db)):

    existing = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if existing:
        raise HTTPException(
            status_code= 400,
            detail="Username already registered"
        )
    
    existing_email = db.query(User).filter(
        User.email == user_data.email
    ).first()
    if existing_email:
        raise HTTPException(
            status_code= 400,
            detail= "email already registered"
        )
    
    new_user = User(
        username = user_data.username,
        email = user_data.email,
        hashed_password = hash_password(user_data.password),
        role = user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login", response_model= Token)
def login(user_data :UserLogin , db :Session= Depends(get_db)):

    user=  db.query(User).filter(
        User.username == user_data.username
    ).first()

    if not user or not verify_password(user_data.password,user.hashed_password):
        raise HTTPException(
            status_code= status.HTTP_401_UNAUTHORIZED,
            detail= "Incorrect username or password"

        )
    
    if not user.is_active:
        raise HTTPException(
            status_code = 400,
            detail= "Account is deacitvated"
        )
    
    access_token  = create_access_token(
        data = {
            "sub" : user.username,
            "role" : user.role
        },
        expires_delta= timedelta(minutes= ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token" : access_token,
        "token_type" : "bearer", 
        "username" : user.username,
        "role" :user.role
    }

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user : dict = Depends(get_current_user), 
    db : Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == current_user["username"]
    ).first()
    
    if not user:
        raise HTTPException(status_code = 404, detail= "user not found")
    return user

#admin only routes  

@router.get("/users" , response_model= list[UserResponse])
def get_all_users(
    current_user : dict = Depends(get_admin_user),
    db :Session = Depends(get_db)
):
    return db.query(User).all()

@router.delete("/users/{username}")
def delete_user(
    username :str,
    current_user : dict= Depends(get_admin_user),
    db :Session = Depends(get_db)
):
    if username == current_user["username"]:
        raise HTTPException(
            status_code= 400 , 
            detail= "cannot delete your own account"
        )
    
    user = db.query(User).filter(User.username== username).first()
    if not user:
        raise HTTPException(status_code= 404 , detail= "User not found")
    
    db.delete(user)
    db.commit()
    return {"message":f"User '{username}' deleted successfully"}

@router.patch("/users/{username}/deactivate")
def deactivate_user(
    username: str,
    current_user: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404 , detail= "user not found")
    
    user.is_active = False
    db.commit()
    return {"message" : f"User '{username}' deactivated"}

@router.delete("/me/delete")
def delete_acc(current_user : dict =Depends(get_current_user),
               db : Session = Depends(get_db)):
    
    username = current_user["username"]
    user = db.query(User).filter(User.username ==username).first()

    if not user:
        raise HTTPException(
            status_code = 404,
            detail= "User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {
        "message" : f"account {username} deleted successfully"
    }

