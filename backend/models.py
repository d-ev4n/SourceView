
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    sources = relationship("Source", back_populates="owner")


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=False)
    url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # Supports default and custom source types
    source_type = Column(String(100), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    owner = relationship("User", back_populates="sources")

    outgoing_connections = relationship(
        "Connection",
        foreign_keys="Connection.source_id",
        passive_deletes=True,
    )

    incoming_connections = relationship(
        "Connection",
        foreign_keys="Connection.target_id",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint(
            "length(btrim(title)) > 0",
            name="valid_source_title",
        ),
        CheckConstraint(
            "length(btrim(source_type)) > 0",
            name="valid_source_type",
        ),
    )


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True)

    source_id = Column(
        Integer,
        ForeignKey("sources.id", ondelete="CASCADE"),
        nullable=False,
    )

    target_id = Column(
        Integer,
        ForeignKey("sources.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Supports default and custom relationship types
    relationship_type = Column(String(100), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "source_id <> target_id",
            name="no_self_connection",
        ),
        CheckConstraint(
            "length(btrim(relationship_type)) > 0",
            name="valid_relationship_type",
        ),
        UniqueConstraint(
            "source_id",
            "target_id",
            "relationship_type",
            name="unique_connection",
        ),
        Index("idx_connections_target", "target_id"),
    )
