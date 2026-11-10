
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { readFile } from "fs/promises";
import path from "path";

import pool from "@/lib/db";
import { getSession } from "@/lib/session";



const RESUME_DIR = path.join(process.cwd(), "private_uploads", "resumes");

interface ResumeDownloadRow extends RowDataPacket {
  original_filename: string;
  stored_filename: string;
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Student access required." },
        { status: 403 }
      );
    }

    const [rows] = await pool.execute<ResumeDownloadRow[]>(
      `SELECT r.original_filename, r.stored_filename
       FROM resumes r
       INNER JOIN students s ON s.student_id = r.student_id
       WHERE s.user_id = ?
       LIMIT 1`,
      [session.userId]
    );

    const resume = rows[0];

    if (!resume) {
      return NextResponse.json(
        { success: false, message: "Resume not found." },
        { status: 404 }
      );
    }

    // Use the server-generated filename from the database.
    const filePath = path.join(RESUME_DIR, resume.stored_filename);
    const file = await readFile(filePath);

    const safeFilename = encodeURIComponent(
      resume.original_filename.replace(/[\r\n"]/g, "_")
    );

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume.pdf"; filename*=UTF-8''${safeFilename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Download resume error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to download resume." },
      { status: 500 }
    );
  }
}
