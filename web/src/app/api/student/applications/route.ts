
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    // Only logged-in students can view their applications.
    if (
      !session.isLoggedIn ||
      !session.userId ||
      session.role !== "STUDENT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please log in as a student.",
        },
        { status: 401 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT
          a.application_id AS applicationId,
          a.status,
          a.applied_at AS appliedAt,
          a.updated_at AS updatedAt,
          d.drive_id AS driveId,
          d.company_name AS companyName,
          d.job_role AS jobRole,
          d.job_location AS jobLocation,
          d.salary_package AS salaryPackage,
          d.application_deadline AS applicationDeadline,
          d.status AS driveStatus
       FROM applications a
       INNER JOIN students s
          ON a.student_id = s.student_id
       INNER JOIN placement_drives d
          ON a.drive_id = d.drive_id
       WHERE s.user_id = ?
       ORDER BY a.applied_at DESC`,
      [session.userId]
    );

    const applications = (
      rows as {
        applicationId: number;
        status: "APPLIED" | "SHORTLISTED" | "REJECTED" | "SELECTED";
        appliedAt: Date;
        updatedAt: Date;
        driveId: number;
        companyName: string;
        jobRole: string;
        jobLocation: string | null;
        salaryPackage: string | null;
        applicationDeadline: Date;
        driveStatus: "OPEN" | "CLOSED";
      }[]
    ).map((application) => ({
      ...application,
      appliedAt: application.appliedAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      applicationDeadline:
        application.applicationDeadline.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("Fetch student applications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load your applications.",
      },
      { status: 500 }
    );
  }
}
