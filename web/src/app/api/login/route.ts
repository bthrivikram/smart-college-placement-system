
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  password_hash: string;
  role: "STUDENT" | "ADMIN";
  is_active: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    const role =
      body.role === "ADMIN" ? "ADMIN" : "STUDENT";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute<UserRow[]>(
      `SELECT user_id, email, password_hash, role, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = rows[0];

    if (
      !user ||
      !user.is_active ||
      user.role !== role ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid email, password, or account type." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      redirectTo:
        user.role === "ADMIN"
          ? "/admin/dashboard"
          : "/student/dashboard",
    });

    const session = await getSession();

    session.userId = user.user_id;
    session.email = user.email;
    session.role = user.role;
    session.isLoggedIn = true;

    await session.save();

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }
}
