# Smart College Placement & Recruitment Management System

A web-based placement management system that helps students discover suitable job opportunities through semantic resume–job matching and skill gap analysis.

## Problem Statement

College placement activities involve managing student profiles, company drives, job eligibility, applications, interviews, and offers. This project aims to organize these activities while helping students identify relevant opportunities and missing skills.

## Objectives

- Manage student profiles and placement activities.
- Organize companies, placement drives, and job openings.
- Check student eligibility against job requirements.
- Recommend relevant jobs using semantic resume–job matching.
- Identify missing skills and support skill gap analysis.
- Track applications, interviews, offers, and final placements.

## Technology Stack

- **Frontend and application:** Next.js
- **Relational database:** MySQL
- **Vector search:** PostgreSQL with pgvector
- **Embedding model:** Sentence Transformers (`all-MiniLM-L6-v2`)
- **Version control:** Git and GitHub

## Database Responsibilities

- **MySQL:** Student profiles, skills, resumes metadata, companies, drives, jobs, applications, interviews, offers, and placements.
- **PostgreSQL + pgvector:** Resume and job-description embeddings for semantic similarity search.

## Project Status

Currently in the requirements analysis and database design phase.

## Repository Structure

- `docs/` — Requirements, ER diagram, relational schema, data dictionary, and architecture documentation.
- `database/mysql/` — MySQL schema, sample data, and SQL queries.
- `database/postgresql/` — PostgreSQL and pgvector setup, embedding schema, and similarity-search queries.

## Setup

Setup instructions will be added as the application and databases are implemented.

## Team Contributions

Team members will contribute to database design, database implementation, application development, testing, and documentation.
