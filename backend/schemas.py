
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# Default and custom source types
SourceType = str

# Default and custom relationship types
RelationshipType = str


class SourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    url: str | None = None
    description: str | None = None
    source_type: SourceType = Field(min_length=1, max_length=100)


class SourceResponse(SourceCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConnectionCreate(BaseModel):
    source_id: int
    target_id: int
    relationship_type: RelationshipType = Field(
        min_length=1,
        max_length=100
    )


class ConnectionResponse(ConnectionCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
