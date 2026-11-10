
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (
      !session.isLoggedIn ||
      !session.userId ||
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 401 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT
          s.student_id AS studentId,
          s.full_name AS fullName,
          s.srn AS srn,
          u.email AS email,
          s.phone AS phone,
          s.department AS department,
          s.cgpa AS cgpa,
          s.graduation_year AS graduationYear,
          s.created_at AS registeredAt,
          CASE
            WHEN r.resume_id IS NOT NULL THEN TRUE
            ELSE FALSE
          END AS hasResume
       FROM students s
       INNER JOIN users u
          ON s.user_id = u.user_id
       LEFT JOIN resumes r
          ON s.student_id = r.student_id
       WHERE u.role = 'STUDENT'
       ORDER BY s.created_at DESC`
    );

    const students = (
      rows as {
        studentId: number;
        fullName: string;
        srn: string;
        email: string;
        phone: string | null;
        department: string | null;
        cgpa: number | string | null;
        graduationYear: number | null;
        registeredAt: Date;
        hasResume: number | boolean;
      }[]
    ).map((student) => ({
      ...student,
      registeredAt: student.registeredAt
        ? student.registeredAt.toISOString()
        : null,
      hasResume: Boolean(student.hasResume),
    }));

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error("Admin fetch students error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load registered students.",
      },
      { status: 500 }
    );
  }
}
