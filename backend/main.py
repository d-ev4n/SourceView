
from contextlib import asynccontextmanager
from typing import Optional, Literal

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import Base, engine, SessionLocal
from models import User, Source, Connection
from auth import router as auth_router, get_current_user


# -------------------------
# DATABASE
# -------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


# -------------------------
# FASTAPI
# -------------------------

app = FastAPI(
    title="SourceView API",
    description="Visual Research and Knowledge Management System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://source-view-ten.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


# -------------------------
# SCHEMAS
# -------------------------

SourceType = Literal[
    "article",
    "website",
    "paper",
    "note",
]

RelationshipType = Literal[
    "related",
    "supports",
    "contradicts",
    "expands",
]


class SourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    url: Optional[str] = None
    description: Optional[str] = None
    source_type: SourceType


class SourceUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    url: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[SourceType] = None


class SourceResponse(BaseModel):
    id: int
    title: str
    url: Optional[str]
    description: Optional[str]
    source_type: str

    model_config = ConfigDict(from_attributes=True)


class ConnectionCreate(BaseModel):
    source_id: int
    target_id: int
    relationship_type: RelationshipType


class ConnectionResponse(BaseModel):
    id: int
    source_id: int
    target_id: int
    relationship_type: str

    model_config = ConfigDict(from_attributes=True)


# -------------------------
# OWNERSHIP HELPERS
# -------------------------

def get_owned_source(
    source_id: int,
    current_user: User,
    db: Session,
):
    source = (
        db.query(Source)
        .filter(
            Source.id == source_id,
            Source.user_id == current_user.id,
        )
        .first()
    )

    if source is None:
        raise HTTPException(
            status_code=404,
            detail="Source not found",
        )

    return source


def get_owned_connection(
    connection_id: int,
    current_user: User,
    db: Session,
):
    connection = (
        db.query(Connection)
        .join(
            Source,
            Connection.source_id == Source.id,
        )
        .filter(
            Connection.id == connection_id,
            Source.user_id == current_user.id,
        )
        .first()
    )

    if connection is None:
        raise HTTPException(
            status_code=404,
            detail="Connection not found",
        )

    # Verify the target is also owned by this user.
    get_owned_source(
        connection.target_id,
        current_user,
        db,
    )

    return connection


# -------------------------
# HOME
# -------------------------

@app.get("/")
def home():
    return {
        "message": "SourceView API is running",
        "status": "success",
    }


# -------------------------
# SOURCE ENDPOINTS
# -------------------------

@app.get(
    "/sources",
    response_model=list[SourceResponse],
)
def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Source)
        .filter(Source.user_id == current_user.id)
        .order_by(Source.id.desc())
        .all()
    )


@app.post(
    "/sources",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_source(
    data: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    title = data.title.strip()

    if not title:
        raise HTTPException(
            status_code=422,
            detail="Source title cannot be empty",
        )

    source = Source(
        user_id=current_user.id,
        title=title,
        url=data.url,
        description=data.description,
        source_type=data.source_type,
    )

    db.add(source)
    db.commit()
    db.refresh(source)

    return source


@app.get(
    "/sources/{source_id}",
    response_model=SourceResponse,
)
def read_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_owned_source(
        source_id,
        current_user,
        db,
    )


@app.put(
    "/sources/{source_id}",
    response_model=SourceResponse,
)
def update_source(
    source_id: int,
    data: SourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = get_owned_source(
        source_id,
        current_user,
        db,
    )

    updates = data.model_dump(exclude_unset=True)

    if "title" in updates:
        if updates["title"] is None:
            raise HTTPException(
                status_code=422,
                detail="Title cannot be null",
            )

        updates["title"] = updates["title"].strip()

        if not updates["title"]:
            raise HTTPException(
                status_code=422,
                detail="Title cannot be empty",
            )

    if "source_type" in updates:
        if updates["source_type"] is None:
            raise HTTPException(
                status_code=422,
                detail="Source type cannot be null",
            )

    for field, value in updates.items():
        setattr(source, field, value)

    db.commit()
    db.refresh(source)

    return source


@app.delete("/sources/{source_id}")
def delete_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = get_owned_source(
        source_id,
        current_user,
        db,
    )

    # Remove relationships before removing the source.
    db.query(Connection).filter(
        (Connection.source_id == source.id)
        | (Connection.target_id == source.id)
    ).delete(synchronize_session=False)

    db.delete(source)
    db.commit()

    return {
        "message": "Source deleted successfully",
    }


# -------------------------
# CONNECTION ENDPOINTS
# -------------------------

@app.get(
    "/connections",
    response_model=list[ConnectionResponse],
)
def list_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Both endpoints must belong to the current user.
    owned_ids = (
        db.query(Source.id)
        .filter(Source.user_id == current_user.id)
    )

    return (
        db.query(Connection)
        .filter(
            Connection.source_id.in_(owned_ids),
            Connection.target_id.in_(owned_ids),
        )
        .order_by(Connection.id.desc())
        .all()
    )


@app.post(
    "/connections",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_connection(
    data: ConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.source_id == data.target_id:
        raise HTTPException(
            status_code=400,
            detail="A source cannot connect to itself",
        )

    # Reject connections to another user's sources.
    get_owned_source(
        data.source_id,
        current_user,
        db,
    )

    get_owned_source(
        data.target_id,
        current_user,
        db,
    )

    existing = (
        db.query(Connection)
        .filter(
            Connection.source_id == data.source_id,
            Connection.target_id == data.target_id,
            Connection.relationship_type
            == data.relationship_type,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Connection already exists",
        )

    connection = Connection(
        source_id=data.source_id,
        target_id=data.target_id,
        relationship_type=data.relationship_type,
    )

    db.add(connection)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Connection already exists or is invalid",
        )

    db.refresh(connection)

    return connection


@app.get(
    "/connections/{connection_id}",
    response_model=ConnectionResponse,
)
def read_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_owned_connection(
        connection_id,
        current_user,
        db,
    )


@app.delete("/connections/{connection_id}")
def delete_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    connection = get_owned_connection(
        connection_id,
        current_user,
        db,
    )

    db.delete(connection)
    db.commit()

    return {
        "message": "Connection deleted successfully",
    }
