
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

SourceType = Literal["article", "website", "paper", "note"]

RelationshipType = Literal[
    "related", "supports", "contradicts", "expands"
]


class SourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    url: str | None = None
    description: str | None = None
    source_type: SourceType


class SourceResponse(SourceCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConnectionCreate(BaseModel):
    source_id: int
    target_id: int
    relationship_type: RelationshipType


class ConnectionResponse(ConnectionCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
