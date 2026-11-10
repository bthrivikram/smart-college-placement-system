
# Project Requirements

## 1. Project Title

Smart College Placement & Recruitment Management System with Semantic Resume–Job Matching and Skill Gap Analysis

## 2. Problem Statement

College placement activities involve managing student profiles, company information, placement drives, job openings, eligibility criteria, applications, interviews, and offers. Managing these activities separately can make it difficult to maintain consistent records and help students identify suitable opportunities.

This project proposes a centralized web application for placement management. It will combine structured relational data with semantic similarity search to recommend relevant jobs, identify missing skills, and support placement administrators in managing recruitment activities.

## 3. Objectives

- Centralize student, company, job, application, interview, offer, and placement information.
- Automate eligibility checks using structured job requirements.
- Recommend relevant jobs using semantic resume–job matching.
- Identify skills that students possess and skills required by a job that they may be missing.
- Track application progress, interview outcomes, and offers.
- Generate useful placement statistics and reports.
- Demonstrate relational database design, advanced SQL, vector similarity search, and web application integration.

## 4. Project Scope

### In Scope

- Student and placement administrator authentication.
- Student profile and skill management.
- Resume upload metadata and extracted text management.
- Company and placement drive management.
- Job posting and eligibility criteria management.
- Student eligibility filtering.
- Semantic job recommendations.
- Skill gap analysis.
- Job applications and application status tracking.
- Interview scheduling and results.
- Offer and final placement management.
- Administrative dashboards and reports.
- MySQL relational database implementation.
- PostgreSQL with pgvector for embedding storage and similarity search.

### Out of Scope for the Initial Version

- Direct integration with external company recruitment systems.
- Automated email or SMS delivery.
- Production-grade cloud deployment.
- Automatic hiring decisions based solely on AI-generated scores.
- Direct integration with college ERP or student information systems.

These features may be considered future enhancements.

## 5. Actors

### 5.1 Student

A student can:
- Log in securely.
- View and update their profile.
- Manage skills and resume versions.
- Browse available jobs and placement drives.
- View eligibility results.
- Receive semantic job recommendations.
- View match scores and missing skills.
- Apply for eligible jobs.
- Track applications and interview schedules.
- View offer information and placement status.

### 5.2 Placement Administrator

A placement administrator can:
- Log in securely.
- Manage student records.
- Manage company information.
- Create and manage placement drives.
- Create job openings and eligibility criteria.
- View applications and update application status.
- Schedule interviews and record results.
- Record offers and final placement information.
- View placement statistics and reports.

Company or recruiter login is not included in the initial version.

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | The system shall authenticate users and enforce role-based access control. |
| FR-02 | The system shall allow students to manage their profiles. |
| FR-03 | The system shall allow students to maintain their skills and resume versions. |
| FR-04 | The system shall allow administrators to manage companies and placement drives. |
| FR-05 | The system shall allow administrators to create and manage job openings. |
| FR-06 | The system shall check eligibility using configured criteria such as CGPA and graduation year. |
| FR-07 | The system shall allow eligible students to apply for jobs. |
| FR-08 | The system shall prevent duplicate applications to the same job. |
| FR-09 | The system shall generate semantic job recommendations using resume and job-description embeddings. |
| FR-10 | The system shall display a match score and identify potentially missing required skills. |
| FR-11 | The system shall track application status and maintain application history. |
| FR-12 | The system shall support multiple interview rounds for an application. |
| FR-13 | The system shall record offers associated with applications. |
| FR-14 | The system shall maintain final placement records for students. |
| FR-15 | The system shall provide dashboards and placement reports. |
| FR-16 | The system shall validate user input and enforce database integrity constraints. |

## 7. Non-Functional Requirements

### Security
- Passwords shall be stored as secure hashes, never as plaintext.
- Protected APIs shall enforce authentication and authorization.
- Database credentials shall be stored in environment variables.
- Sensitive information shall not be exposed in client-side code or committed to GitHub.

### Data Integrity
- Primary keys and foreign keys shall maintain record relationships.
- Unique constraints shall prevent duplicate accounts and applications where appropriate.
- Invalid values and inconsistent state transitions shall be rejected.
- Historical application and offer records shall be retained.

### Performance
- Appropriate indexes shall be created for frequently queried columns.
- Vector indexes may be used when the embedding collection is sufficiently large.
- Eligibility filtering shall use structured relational data before recommendations are presented.

### Usability
- The interface shall provide clear navigation for students and administrators.
- Validation errors and operation results shall be communicated clearly.
- Recommendations shall explain match results and missing skills where possible.

### Maintainability
- Application code, database scripts, and documentation shall be organized separately.
- Changes shall be tracked through Git and GitHub.
- Setup instructions shall be maintained in the README.

## 8. Business Rules

1. A user account has a defined role, such as student or admin.
2. A student account is associated with at most one student profile.
3. A student may maintain multiple resume versions, but only one can be active at a time.
4. A company may conduct multiple placement drives.
5. A placement drive may contain multiple job openings.
6. Students and jobs may each be associated with multiple skills.
7. A student may apply to multiple jobs, but only once to the same job.
8. Applications must satisfy configured eligibility requirements before submission.
9. An application may have multiple interview rounds.
10. An application may receive an offer; different applications belonging to the same student may produce multiple offers.
11. A student may have at most one final placement record in the initial system.
12. The final placement must reference the offer accepted by the student.
13. Closing a drive must not delete its historical applications, interviews, or offers.
14. Semantic similarity is a recommendation signal, not a replacement for structured eligibility checks.
15. Missing-skill analysis shall use structured skill requirements and student skill records.
16. Embeddings must be refreshed when the source resume or job description changes.

## 9. Database Strategy

### MySQL
Stores authoritative relational records, including users, students, skills, resumes metadata, companies, drives, jobs, applications, interviews, offers, and placements.

### PostgreSQL with pgvector
Stores resume and job-description embeddings and supports vector similarity search.

Cross-database identifiers shall be maintained by the application. MySQL foreign-key constraints cannot directly enforce references to records stored in a separate PostgreSQL database.

## 10. Success Criteria

The project will be considered successful when:
- Student and administrator workflows function correctly.
- Database relationships and integrity constraints are tested.
- Eligibility checks return correct results for test cases.
- Semantic recommendations return relevant candidate jobs.
- Skill gap analysis identifies missing required skills from structured data.
- Application, interview, offer, and placement workflows are demonstrated.
- The implementation includes documented advanced SQL concepts and vector search.
- The README and project documentation provide reproducible setup instructions.
