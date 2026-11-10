import os
import secrets
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

import re
SKILL_ALIASES = {
    "javascript": ["javascript", "js"],
    "node.js": ["node.js", "nodejs", "node"],
    "express.js": ["express.js", "express"],
    "postgresql": ["postgresql", "postgres"],
    "mysql": ["mysql"],
    "github": ["github", "git hub"],
    "scikit-learn": ["scikit-learn", "sklearn"],
}


# --------------------------------------------------
# Configuration
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")

MODEL_NAME = "all-MiniLM-L6-v2"

API_KEY = os.getenv("MATCHING_SERVICE_API_KEY")

# Private resume storage directory used by Next.js
RESUME_DIR = (
    PROJECT_DIR / "web" / "private_uploads" / "resumes"
).resolve()


# --------------------------------------------------
# FastAPI application and model
# --------------------------------------------------

app = FastAPI(title="PlaceSmart Matching Service")

print("Loading Sentence Transformer model...")

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

print("Model loaded successfully!")


# --------------------------------------------------
# Request model
# --------------------------------------------------

class ResumeRequest(BaseModel):
    student_id: int = Field(gt=0)
    resume_id: int = Field(gt=0)
    stored_filename: str

class JobRequest(BaseModel):
    drive_id: int = Field(gt=0)
    job_text: str = Field(min_length=1, max_length=30000)

class MatchRequest(BaseModel):
    student_id: int = Field(gt=0)
    resume_id: int = Field(gt=0)
    drive_id: int = Field(gt=0)
    required_skills: list[str] = Field(default_factory=list)


# --------------------------------------------------
# Authentication
# --------------------------------------------------

def verify_api_key(x_api_key: str | None):
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Matching service API key is not configured"
        )

    if not x_api_key or not secrets.compare_digest(
        x_api_key, API_KEY
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )


# --------------------------------------------------
# Database connection
# --------------------------------------------------

def get_db_connection():
    return psycopg.connect(
        host=os.getenv("PGHOST"),
        port=os.getenv("PGPORT"),
        dbname=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD")
    )


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "success": True,
        "message": "PlaceSmart matching service is running"
    }


# --------------------------------------------------
# Process resume and store embedding
# --------------------------------------------------

