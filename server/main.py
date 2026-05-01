from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from server.database import create_db_and_tables, get_session
from server.models import User, UserBase, Project, ProjectBase, Task, TaskBase, UserRole, TaskStatus
from server.auth import get_password_hash, verify_password, create_access_token, get_current_user, check_admin
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Ethara AI Project Management")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Auth Endpoints
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(UserBase):
    password: str

@app.post("/signup", response_model=UserBase)
def signup(user: UserCreate, session: Session = Depends(get_session)):
    try:
        statement = select(User).where(User.email == user.email)
        db_user = session.exec(statement).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password)
        new_user = User(
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            password_hash=hashed_password
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}
    }

# Project Endpoints
@app.get("/projects", response_model=List[Project])
def get_projects(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        statement = select(Project)
    else:
        statement = select(Project).where(Project.owner_id == current_user.id)
    return session.exec(statement).all()

@app.post("/projects", response_model=Project)
def create_project(project: ProjectBase, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    db_project = Project(**project.dict(), owner_id=current_user.id)
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete associated tasks first
    statement = select(Task).where(Task.project_id == project_id)
    tasks = session.exec(statement).all()
    for task in tasks:
        session.delete(task)
        
    session.delete(project)
    session.commit()
    return {"message": "Project deleted"}

# Task Endpoints
@app.get("/projects/{project_id}/tasks", response_model=List[Task])
def get_tasks(project_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Task).where(Task.project_id == project_id)
    return session.exec(statement).all()

@app.post("/projects/{project_id}/tasks", response_model=Task)
def create_task(project_id: int, task: TaskBase, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    db_task = Task(**task.dict(), project_id=project_id)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.patch("/tasks/{task_id}", response_model=Task)
def update_task_status(task_id: int, status: TaskStatus, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db_task.status = status
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return {"message": "Task deleted"}

# Dashboard Stats
@app.get("/dashboard/stats")
def get_stats(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        tasks = session.exec(select(Task)).all()
    else:
        # Get all tasks where the project's owner is the current user
        statement = select(Task).join(Project).where(Project.owner_id == current_user.id)
        tasks = session.exec(statement).all()
    
    stats = {
        "total": len(tasks),
        "todo": len([t for t in tasks if t.status == TaskStatus.TODO]),
        "in_progress": len([t for t in tasks if t.status == TaskStatus.IN_PROGRESS]),
        "completed": len([t for t in tasks if t.status == TaskStatus.COMPLETED]),
    }
    return stats

# Serve Frontend
client_path = os.path.join(os.path.dirname(__file__), "..", "client")
app.mount("/", StaticFiles(directory=client_path, html=True), name="static")
