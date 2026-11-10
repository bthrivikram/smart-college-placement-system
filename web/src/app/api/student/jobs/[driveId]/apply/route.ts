
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{ driveId: string }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const session = await getSession();

    if (
      !session.isLoggedIn ||
      !session.userId ||
      session.role !== "STUDENT"
    ) {
      return NextResponse.json(
        { success: false, message: "Please log in as a student." },
        { status: 401 }
      );
    }

    const { driveId: driveIdParam } = await params;
    const driveId = Number(driveIdParam);

    if (!Number.isInteger(driveId) || driveId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid placement drive ID." },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      // Find the student's profile.
      const [studentRows] = await connection.execute(
        `SELECT student_id, cgpa, department, graduation_year
         FROM students
         WHERE user_id = ?`,
        [session.userId]
      );

      const students = studentRows as {
        student_id: number;
        cgpa: number | null;
        department: string | null;
        graduation_year: number | null;
      }[];

      if (students.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Complete your student profile before applying.",
          },
          { status: 400 }
        );
      }

      const student = students[0];

      // Find the placement drive.
      const [driveRows] = await connection.execute(
        `SELECT drive_id, minimum_cgpa, eligible_department,
                eligible_graduation_year, application_deadline, status
         FROM placement_drives
         WHERE drive_id = ?`,
        [driveId]
      );

      const drives = driveRows as {
        drive_id: number;
        minimum_cgpa: number;
        eligible_department: string | null;
        eligible_graduation_year: number | null;
        application_deadline: Date;
        status: "OPEN" | "CLOSED";
      }[];

      if (drives.length === 0) {
        return NextResponse.json(
          { success: false, message: "Placement drive not found." },
          { status: 404 }
        );
      }

      const drive = drives[0];

      if (
        drive.status !== "OPEN" ||
        new Date(drive.application_deadline).getTime() <= Date.now()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "This placement drive is closed or its deadline has passed.",
          },
          { status: 400 }
        );
      }

      // Check CGPA eligibility.
      if (student.cgpa === null || Number(student.cgpa) < Number(drive.minimum_cgpa)) {
        return NextResponse.json(
          {
            success: false,
            message: "You do not meet the minimum CGPA requirement, or your CGPA is missing.",
          },
          { status: 400 }
        );
      }

      // Check department eligibility when departments are specified.
      if (drive.eligible_department) {
        if (!student.department) {
          return NextResponse.json(
            {
              success: false,
              message: "Add your department to your profile before applying.",
            },
            { status: 400 }
          );
        }

        const eligibleDepartments = drive.eligible_department
          .split(",")
          .map((department) => department.trim().toLowerCase())
          .filter(Boolean);

        if (
          !eligibleDepartments.includes(
            student.department.trim().toLowerCase()
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `This drive is open to these departments: ${drive.eligible_department}.`,
            },
            { status: 400 }
          );
        }
      }

      // Check graduation year when one is specified.
      if (
        drive.eligible_graduation_year !== null &&
        (
          student.graduation_year === null ||
          Number(student.graduation_year) !==
            Number(drive.eligible_graduation_year)
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Your graduation year does not meet this drive's requirement.",
          },
          { status: 400 }
        );
      }

      // Prevent duplicate applications.
      const [existingRows] = await connection.execute(
        `SELECT application_id
         FROM applications
         WHERE student_id = ? AND drive_id = ?
         LIMIT 1`,
        [student.student_id, driveId]
      );

      if ((existingRows as { application_id: number }[]).length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You have already applied for this placement drive.",
          },
          { status: 409 }
        );
      }

      // Save the application.
      await connection.execute(
        `INSERT INTO applications (student_id, drive_id)
         VALUES (?, ?)`,
        [student.student_id, driveId]
      );

      return NextResponse.json(
        {
          success: true,
          message: "Application submitted successfully!",
        },
        { status: 201 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Apply for job error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong while applying." },
      { status: 500 }
    );
  }
}
