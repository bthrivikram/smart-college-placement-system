
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";


interface ExistingStudent extends RowDataPacket {
  email_exists: number;
  srn_exists: number;
}

export async function POST(request: Request) {
  let connection;

  try {
    const body = await request.json();

    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const srn =
      typeof body.srn === "string" ? body.srn.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!fullName || !email || !srn || !password) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    if (fullName.length > 150 || srn.length > 50 || email.length > 255) {
      return NextResponse.json(
        { success: false, message: "One or more fields are too long." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute<ExistingStudent[]>(
      `SELECT
         EXISTS(SELECT 1 FROM users WHERE email = ?) AS email_exists,
         EXISTS(SELECT 1 FROM students WHERE srn = ?) AS srn_exists`,
      [email, srn]
    );

    if (existing[0].email_exists || existing[0].srn_exists) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: existing[0].email_exists
            ? "An account with this email already exists."
            : "This SRN is already registered.",
        },
        { status: 409 }
      );
    }

    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, role)
       VALUES (?, ?, 'STUDENT')`,
      [email, passwordHash]
    );

    await connection.execute<ResultSetHeader>(
      `INSERT INTO students (user_id, srn, full_name)
       VALUES (?, ?, ?)`,
      [userResult.insertId, srn, fullName]
    );

    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Student account created successfully. You can now sign in.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    // Handle duplicate-key races even when two requests arrive together.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This email or SRN is already registered.",
        },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      { success: false, message: "Registration failed. Please try again." },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
