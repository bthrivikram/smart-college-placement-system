
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface StudentRow extends RowDataPacket {
  student_id: number;
}

interface ResumeRow extends RowDataPacket {
  resume_id: number;
}

interface DriveRow extends RowDataPacket {
  drive_id: number;
}

interface SkillRow extends RowDataPacket {
  skill_name: string;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the student.
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

    // 2. Validate the requested placement drive ID.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("driveId" in body) ||
      typeof body.driveId !== "number" ||
      !Number.isInteger(body.driveId) ||
      body.driveId <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "A valid drive ID is required." },
        { status: 400 }
      );
    }

    const driveId = body.driveId;

    // 3. Find the student's database ID.
    const [studentRows] = await pool.execute<StudentRow[]>(
      `SELECT student_id
       FROM students
       WHERE user_id = ?
       LIMIT 1`,
      [session.userId]
    );

    if (!studentRows[0]) {
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      );
    }

    const studentId = studentRows[0].student_id;

    // 4. Retrieve the student's active resume.
    const [resumeRows] = await pool.execute<ResumeRow[]>(
      `SELECT resume_id
       FROM resumes
       WHERE student_id = ?
       LIMIT 1`,
      [studentId]
    );

    if (!resumeRows[0]) {
      return NextResponse.json(
        { success: false, message: "Please upload a resume first." },
        { status: 404 }
      );
    }

    const resumeId = resumeRows[0].resume_id;

    // 5. Verify that the placement drive exists.
    const [driveRows] = await pool.execute<DriveRow[]>(
      `SELECT drive_id
       FROM placement_drives
       WHERE drive_id = ?
       LIMIT 1`,
      [driveId]
    );

    if (!driveRows[0]) {
      return NextResponse.json(
        { success: false, message: "Placement drive not found." },
        { status: 404 }
      );
    }

    // 6. Retrieve the required skills from MySQL.
    const [skillRows] = await pool.execute<SkillRow[]>(
      `SELECT s.skill_name
       FROM drive_required_skills ds
       INNER JOIN skills s
         ON s.skill_id = ds.skill_id
       WHERE ds.drive_id = ?
       ORDER BY s.skill_name`,
      [driveId]
    );

    const requiredSkills = skillRows.map(
      (skill) => skill.skill_name
    );

    // 7. Call the FastAPI matching service.
    const serviceUrl = process.env.MATCHING_SERVICE_URL;
    const apiKey = process.env.MATCHING_SERVICE_API_KEY;

    if (!serviceUrl || !apiKey) {
      console.error("Matching service environment variables are missing.");

      return NextResponse.json(
        { success: false, message: "Matching service is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(`${serviceUrl}/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        student_id: studentId,
        resume_id: resumeId,
        drive_id: driveId,
        required_skills: requiredSkills,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Matching service error:", response.status, result);

      return NextResponse.json(
        {
          success: false,
          message: result.detail ?? "Unable to calculate resume match.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Resume matching completed successfully.",
      match: result,
    });

  } catch (error) {
    console.error("Resume matching API error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to complete resume matching." },
      { status: 500 }
    );
  }
}
