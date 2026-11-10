
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer


# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MODEL_NAME = "all-MiniLM-L6-v2"

print("Loading embedding model...")
model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)
print("Model loaded successfully!")


def process_resume(student_id, resume_id, pdf_path):

    pdf_path = Path(pdf_path)

    if not pdf_path.exists():
        raise FileNotFoundError(f"Resume PDF not found: {pdf_path}")

    # 1. Extract text from PDF
    print("Extracting resume text...")

    reader = PdfReader(str(pdf_path))

    resume_text = "\n".join(
        page.extract_text() or ""
        for page in reader.pages
    ).strip()

    if not resume_text:
        raise ValueError(
            "No readable text found in the PDF."
        )

    print("Text extracted successfully!")
    print("Extracted characters:", len(resume_text))

    # 2. Generate embedding
    print("Generating resume embedding...")

    embedding = model.encode(
        resume_text,
        normalize_embeddings=True
    )

    print("Embedding generated!")
    print("Embedding dimensions:", len(embedding))

    # Convert embedding to pgvector-compatible string
    embedding_string = "[" + ",".join(
        str(float(value)) for value in embedding
    ) + "]"

    # 3. Store in PostgreSQL
    print("Connecting to PostgreSQL...")

    with psycopg.connect(
        host=os.getenv("PGHOST"),
        port=os.getenv("PGPORT"),
        dbname=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD")
    ) as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO resume_embeddings
                    (student_id, resume_id, resume_text,
                     embedding, model_name, updated_at)
                VALUES (%s, %s, %s, %s::vector, %s, CURRENT_TIMESTAMP)

                ON CONFLICT (resume_id)
                DO UPDATE SET
                    student_id = EXCLUDED.student_id,
                    resume_text = EXCLUDED.resume_text,
                    embedding = EXCLUDED.embedding,
                    model_name = EXCLUDED.model_name,
                    updated_at = CURRENT_TIMESTAMP;
                """,
                (
                    student_id,
                    resume_id,
                    resume_text,
                    embedding_string,
                    MODEL_NAME
                )
            )

    print("Resume embedding stored successfully!")


if __name__ == "__main__":

    if len(sys.argv) != 4:
        print(
            "Usage: python process_resume.py "
            "<student_id> <resume_id> <pdf_path>"
        )
        sys.exit(1)

    try:
        student_id = int(sys.argv[1])
        resume_id = int(sys.argv[2])
        pdf_path = sys.argv[3]

        process_resume(
            student_id,
            resume_id,
            pdf_path
        )

    except Exception as error:
        print("Resume processing failed:", error)
        sys.exit(1)
