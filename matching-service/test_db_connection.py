import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Load environment variables from matching-service/.env
env_path = Path(__file__).with_name(".env")
load_dotenv(env_path)

try:
    # Connect to PostgreSQL
    connection = psycopg.connect(
        host=os.getenv("PGHOST"),
        port=os.getenv("PGPORT"),
        dbname=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD")
    )

    print("Successfully connected to PostgreSQL!")

    # Execute a test query
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT current_database(), current_user, version();
        """)

        result = cursor.fetchone()

        print("\nDatabase:", result[0])
        print("Connected user:", result[1])
        print("PostgreSQL version:", result[2].split(",")[0])

    connection.close()
    print("\nConnection closed successfully.")

except Exception as error:
    print("Database connection failed!")
    print("Error:", error)