@app.post("/process-resume")
def process_resume(
    request: ResumeRequest,
    x_api_key: str | None = Header(default=None)
):
    verify_api_key(x_api_key)

    # Accept only a filename, not an arbitrary path.
    filename = request.stored_filename

    if (
        not filename
        or Path(filename).name != filename
        or not filename.lower().endswith(".pdf")
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid resume filename"
        )

    pdf_path = (RESUME_DIR / filename).resolve()

    # Ensure the resolved file remains inside the private directory.
    if pdf_path.parent != RESUME_DIR:
        raise HTTPException(
            status_code=400,
            detail="Invalid resume file location"
        )

    if not pdf_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Resume PDF not found"
        )

    try:
        print(f"Processing resume: {filename}")

        reader = PdfReader(str(pdf_path))

        resume_text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        ).strip()

        if not resume_text:
            raise HTTPException(
                status_code=422,
                detail="No readable text found in the PDF"
            )

        print("Generating embedding...")

        embedding = model.encode(
            resume_text,
            normalize_embeddings=True
        )

        embedding_string = "[" + ",".join(
            str(float(value)) for value in embedding
        ) + "]"

        with get_db_connection() as connection:
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
                        request.student_id,
                        request.resume_id,
                        resume_text,
                        embedding_string,
                        MODEL_NAME
                    )
                )

        print("Resume embedding stored successfully!")

        return {
            "success": True,
            "message": "Resume embedding stored successfully",
            "student_id": request.student_id,
            "resume_id": request.resume_id,
            "text_length": len(resume_text),
            "embedding_dimensions": len(embedding)
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Resume processing error:", error)

        raise HTTPException(
            status_code=500,
            detail="Resume processing failed"
        )

# --------------------------------------------------
# Delete resume embedding
# --------------------------------------------------

@app.delete("/resume-embedding/{resume_id}")
def delete_resume_embedding(
    resume_id: int,
    x_api_key: str | None = Header(default=None)
):
    verify_api_key(x_api_key)

    if resume_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid resume ID"
        )

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM resume_embeddings
                    WHERE resume_id = %s
                    RETURNING resume_id;
                    """,
                    (resume_id,)
                )

                deleted = cursor.fetchone()

        return {
            "success": True,
            "deleted": deleted is not None,
            "resume_id": resume_id,
            "message": (
                "Resume embedding deleted successfully"
                if deleted
                else "No embedding found for this resume"
            )
        }

    except Exception as error:
        print("Resume embedding deletion error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to delete resume embedding"
        )


# --------------------------------------------------
# Process job description and store embedding
# --------------------------------------------------

@app.post("/process-job")
def process_job(
    request: JobRequest,
    x_api_key: str | None = Header(default=None)
):
    verify_api_key(x_api_key)

    try:
        job_text = request.job_text.strip()

        if not job_text:
            raise HTTPException(
                status_code=422,
                detail="Job description cannot be empty"
            )

        print(
            f"Processing job drive: {request.drive_id}",
            flush=True
        )

        # Step 1: Generate embedding
        print("Starting job embedding generation...", flush=True)

        embedding = model.encode(
            job_text,
            normalize_embeddings=True
        )

        print("Job embedding generated successfully!", flush=True)
        print(
            f"Embedding dimensions: {len(embedding)}",
            flush=True
        )

        # Step 2: Convert embedding to PostgreSQL vector format
        embedding_string = "[" + ",".join(
            str(float(value)) for value in embedding
        ) + "]"

        print("Connecting to PostgreSQL...", flush=True)

        # Step 3: Store embedding in PostgreSQL
        with get_db_connection() as connection:

            print("PostgreSQL connection successful!", flush=True)

            with connection.cursor() as cursor:

                print("Executing job embedding INSERT...", flush=True)

                cursor.execute(
                    """
                    INSERT INTO job_embeddings
                        (drive_id, job_description, embedding,
                         model_name, updated_at)
                    VALUES (%s, %s, %s::vector, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (drive_id)
                    DO UPDATE SET
                        job_description = EXCLUDED.job_description,
                        embedding = EXCLUDED.embedding,
                        model_name = EXCLUDED.model_name,
                        updated_at = CURRENT_TIMESTAMP;
                    """,
                    (
                        request.drive_id,
                        job_text,
                        embedding_string,
                        MODEL_NAME
                    )
                )

            print(
                "Job embedding stored in PostgreSQL!",
                flush=True
            )

        return {
            "success": True,
            "message": "Job embedding stored successfully",
            "drive_id": request.drive_id,
            "embedding_dimensions": len(embedding)
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Job embedding error:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Job embedding generation failed"
        )

@app.delete("/job-embedding/{drive_id}")
def delete_job_embedding(drive_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            DELETE FROM job_embeddings
            WHERE drive_id = %s
            RETURNING drive_id;
            """,
            (drive_id,)
        )

        deleted_row = cursor.fetchone()

        conn.commit()
        cursor.close()
        conn.close()

        if deleted_row is None:
            raise HTTPException(
                status_code=404,
                detail="Job embedding not found."
            )

        return {
            "success": True,
            "message": "Job embedding deleted successfully.",
            "drive_id": drive_id
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Error deleting job embedding:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to delete job embedding."
        )

def calculate_section_relevance(
    section_text: str,
    job_text: str
) -> float | None:
    """
    Calculate semantic relevance between a resume section
    and a job description using the existing SentenceTransformer model.

    Returns a score from 0 to 100.
    Returns None if the resume section is unavailable.
    """

    if not section_text or not section_text.strip():
        return None

    if not job_text or not job_text.strip():
        return None

    section_embedding = model.encode(
        section_text,
        normalize_embeddings=True
    )

    job_embedding = model.encode(
        job_text,
        normalize_embeddings=True
    )

    similarity = float(
        section_embedding @ job_embedding
    )

    # Cosine similarity ranges from -1 to 1.
    # Convert it to a 0–100 display score.
    relevance_score = ((similarity + 1) / 2) * 100

    return round(relevance_score, 2)

