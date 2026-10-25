from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import UserLogin, TokenResponse, UserResponse
from backend.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone,
            "description": "System Administrator & Clinician" if u.role == "ADMIN" else ("Primary Emergency Nurse" if "caregiver" in u.email else ("Backup Emergency Contact" if "backup" in u.email else "Wearable Patient"))
        }
        for u in users
    ]

@router.post("/demo-switch/{role_name}", response_model=TokenResponse)
def demo_switch_role(role_name: str, db: Session = Depends(get_db)):
    role_upper = role_name.upper()
    user = db.query(User).filter(User.role == role_upper, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No active user found with role {role_upper}")
    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }
