
import { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface StudentProfile extends RowDataPacket {
  full_name: string;
  email: string;
  srn: string;
  phone: string | null;
  department: string | null;
  cgpa: number | null;
  graduation_year: number | null;
}

async function getStudentProfile(userId: number) {
  const [rows] = await pool.execute<StudentProfile[]>(
    `SELECT
       s.full_name,
       u.email,
       s.srn,
       s.phone,
       s.department,
       s.cgpa,
       s.graduation_year
     FROM students s
     INNER JOIN users u ON u.user_id = s.user_id
     WHERE s.user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] ?? null;
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

  return { userId: session.userId };
}

export async function GET() {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const profile = await getStudentProfile(auth.userId);

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Fetch profile error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch profile." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await authenticateStudent();
    if ("error" in auth) return auth.error;

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const allowedFields = [
      "phone",
      "department",
      "cgpa",
      "graduationYear",
    ] as const;

    const providedFields = allowedFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    );

    if (providedFields.length === 0) {
      return NextResponse.json(
        { success: false, message: "No editable fields provided." },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of providedFields) {
      const value = body[field];

      if (field === "phone") {
        if (value !== null && typeof value !== "string") {
          return NextResponse.json(
            { success: false, message: "Invalid phone number." },
            { status: 400 }
          );
        }

        const phone = typeof value === "string" ? value.trim() : null;

        if (phone !== null && phone.length > 20) {
          return NextResponse.json(
            { success: false, message: "Phone number is too long." },
            { status: 400 }
          );
        }

        updates.push("phone = ?");
        values.push(phone);
      }

      if (field === "department") {
        if (value !== null && typeof value !== "string") {
          return NextResponse.json(
            { success: false, message: "Invalid department." },
            { status: 400 }
          );
        }

        const department =
          typeof value === "string" ? value.trim() : null;

        if (department !== null && department.length > 100) {
          return NextResponse.json(
            { success: false, message: "Department is too long." },
            { status: 400 }
          );
        }

        updates.push("department = ?");
        values.push(department);
      }

      if (field === "cgpa") {
        if (
          value !== null &&
          (typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < 0 ||
            value > 10)
        ) {
          return NextResponse.json(
            { success: false, message: "CGPA must be between 0 and 10." },
            { status: 400 }
          );
        }

        updates.push("cgpa = ?");
        values.push(value);
      }

      if (field === "graduationYear") {
        if (
          value !== null &&
          (typeof value !== "number" ||
            !Number.isInteger(value) ||
            value < 1901 ||
            value > 2155)
        ) {
          return NextResponse.json(
            { success: false, message: "Invalid graduation year." },
            { status: 400 }
          );
        }

        updates.push("graduation_year = ?");
        values.push(value);
      }
    }

    values.push(auth.userId);

    await pool.execute<ResultSetHeader>(
      `UPDATE students
       SET ${updates.join(", ")}
       WHERE user_id = ?`,
      values
    );

    const profile = await getStudentProfile(auth.userId);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update profile." },
      { status: 500 }
    );
  }
}
