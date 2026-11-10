
import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

import pool from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RESUME_DIR = path.join(process.cwd(), "private_uploads", "resumes");

interface StudentRow extends RowDataPacket {
  student_id: number;
}

interface ResumeRow extends RowDataPacket {
  resume_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_at: Date;
}

async function authenticateStudent() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "STUDENT") {
    return {
      error: NextResponse.json(
        { success: false, message: "Student access required." },
        { status: 403 }
      ),
    };
  }

  const [rows] = await pool.execute<StudentRow[]>(
    "SELECT student_id FROM students WHERE user_id = ? LIMIT 1",
    [session.userId]
  );

  if (!rows[0]) {
    return {
      error: NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      ),
    };
  }

  return { studentId: rows[0].student_id };
}

async function getResume(studentId: number) {
  const [rows] = await pool.execute<ResumeRow[]>(
    `SELECT resume_id, original_filename, stored_filename,
            mime_type, file_size, uploaded_at
     FROM resumes
     WHERE student_id = ?
     LIMIT 1`,
    [studentId]
  );

  return rows[0] ?? null;
}

// Send the uploaded resume to FastAPI for embedding generation.
async function processResumeEmbedding(
  studentId: number,
  resumeId: number,
  storedFilename: string
): Promise<boolean> {
  const serviceUrl = process.env.MATCHING_SERVICE_URL;
  const apiKey = process.env.MATCHING_SERVICE_API_KEY;

  if (!serviceUrl || !apiKey) {
    console.error("Matching service environment variables are missing.");
    return false;
  }

  try {
    const response = await fetch(
      `${serviceUrl}/process-resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          student_id: studentId,
          resume_id: resumeId,
          stored_filename: storedFilename,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error(
        "Matching service returned an error:",
        response.status,
        errorDetails
      );
      return false;
    }

    const result = await response.json();
    console.log("Resume embedding processed:", result);

    return result.success === true;
  } catch (error) {
    console.error("Could not connect to matching service:", error);
    return false;
  }
}

async function deleteResumeEmbedding(
  resumeId: number
): Promise<boolean> {
  const serviceUrl = process.env.MATCHING_SERVICE_URL;
  const apiKey = process.env.MATCHING_SERVICE_API_KEY;

  if (!serviceUrl || !apiKey) {
    console.error("Matching service environment variables are missing.");
    return false;
  }

  try {
    const response = await fetch(
      `${serviceUrl}/resume-embedding/${resumeId}`,
      {
        method: "DELETE",
        headers: {
          "X-API-Key": apiKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Embedding deletion failed:",
        response.status,
        await response.text()
      );
      return false;
    }

    const result = await response.json();
    console.log("Resume embedding deletion:", result);

    return result.success === true;
  } catch (error) {
    console.error("Could not connect to matching service:", error);
    return false;
  }
}

// GET: Fetch the logged-in student's resume metadata.
export async function GET() {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const resume = await getResume(auth.studentId);

    return NextResponse.json({
      success: true,
      resume: resume
        ? {
            resumeId: resume.resume_id,
            filename: resume.original_filename,
            fileSize: resume.file_size,
            uploadedAt: resume.uploaded_at,
            downloadUrl: "/api/student/resume/download",
          }
        : null,
    });
  } catch (error) {
    console.error("Fetch resume error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch resume details." },
      { status: 500 }
    );
  }
}

// POST: Upload a new PDF or replace the existing resume.
export async function POST(request: Request) {
  let newFilePath: string | null = null;

  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Please select a PDF resume." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Resume must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    if (path.extname(file.name).toLowerCase() !== ".pdf") {
      return NextResponse.json(
        { success: false, message: "Only PDF files are allowed." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Check the actual PDF signature.
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { success: false, message: "The selected file is not a valid PDF." },
        { status: 400 }
      );
    }

    const originalFilename =
      path.basename(file.name).replace(/[\r\n"]/g, "_").slice(0, 255) ||
      "resume.pdf";

    const storedFilename = `${randomUUID()}.pdf`;

    await mkdir(RESUME_DIR, { recursive: true });

    newFilePath = path.join(RESUME_DIR, storedFilename);
    await writeFile(newFilePath, bytes, { flag: "wx" });

    const existing = await getResume(auth.studentId);

    let resumeId: number;

    if (existing) {
      await pool.execute<ResultSetHeader>(
        `UPDATE resumes
         SET original_filename = ?,
             stored_filename = ?,
             mime_type = ?,
             file_size = ?,
             uploaded_at = CURRENT_TIMESTAMP
         WHERE student_id = ?`,
        [
          originalFilename,
          storedFilename,
          "application/pdf",
          bytes.length,
          auth.studentId,
        ]
      );

      resumeId = existing.resume_id;

      // Delete the old file only after the database update succeeds.
      try {
        await unlink(path.join(RESUME_DIR, existing.stored_filename));
      } catch (error) {
        console.error("Could not remove replaced resume file:", error);
      }
    } else {
      const [insertResult] = await pool.execute<ResultSetHeader>(
        `INSERT INTO resumes
           (student_id, original_filename, stored_filename,
            mime_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [
          auth.studentId,
          originalFilename,
          storedFilename,
          "application/pdf",
          bytes.length,
        ]
      );

      resumeId = insertResult.insertId;
    }

    // The PDF and MySQL metadata are now saved successfully.
    newFilePath = null;

    // Generate and store the embedding through FastAPI.
    const embeddingSuccess = await processResumeEmbedding(
      auth.studentId,
      resumeId,
      storedFilename
    );

    return NextResponse.json({
      success: true,
      message: existing
        ? "Resume replaced successfully."
        : "Resume uploaded successfully.",
      embeddingStatus: embeddingSuccess ? "READY" : "PENDING",
      embeddingMessage: embeddingSuccess
        ? "Resume is ready for semantic matching."
        : "Resume uploaded, but embedding generation is pending.",
    });
  } catch (error) {
    if (newFilePath) {
      try {
        await unlink(newFilePath);
      } catch {
        // The file may not have been created.
      }
    }

    console.error("Upload resume error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to upload resume." },
      { status: 500 }
    );
  }
}

// DELETE: Delete the logged-in student's resume and its embedding.
export async function DELETE() {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const resume = await getResume(auth.studentId);

    if (!resume) {
      return NextResponse.json(
        { success: false, message: "No resume to delete." },
        { status: 404 }
      );
    }

    // Delete the MySQL resume record first.
    await pool.execute<ResultSetHeader>(
      "DELETE FROM resumes WHERE student_id = ?",
      [auth.studentId]
    );

    // Remove the private PDF.
    try {
      await unlink(path.join(RESUME_DIR, resume.stored_filename));
    } catch (error) {
      console.error("Could not remove resume file:", error);
    }

    // Remove the corresponding PostgreSQL embedding.
    const embeddingDeleted = await deleteResumeEmbedding(
      resume.resume_id
    );

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully.",
      embeddingStatus: embeddingDeleted ? "DELETED" : "CLEANUP_PENDING",
      embeddingMessage: embeddingDeleted
        ? "Resume embedding deleted successfully."
        : "Resume deleted, but embedding cleanup is pending.",
    });
  } catch (error) {
    console.error("Delete resume error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to delete resume." },
      { status: 500 }
    );
  }
}