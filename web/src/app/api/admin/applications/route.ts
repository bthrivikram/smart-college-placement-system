
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    // Only logged-in admins can view applications.
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
          a.application_id AS applicationId,
          a.status AS applicationStatus,
          a.applied_at AS appliedAt,
          a.updated_at AS updatedAt,
          s.student_id AS studentId,
          s.full_name AS studentName,
          s.srn AS srn,
          u.email AS studentEmail,
          s.department AS department,
          s.cgpa AS cgpa,
          s.graduation_year AS graduationYear,
          d.drive_id AS driveId,
          d.company_name AS companyName,
          d.job_role AS jobRole
       FROM applications a
       INNER JOIN students s
          ON a.student_id = s.student_id
       INNER JOIN users u
          ON s.user_id = u.user_id
       INNER JOIN placement_drives d
          ON a.drive_id = d.drive_id
       ORDER BY a.applied_at DESC`
    );

    const applications = (
      rows as {
        applicationId: number;
        applicationStatus:
          | "APPLIED"
          | "SHORTLISTED"
          | "REJECTED"
          | "SELECTED";
        appliedAt: Date;
        updatedAt: Date;
        studentId: number;
        studentName: string;
        srn: string;
        studentEmail: string;
        department: string | null;
        cgpa: number | null;
        graduationYear: number | null;
        driveId: number;
        companyName: string;
        jobRole: string;
      }[]
    ).map((application) => ({
      ...application,
      appliedAt: application.appliedAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("Admin fetch applications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load applications.",
      },
      { status: 500 }
    );
  }
}