def extract_resume_sections(resume_text: str) -> dict:
    """
    Extract project and experience sections from resume text.
    Uses common resume headings.
    """

    lines = resume_text.splitlines()

    project_headings = [
        "projects",
        "academic projects",
        "personal projects",
        "technical projects",
    ]

    experience_headings = [
        "experience",
        "work experience",
        "internship",
        "internships",
        "professional experience",
    ]

    sections = {
        "projects": [],
        "experience": [],
    }

    current_section = None

    all_headings = {
        heading: "projects" for heading in project_headings
    }

    all_headings.update({
        heading: "experience" for heading in experience_headings
    })

    for line in lines:
        cleaned_line = line.strip().lower().rstrip(":")

        if cleaned_line in all_headings:
            current_section = all_headings[cleaned_line]
            continue

        # Stop collecting when another major section begins
        if cleaned_line in [
            "education",
            "technical skills",
            "skills",
            "certifications",
            "achievements",
            "languages",
        ]:
            current_section = None
            continue

        if current_section and line.strip():
            sections[current_section].append(line.strip())

    return {
        "projects": "\n".join(sections["projects"]),
        "experience": "\n".join(sections["experience"]),
    }

def calculate_additional_skills_score(
    resume_text: str,
    required_skills: list[str]
) -> float:
    """
    Calculate a capped score for additional relevant skills.

    Only skills from our known skill aliases are considered.
    Required skills are excluded to avoid double counting.
    """

    normalized_resume = resume_text.lower()

    # Known skills and their common aliases
    known_skills = {
        "python": ["python"],
        "java": ["java"],
        "c": ["c"],
        "c++": ["c++"],
        "javascript": ["javascript", "js"],
        "typescript": ["typescript", "ts"],
        "react": ["react", "react.js"],
        "next.js": ["next.js", "nextjs"],
        "node.js": ["node.js", "nodejs"],
        "express.js": ["express.js", "express"],
        "html": ["html"],
        "css": ["css"],
        "sql": ["sql"],
        "mysql": ["mysql"],
        "postgresql": ["postgresql", "postgres"],
        "mongodb": ["mongodb", "mongo"],
        "pytorch": ["pytorch"],
        "tensorflow": ["tensorflow"],
        "scikit-learn": ["scikit-learn", "sklearn"],
        "opencv": ["opencv"],
        "git": ["git"],
        "github": ["github"],
        "docker": ["docker"],
        "linux": ["linux"],
        "fastapi": ["fastapi"],
        "machine learning": ["machine learning"],
        "deep learning": ["deep learning"],
    }

    # Normalize required skills and their aliases
    excluded_skills = set()

    for skill in required_skills:
        normalized_skill = skill.strip().lower()

        excluded_skills.add(normalized_skill)

        for alias in SKILL_ALIASES.get(
            normalized_skill,
            [normalized_skill]
        ):
            excluded_skills.add(alias.lower())

    additional_skills = set()

    for skill_name, aliases in known_skills.items():

        if skill_name in excluded_skills:
            continue

        for alias in aliases:
            pattern = (
                r"(?<![a-z0-9])"
                + re.escape(alias.lower())
                + r"(?![a-z0-9])"
            )

            if re.search(pattern, normalized_resume):
                additional_skills.add(skill_name)
                break

    # Maximum score is 100.
    # The score will contribute at most 10 points to the final score.
    score_per_skill = 20

    return min(
        len(additional_skills) * score_per_skill,
        100
    )

# --------------------------------------------------
# Match a resume with a placement drive
# --------------------------------------------------

