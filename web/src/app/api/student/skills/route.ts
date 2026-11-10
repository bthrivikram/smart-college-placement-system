
import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface StudentRow extends RowDataPacket {
  student_id: number;
}

interface SkillRow extends RowDataPacket {
  skill_id: number;
  skill_name: string;
  added_at: Date;
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

// GET: List the logged-in student's skills.
export async function GET() {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const [skills] = await pool.execute<SkillRow[]>(
      `SELECT s.skill_id, s.skill_name, ss.added_at
       FROM student_skills ss
       INNER JOIN skills s ON s.skill_id = ss.skill_id
       WHERE ss.student_id = ?
       ORDER BY s.skill_name ASC`,
      [auth.studentId]
    );

    return NextResponse.json({ success: true, skills });
  } catch (error) {
    console.error("Fetch skills error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch skills." },
      { status: 500 }
    );
  }
}

// POST: Add a skill to the logged-in student's profile.
export async function POST(request: Request) {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.skillName !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Enter a valid skill name." },
        { status: 400 }
      );
    }

    const skillName = body.skillName.trim();

    if (!skillName || skillName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Skill name must be between 1 and 100 characters.",
        },
        { status: 400 }
      );
    }

    // Create the shared skill if needed.
    // If it already exists, LAST_INSERT_ID returns its existing ID.
    const [skillResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO skills (skill_name)
       VALUES (?)
       ON DUPLICATE KEY UPDATE skill_id = LAST_INSERT_ID(skill_id)`,
      [skillName]
    );

    const skillId = skillResult.insertId;

    // The composite primary key prevents duplicate skills per student.
    const [linkResult] = await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO student_skills (student_id, skill_id)
       VALUES (?, ?)`,
      [auth.studentId, skillId]
    );

    if (linkResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "You have already added this skill." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Skill added successfully.",
        skill: { skill_id: skillId, skill_name: skillName },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add skill error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to add skill." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a skill from the logged-in student's profile.
export async function DELETE(request: Request) {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("skillId" in body) ||
      typeof body.skillId !== "number" ||
      !Number.isInteger(body.skillId) ||
      body.skillId <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "A valid skill ID is required." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM student_skills
       WHERE student_id = ? AND skill_id = ?`,
      [auth.studentId, body.skillId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Skill not found in your profile." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Skill removed successfully.",
    });
  } catch (error) {
    console.error("Delete skill error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to remove skill." },
      { status: 500 }
    );
  }
}
