
from sqlalchemy import text
from database import engine


def migrate_custom_types():
    with engine.begin() as connection:

        # Remove old source type restriction
        connection.execute(text("""
            ALTER TABLE sources
            DROP CONSTRAINT IF EXISTS valid_source_type
        """))

        # Remove old relationship type restriction
        connection.execute(text("""
            ALTER TABLE connections
            DROP CONSTRAINT IF EXISTS valid_relationship_type
        """))

        # Allow longer custom source type names
        connection.execute(text("""
            ALTER TABLE sources
            ALTER COLUMN source_type TYPE VARCHAR(100)
        """))

        # Allow longer custom relationship names
        connection.execute(text("""
            ALTER TABLE connections
            ALTER COLUMN relationship_type TYPE VARCHAR(100)
        """))

        # Require non-empty source types
        connection.execute(text("""
            ALTER TABLE sources
            ADD CONSTRAINT valid_source_type
            CHECK (length(btrim(source_type)) > 0)
        """))

        # Require non-empty relationship types
        connection.execute(text("""
            ALTER TABLE connections
            ADD CONSTRAINT valid_relationship_type
            CHECK (length(btrim(relationship_type)) > 0)
        """))

    print("Custom source and relationship types enabled successfully!")


if __name__ == "__main__":
    migrate_custom_types()