@app.post("/match")
def match_resume_with_job(
    request: MatchRequest,
    x_api_key: str | None = Header(default=None)
):
    verify_api_key(x_api_key)

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:

                # 1. Retrieve resume and job data
                cursor.execute(
                    """
                    SELECT
                        r.resume_text,
                        r.embedding <=> j.embedding AS cosine_distance,
                        j.job_description
                    FROM resume_embeddings r
                    CROSS JOIN job_embeddings j
                    WHERE r.resume_id = %s
                      AND r.student_id = %s
                      AND j.drive_id = %s;
                    """,
                    (
                        request.resume_id,
                        request.student_id,
                        request.drive_id
                    )
                )

                embedding_row = cursor.fetchone()

                if embedding_row is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Resume or job embedding not found"
                    )

                resume_text, cosine_distance, job_description = embedding_row

                # 2. Overall semantic similarity
                semantic_score = 1.0 - float(cosine_distance)

                # 3. Extract resume sections
                resume_sections = extract_resume_sections(resume_text)

                # 4. Calculate project and experience relevance
                project_relevance = calculate_section_relevance(
                    resume_sections["projects"],
                    job_description
                )

                experience_relevance = calculate_section_relevance(
                    resume_sections["experience"],
                    job_description
                )

                # 5. Match required skills
                normalized_resume = resume_text.lower()

                matched_skills = []
                missing_skills = []

                for skill in request.required_skills:
                    skill = skill.strip()

                    if not skill:
                        continue

                    normalized_skill = skill.lower()

                    aliases = SKILL_ALIASES.get(
                        normalized_skill,
                        [normalized_skill]
                    )

                    skill_found = False

                    for alias in aliases:
                        escaped_alias = re.escape(alias.lower())

                        pattern = (
                            r"(?<![a-z0-9])"
                            + escaped_alias
                            + r"(?![a-z0-9])"
                        )

                        if re.search(pattern, normalized_resume):

                            if normalized_skill == "c":
                                c_pattern = r"(?<![a-z0-9+#.])c(?![a-z0-9+#])"

                                if re.search(c_pattern, normalized_resume):
                                    skill_found = True
                                    break
                                else:
                                    continue

                            skill_found = True
                            break

                    if skill_found:
                        matched_skills.append(skill)
                    else:
                        missing_skills.append(skill)

                # 6. Required skills score
                total_skills = len(matched_skills) + len(missing_skills)

                skill_coverage = (
                    len(matched_skills) / total_skills * 100
                    if total_skills > 0
                    else None
                )

                required_skills_score = skill_coverage

                # 7. Additional relevant skills score
                additional_skills_score = calculate_additional_skills_score(
                    resume_text,
                    request.required_skills
                )

                # 8. Calculate final suitability score
                #
                # Weights:
                # Required skills: 40%
                # Projects: 40%
                # Experience: 10%
                # Additional skills: 10%
                #
                # Missing experience is excluded and remaining
                # weights are proportionally normalized.

                components = []

                if required_skills_score is not None:
                    components.append((required_skills_score, 40))

                if project_relevance is not None:
                    components.append((project_relevance, 40))

                if experience_relevance is not None:
                    components.append((experience_relevance, 10))

                components.append((additional_skills_score, 10))

                available_weight = sum(
                    weight for _, weight in components
                )

                final_score = (
                    sum(score * weight for score, weight in components)
                    / available_weight
                    if available_weight > 0
                    else None
                )

                # 9. Save results
                cursor.execute(
                    """
                    INSERT INTO match_results (
                        student_id,
                        resume_id,
                        drive_id,
                        semantic_score,
                        skill_coverage,
                        required_skills_score,
                        project_relevance,
                        experience_relevance,
                        additional_skills_score,
                        final_score,
                        matched_skills,
                        missing_skills,
                        model_name,
                        calculated_at
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (resume_id, drive_id)
                    DO UPDATE SET
                        student_id = EXCLUDED.student_id,
                        semantic_score = EXCLUDED.semantic_score,
                        skill_coverage = EXCLUDED.skill_coverage,
                        required_skills_score = EXCLUDED.required_skills_score,
                        project_relevance = EXCLUDED.project_relevance,
                        experience_relevance = EXCLUDED.experience_relevance,
                        additional_skills_score = EXCLUDED.additional_skills_score,
                        final_score = EXCLUDED.final_score,
                        matched_skills = EXCLUDED.matched_skills,
                        missing_skills = EXCLUDED.missing_skills,
                        model_name = EXCLUDED.model_name,
                        calculated_at = CURRENT_TIMESTAMP;
                    """,
                    (
                        request.student_id,
                        request.resume_id,
                        request.drive_id,
                        semantic_score,
                        skill_coverage,
                        required_skills_score,
                        project_relevance,
                        experience_relevance,
                        additional_skills_score,
                        final_score,
                        matched_skills,
                        missing_skills,
                        MODEL_NAME
                    )
                )

        return {
            "success": True,
            "student_id": request.student_id,
            "resume_id": request.resume_id,
            "drive_id": request.drive_id,
            "semantic_score": round(semantic_score, 4),
            "skill_coverage": (
                round(skill_coverage, 2)
                if skill_coverage is not None
                else None
            ),
            "required_skills_score": required_skills_score,
            "project_relevance": project_relevance,
            "experience_relevance": experience_relevance,
            "additional_skills_score": additional_skills_score,
            "final_score": (
                round(final_score, 2)
                if final_score is not None
                else None
            ),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Matching error:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Resume-job matching failed"
        )