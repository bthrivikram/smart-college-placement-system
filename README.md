# PlaceSmart – Smart College Placement & Recruitment Management System

A web-based college placement management system that streamlines the placement and recruitment process by connecting students, placement administrators, and recruiting companies. The system provides placement drive management, student applications, eligibility checking, resume management, and AI-powered semantic resume–job matching with skill gap analysis.

PlaceSmart combines **MySQL for relational data management** with **PostgreSQL and pgvector for vector-based semantic search**, providing both structured database operations and intelligent resume–job relevance analysis.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [Resume–Job Matching System](#resumejob-matching-system)
- [Advanced DBMS Concepts](#advanced-dbms-concepts)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Future Enhancements](#future-enhancements)

---

## Project Overview

Traditional college placement processes often involve manually managing student information, placement drives, applications, eligibility criteria, and resumes. Evaluating resumes against job requirements can also be time-consuming and inconsistent.

PlaceSmart addresses these challenges through a centralized placement management platform.

The system provides two roles:

- **Student:** Can manage their profile, upload resumes, maintain skills, explore placement opportunities, check eligibility, view resume–job matching results, and apply for drives.
- **Admin:** Can manage placement drives, define required skills, monitor applications, manage application statuses, and track placement statistics.

An additional semantic matching service analyzes uploaded resumes and job descriptions to estimate their relevance and identify missing required skills.

---

## Objectives

- Develop a centralized platform for managing college placement activities.
- Provide role-based authentication and access control.
- Maintain student profiles, resumes, skills, placement drives, and applications.
- Automate eligibility checking based on placement drive criteria.
- Implement semantic resume–job matching using sentence embeddings.
- Identify matched and missing skills for each placement opportunity.
- Demonstrate the integration of relational and vector databases.
- Apply advanced DBMS concepts such as triggers, transactions, events, and indexing.

---

## Key Features

### 1. Authentication and Role-Based Access

- Secure login and session-based authentication.
- Two user roles: Student and Admin.
- Protected routes and APIs based on user roles.
- Session management using `iron-session`.

### 2. Student Profile Management

- View and update student profile information.
- Maintain academic details such as CGPA, department, and graduation year.
- Manage technical skills.
- Upload, replace, download, and delete resumes.

### 3. Resume Management

- Upload resumes in PDF format.
- Store uploaded resumes in private server-side storage.
- Extract resume text using Python PDF processing.
- Generate vector embeddings from extracted resume content.
- Store resume embeddings in PostgreSQL using pgvector.

### 4. Placement Drive Management

- Admin can create, update, and delete placement drives.
- Maintain company name, job role, description, application deadline, and eligibility criteria.
- Define required skills for each placement drive.
- Search and add new skills to the skills database.
- Automatically close expired placement drives using MySQL Event Scheduler.

### 5. Job Opportunities and Eligibility Checking

Students can explore available placement opportunities.

Eligibility is evaluated using:

- Minimum CGPA.
- Eligible department.
- Eligible graduation year.
- Placement drive status.
- Application deadline.

The system displays eligibility information and explains the reasons when a student is not eligible.

**Important:** Resume relevance scores and missing skills are informational. They do not independently determine placement eligibility.

### 6. Application Management

- Eligible students can apply for placement drives.
- Prevent duplicate applications for the same student and drive.
- Admin can view applications.
- Admin can update application statuses:
  - APPLIED
  - SHORTLISTED
  - REJECTED
  - SELECTED

### 7. Semantic Resume–Job Matching

- Generate embeddings from resume content and job descriptions.
- Store embeddings in PostgreSQL using pgvector.
- Calculate semantic similarity between resumes and job descriptions.
- Evaluate required skill coverage.
- Analyze project and internship/experience relevance.
- Identify matched and missing required skills.
- Calculate an overall resume relevance score.

### 8. Placement Statistics

- Display the total number of offers received.
- Maintain total application counts for individual placement drives.
- Use database triggers to update relevant statistics automatically.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Authentication | iron-session |
| Relational Database | MySQL |
| Vector Database | PostgreSQL |
| Vector Extension | pgvector |
| Matching Service | Python, FastAPI |
| Embedding Model | Sentence Transformers – all-MiniLM-L6-v2 |
| PDF Processing | PyPDF |
| Machine Learning | Sentence Transformers, PyTorch |
| Database Connectivity | mysql2, psycopg |
| Version Control | Git and GitHub |

---

## System Architecture

PlaceSmart follows a modular architecture consisting of a web application, relational database, vector database, and semantic matching service.

### Architecture Components

1. **Frontend Layer**
   - Next.js and React-based user interface.
   - Separate dashboards and functionality for students and administrators.

2. **Backend Layer**
   - Next.js API routes handle authentication, profile management, placement drives, applications, and database operations.
   - APIs communicate with MySQL and the Python matching service.

3. **Relational Database Layer – MySQL**
   - Stores users, students, resumes, skills, placement drives, applications, and placement statistics.
   - Maintains relationships and constraints between entities.

4. **Vector Database Layer – PostgreSQL with pgvector**
   - Stores resume and job-description embeddings.
   - Supports vector similarity search.
   - Stores calculated resume–job matching results.

5. **Semantic Matching Service – FastAPI**
   - Extracts and processes resume text.
   - Generates embeddings using Sentence Transformers.
   - Performs semantic similarity calculations.
   - Evaluates skill coverage and relevance scores.
   - Stores matching results in PostgreSQL.

### High-Level Workflow

```text
                 STUDENT / ADMIN
                        |
                        v
               Next.js Web Application
                        |
                        v
                Next.js API Routes
                   /          \
                  /            \
                 v              v
          MySQL Database    FastAPI Service
                                  |
                                  v
                         Sentence Transformer
                                  |
                                  v
                          Text Embeddings
                                  |
                                  v
                       PostgreSQL + pgvector
                                  |
                                  v
                        Matching Results
                                  |
                                  v
                        Next.js Application
                                  |
                                  v
                          Student Dashboard
```

---

## Database Design

PlaceSmart uses two database paradigms to manage different types of information.

### 1. MySQL – Relational Database

MySQL manages structured application data and maintains relationships using primary keys, foreign keys, unique constraints, and indexes.

#### Main Tables

| Table | Purpose |
|---|---|
| `users` | Stores user login and authentication information. |
| `students` | Stores student profile and academic details. |
| `resumes` | Maintains uploaded resume records. |
| `skills` | Stores available technical skills. |
| `student_skills` | Maps students to their skills. |
| `placement_drives` | Stores placement drive and job information. |
| `drive_required_skills` | Maps placement drives to required skills. |
| `applications` | Stores student applications and their statuses. |
| `placement_statistics` | Maintains aggregate placement offer statistics. |

#### Relationships

- A user is associated with a student profile.
- A student can maintain resume records.
- Students and skills have a many-to-many relationship.
- Placement drives and required skills have a many-to-many relationship.
- Students can apply to multiple placement drives.
- A placement drive can receive applications from multiple students.

### 2. PostgreSQL with pgvector – Vector Database

PostgreSQL is used for storing and retrieving high-dimensional vector embeddings.

The `vector` extension is used to store 384-dimensional embeddings generated by the Sentence Transformer model.

#### Main Tables

| Table | Purpose |
|---|---|
| `resume_embeddings` | Stores extracted resume text and its vector embedding. |
| `job_embeddings` | Stores job descriptions and their vector embeddings. |
| `match_results` | Stores semantic scores, skill scores, relevance scores, and matching results. |

The PostgreSQL database maintains logical references to MySQL identifiers such as `student_id`, `resume_id`, and `drive_id`. These references are application-managed and are not enforced through cross-database foreign keys.

### Why Two Databases?

- MySQL is suitable for structured data, transactions, relationships, and integrity constraints.
- PostgreSQL with pgvector supports high-dimensional vector storage and similarity search.
- Combining both databases allows the application to perform conventional relational operations as well as semantic information retrieval.

---

## Resume–Job Matching System

PlaceSmart includes a semantic matching module that evaluates how relevant a student's resume is to a particular placement opportunity.

### Step 1: Resume Processing

- Student uploads a PDF resume.
- Resume text is extracted using PyPDF.
- The extracted text is sent to the FastAPI matching service.
- The Sentence Transformer model generates a 384-dimensional embedding.
- Resume text and its embedding are stored in PostgreSQL.

### Step 2: Job Description Processing

- The job description is processed by the matching service.
- An embedding is generated using the same Sentence Transformer model.
- The job description and embedding are stored in PostgreSQL.

### Step 3: Semantic Similarity

The system compares resume and job-description embeddings using cosine similarity.

Cosine similarity measures the similarity between two vectors based on their orientation.

\[
\text{Cosine Similarity}(A,B)=
\frac{A\cdot B}{\|A\|\|B\|}
\]

A higher similarity indicates greater semantic similarity between the resume and job description.

### Step 4: Skill Gap Analysis

The system compares the required skills of a placement drive with the skills identified in the resume.

It identifies:

- Matched skills.
- Missing required skills.
- Required skill coverage.

\[
\text{Skill Coverage} =
\frac{\text{Number of Matched Required Skills}}
{\text{Total Required Skills}}\times100
\]

### Step 5: Relevance Evaluation

The matching service evaluates four components:

| Component | Weight |
|---|---:|
| Required Skill Coverage | 40% |
| Project Relevance | 40% |
| Experience Relevance | 10% |
| Additional Skills | 10% |
| **Total** | **100%** |

The final relevance score is calculated using a weighted combination of these components. When experience information is unavailable, the remaining component weights are normalized.

The score is an estimated resume relevance measure, not a probability of selection or a guarantee of placement.

### Step 6: Result Storage and Display

The matching results are stored in the PostgreSQL `match_results` table.

The student dashboard displays:

- Overall resume relevance score.
- Matched required skills.
- Missing required skills.
- Skill coverage information.

The matching score is provided as additional guidance and does not replace the placement drive's formal eligibility criteria.

---

## Advanced DBMS Concepts

PlaceSmart demonstrates several advanced database concepts.

### 1. Transactions

Transactions are used in placement drive operations to maintain data consistency when multiple related database operations need to succeed together.

The application uses:

- `BEGIN`
- `COMMIT`
- `ROLLBACK`

This helps prevent partially completed database operations.

### 2. Triggers

MySQL triggers automatically maintain placement statistics when application records change.

**Trigger: `after_application_insert`**

- Executes after a new application is inserted.
- Increments the corresponding placement drive's `total_applications` counter.

**Trigger: `after_application_update_offer_count`**

- Executes after an application status is updated.
- Increments the total offers counter when an application changes to `SELECTED`.
- Decrements the counter when a selected application changes to another status.

These triggers reduce the need to calculate the statistics repeatedly using aggregate queries.

### 3. Event Scheduler

MySQL Event Scheduler is used to automatically close expired placement drives.

The event:

- Executes periodically (every one minute).
- Checks whether an open placement drive has passed its application deadline.
- Changes its status from `OPEN` to `CLOSED`.

### 4. Indexing

Indexes improve the performance of frequently executed database queries.

MySQL indexes support efficient retrieval of relational records.

PostgreSQL uses **HNSW (Hierarchical Navigable Small World) indexes** with cosine distance operations for efficient approximate nearest-neighbour vector search.

### 5. Vector Similarity Search

The pgvector extension enables vector similarity operations on resume and job-description embeddings.

Cosine distance is used to retrieve semantically similar vectors.

This enables the system to compare resume content and job descriptions beyond exact keyword matching.

---

## Project Structure

The project is organized into a Next.js web application and a separate Python matching service.

```text
smart-college-placement-system/
│
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   ├── student/
│   │   │   └── api/
│   │   └── lib/
│   │
│   ├── private_uploads/
│   │   └── resumes/
│   │
│   ├── package.json
│   └── .env.local
│
├── matching-service/
│   ├── main.py
│   ├── process_resume.py
│   ├── test_model.py
│   ├── test_db_connection.py
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

## Installation and Setup

Follow the steps below to run PlaceSmart locally.

### Prerequisites

Install the following:

- Node.js and npm.
- Python 3.10 or later.
- MySQL Server.
- PostgreSQL.
- pgvector PostgreSQL extension.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/bthrivikram/smart-college-placement-system.git
```

Navigate to the project directory:

```bash
cd smart-college-placement-system
```

### 2. Configure MySQL

Start the MySQL server and log in:

```bash
mysql -u root -p
```

Create the database:

```sql
CREATE DATABASE smart_placement_db;
```

Select the database:

```sql
USE smart_placement_db;
```

Execute the MySQL schema SQL script included in the project to create the tables, constraints, indexes, triggers, and scheduled event.

Ensure that MySQL Event Scheduler is enabled:

```sql
SET GLOBAL event_scheduler = ON;
```

### 3. Configure PostgreSQL and pgvector

Create the PostgreSQL database:

```sql
CREATE DATABASE placesmart_vector_db;
```

Connect to the database and enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Execute the PostgreSQL schema SQL script included in the project to create the embedding and matching tables and indexes.

Ensure that the PostgreSQL database credentials match the matching service configuration.

### 4. Set Up the Next.js Application

Navigate to the web directory:

```bash
cd web
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the `web` directory and configure the required environment variables.

### 5. Set Up the Python Matching Service

Open a separate terminal and navigate to the matching service:

```bash
cd matching-service
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

On Linux or WSL:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the `.env` file and configure the PostgreSQL credentials and matching service API key.

---

## Environment Variables

### Web Application – `web/.env.local`

```env
MATCHING_SERVICE_URL=http://127.0.0.1:8000
MATCHING_SERVICE_API_KEY=your_matching_service_api_key
```

Configure the MySQL connection and session-related variables required by the web application in the same file, using the variable names expected by the database and session configuration in the source code.

### Python Matching Service – `matching-service/.env`

```env
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=placesmart_vector_db
PGUSER=your_postgres_username
PGPASSWORD=your_postgres_password

MATCHING_SERVICE_API_KEY=your_matching_service_api_key
```

**Important:**

- Use the same matching service API key in both applications.
- Never commit `.env` or `.env.local` files to GitHub.
- Do not expose database passwords, session secrets, or API keys.

---

## Running the Application

Both services must be running for the complete application, including semantic matching, to work.

### 1. Start the Python Matching Service

From the `matching-service` directory, activate the virtual environment and execute:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The matching service will be available at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

### 2. Start the Next.js Application

Open another terminal:

```bash
cd web
```

Run:

```bash
npm run dev
```

The web application will be available at:

```text
http://localhost:3000
```

Open the URL in your browser.

---

## Future Enhancements

- Improve semantic matching through feedback-based score calibration.
- Support additional resume formats.
- Introduce advanced analytics for placement trends.
- Provide detailed student placement reports.
- Improve skill extraction and job-specific skill relevance evaluation.
- Add notifications for upcoming placement deadlines and application status changes.

---

## Conclusion

PlaceSmart provides an integrated solution for managing college placement and recruitment activities. By combining relational database management with vector-based semantic search, the system goes beyond conventional placement management applications.

The integration of MySQL, PostgreSQL with pgvector, Next.js, and FastAPI demonstrates the practical application of database management concepts, backend development, and machine learning in a real-world placement management scenario.

---

**Repository:** [smart-college-placement-system](https://github.com/bthrivikram/smart-college-placement-system)
