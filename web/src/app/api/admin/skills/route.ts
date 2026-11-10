
import { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface SkillRow extends RowDataPacket {
  skill_id: number;
  skill_name: string;
}

async function checkAdmin() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, response: null };
}

export async function GET() {
  try {
    const auth = await checkAdmin();

    if (!auth.authorized) {
      return auth.response!;
    }

    const [skills] = await pool.execute<SkillRow[]>(
      `SELECT skill_id, skill_name
       FROM skills
       ORDER BY skill_name ASC`
    );

    return NextResponse.json({
      success: true,
      skills,
    });
  } catch (error) {
    console.error("Fetch admin skills error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch available skills." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdmin();

    if (!auth.authorized) {
      return auth.response!;
    }

    const body = await request.json();
    const skillName =
      typeof body.skill_name === "string" ? body.skill_name.trim() : "";

    if (!skillName) {
      return NextResponse.json(
        { success: false, message: "Skill name is required." },
        { status: 400 }
      );
    }

    if (skillName.length > 100) {
      return NextResponse.json(
        { success: false, message: "Skill name must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    // Check for an existing skill without considering letter case.
    const [existingSkills] = await pool.execute<SkillRow[]>(
      `SELECT skill_id, skill_name
       FROM skills
       WHERE LOWER(skill_name) = LOWER(?)
       LIMIT 1`,
      [skillName]
    );

    if (existingSkills.length > 0) {
      return NextResponse.json({
        success: true,
        message: "This skill already exists.",
        skill: existingSkills[0],
      });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO skills (skill_name)
       VALUES (?)`,
      [skillName]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Skill added successfully.",
        skill: {
          skill_id: result.insertId,
          skill_name: skillName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add admin skill error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to add the skill." },
      { status: 500 }
    );
  }
}
