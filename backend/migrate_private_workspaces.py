
from sqlalchemy import text
from database import engine


def migrate():
    with engine.begin() as connection:
        # Add the ownership column if missing.
        connection.execute(
            text(
                """
                ALTER TABLE sources
                ADD COLUMN IF NOT EXISTS user_id INTEGER
                """
            )
        )

        # Existing sources need an explicit owner.
        unassigned = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM sources
                WHERE user_id IS NULL
                """
            )
        ).scalar()

        if unassigned:
            users = connection.execute(
                text(
                    """
                    SELECT id, username
                    FROM users
                    ORDER BY id
                    """
                )
            ).fetchall()

            if not users:
                raise RuntimeError(
                    "No users exist. Register a user first."
                )

            print("\nExisting users:")

            for user in users:
                print(f"  {user.id}: {user.username}")

            print(
                f"\n{unassigned} existing sources "
                "need an owner."
            )

            owner_id = int(
                input(
                    "Enter the user ID that owns "
                    "the existing sources: "
                )
            )

            valid_ids = {user.id for user in users}

            if owner_id not in valid_ids:
                raise RuntimeError(
                    "Invalid user ID. Migration cancelled."
                )

            connection.execute(
                text(
                    """
                    UPDATE sources
                    SET user_id = :owner_id
                    WHERE user_id IS NULL
                    """
                ),
                {"owner_id": owner_id},
            )

        # Add the foreign key only if it does not exist.
        connection.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'sources_user_id_fkey'
                          AND conrelid = 'sources'::regclass
                    ) THEN
                        ALTER TABLE sources
                        ADD CONSTRAINT sources_user_id_fkey
                        FOREIGN KEY (user_id)
                        REFERENCES users(id);
                    END IF;
                END
                $$;
                """
            )
        )

        # All sources must now have an owner.
        connection.execute(
            text(
                """
                ALTER TABLE sources
                ALTER COLUMN user_id SET NOT NULL
                """
            )
        )

        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS
                idx_sources_user_id
                ON sources(user_id)
                """
            )
        )

    print("\nPrivate workspace migration completed!")


if __name__ == "__main__":
    migrate()
