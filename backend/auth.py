
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import User


# ==========================================
# AUTHENTICATION ROUTER
# ==========================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

password_hash = PasswordHash.recommended()
security = HTTPBearer()

SECRET_KEY = os.environ.get("SOURCEVIEW_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SOURCEVIEW_SECRET_KEY environment variable is missing"
    )

ALGORITHM = "HS256"


# ==========================================
# REQUEST MODELS
# ==========================================

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    username: str
    password: str


# ==========================================
# DATABASE SESSION
# ==========================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ==========================================
# REGISTER USER
# ==========================================

@router.post("/register", status_code=201)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    username = data.username.strip()

    # Normalize email address before comparison.
    email = str(data.email).strip().lower()

    # Validate username.
    if len(username) < 3:
        raise HTTPException(
            status_code=422,
            detail="Username must contain at least 3 characters"
        )

    # Check if username already exists.
    existing_username = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already exists"
        )

    # Check if email already exists.
    # func.lower ensures the comparison
    # also matches older mixed-case emails.
    existing_email = (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail=(
                "This email is already registered. "
                "Please log in or use another email."
            )
        )

    # Create new user.
    user = User(
        username=username,
        email=email,
        hashed_password=password_hash.hash(
            data.password
        )
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    return {
        "message": "Registration successful"
    }


# ==========================================
# LOGIN USER
# ==========================================

@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == data.username
    ).first()

    if not user or not password_hash.verify(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # Access token valid for 8 hours.
    expires = datetime.now(
        timezone.utc
    ) + timedelta(hours=8)

    token = jwt.encode(
        {
            "sub": str(user.id),
            "exp": expires
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username
    }


# ==========================================
# GET CURRENT LOGGED-IN USER
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload["sub"])

    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login"
        )

    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# ==========================================
# GET USER PROFILE
# ==========================================

@router.get("/me")
def get_profile(
    user: User = Depends(get_current_user)
):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }
