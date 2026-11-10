import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface DriveRow extends RowDataPacket {
  drive_id: number;
  company_name: string;
  job_role: string;
  job_description: string | null;
  minimum_cgpa: string | number | null;
  eligible_department: string | null;
  eligible_graduation_year: number | null;
  job_location: string | null;
  salary_package: string | null;
  application_deadline: Date;
  application_deadline_local: string;
  status: "OPEN" | "CLOSED";
  created_by: number;
  created_at: Date;
  updated_at: Date;
  required_skills: string | null;
}

interface DriveInput {
  companyName: string;
  jobRole: string;
  jobDescription?: string | null;
  minimumCgpa?: number | null;
  eligibleDepartment?: string | null;
  eligibleGraduationYear?: number | null;
  jobLocation?: string | null;
  salaryPackage?: string | null;
  applicationDeadline: string;
  status?: "OPEN" | "CLOSED";
  requiredSkillIds: number[];
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status },
  );
}

async function checkAdmin() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return errorResponse("Please log in first.", 401);
  }

  if (session.role !== "ADMIN") {
    return errorResponse("Admin access required.", 403);
  }

  return null;
}

// Validate datetime-local input and preserve its exact local date/time.
// MySQL DATETIME stores the value without timezone conversion.
function validateLocalDeadline(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText ?? "0");

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText} ${hourText}:${minuteText}:${String(second).padStart(2, "0")}`;
}

function validateDrive(body: unknown): {
  input?: DriveInput;
  error?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid request body." };
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.companyName !== "string" ||
    !data.companyName.trim() ||
    data.companyName.trim().length > 150
  ) {
    return {
      error: "Enter a valid company name (maximum 150 characters).",
    };
  }

  if (
    typeof data.jobRole !== "string" ||
    !data.jobRole.trim() ||
    data.jobRole.trim().length > 150
  ) {
    return {
      error: "Enter a valid job role (maximum 150 characters).",
    };
  }

  const formattedDeadline = validateLocalDeadline(
    data.applicationDeadline,
  );

  if (!formattedDeadline) {
    return { error: "Enter a valid application deadline." };
  }

  const description = data.jobDescription ?? null;
  const department = data.eligibleDepartment ?? null;
  const location = data.jobLocation ?? null;
  const salary = data.salaryPackage ?? null;

  if (
    description !== null &&
    (typeof description !== "string" || description.length > 20000)
  ) {
    return { error: "Job description is too long or invalid." };
  }

  if (
    department !== null &&
    (typeof department !== "string" || department.length > 100)
  ) {
    return { error: "Department must not exceed 100 characters." };
  }

  if (
    location !== null &&
    (typeof location !== "string" || location.length > 150)
  ) {
    return { error: "Location must not exceed 150 characters." };
  }

  if (
    salary !== null &&
    (typeof salary !== "string" || salary.length > 100)
  ) {
    return { error: "Salary package must not exceed 100 characters." };
  }

  let minimumCgpa: number | null = null;

  if (data.minimumCgpa !== undefined && data.minimumCgpa !== null) {
    if (
      typeof data.minimumCgpa !== "number" ||
      !Number.isFinite(data.minimumCgpa) ||
      data.minimumCgpa < 0 ||
      data.minimumCgpa > 10
    ) {
      return { error: "Minimum CGPA must be between 0 and 10." };
    }

    minimumCgpa = data.minimumCgpa;
  }

  let graduationYear: number | null = null;

  if (
    data.eligibleGraduationYear !== undefined &&
    data.eligibleGraduationYear !== null
  ) {
    if (
      typeof data.eligibleGraduationYear !== "number" ||
      !Number.isInteger(data.eligibleGraduationYear) ||
      data.eligibleGraduationYear < 1901 ||
      data.eligibleGraduationYear > 2155
    ) {
      return { error: "Enter a valid graduation year." };
    }

    graduationYear = data.eligibleGraduationYear;
  }

  const status = data.status ?? "OPEN";

  if (status !== "OPEN" && status !== "CLOSED") {
    return { error: "Status must be OPEN or CLOSED." };
  }

  if (
    !Array.isArray(data.requiredSkillIds) ||
    !data.requiredSkillIds.every(
      (id) => typeof id === "number" && Number.isInteger(id) && id > 0,
    )
  ) {
    return {
      error: "Required skills must be an array of valid skill IDs.",
    };
  }

  const requiredSkillIds = [...new Set(data.requiredSkillIds as number[])];

  return {
    input: {
      companyName: data.companyName.trim(),
      jobRole: data.jobRole.trim(),
      jobDescription: description as string | null,
      minimumCgpa,
      eligibleDepartment:
        typeof department === "string" && department.trim()
          ? department.trim()
          : null,
      eligibleGraduationYear: graduationYear,
      jobLocation:
        typeof location === "string" && location.trim()
          ? location.trim()
          : null,
      salaryPackage:
        typeof salary === "string" && salary.trim()
          ? salary.trim()
          : null,

      // Exact local date/time string for MySQL DATETIME.
      applicationDeadline: formattedDeadline,

      status,
      requiredSkillIds,
    },
  };
}

async function saveRequiredSkills(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  driveId: number,
  skillIds: number[],
) {
  if (skillIds.length === 0) return;

  const placeholders = skillIds.map(() => "?").join(", ");

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT skill_id
     FROM skills
     WHERE skill_id IN (${placeholders})`,
    skillIds,
  );

  if (rows.length !== skillIds.length) {
    throw new Error("INVALID_SKILL_IDS");
  }

  for (const skillId of skillIds) {
    await connection.execute(
      `INSERT INTO drive_required_skills (drive_id, skill_id)
       VALUES (?, ?)`,
      [driveId, skillId],
    );
  }
}

async function buildJobText(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  input: DriveInput,
): Promise<string> {
  let skillNames: string[] = [];

  if (input.requiredSkillIds.length > 0) {
    const placeholders = input.requiredSkillIds.map(() => "?").join(", ");

    const [skills] = await connection.execute<RowDataPacket[]>(
      `SELECT skill_name
       FROM skills
       WHERE skill_id IN (${placeholders})
       ORDER BY skill_name`,
      input.requiredSkillIds,
    );

    skillNames = skills.map((skill) => String(skill.skill_name));
  }

  return [
    `Job Role: ${input.jobRole}`,
    `Job Description: ${input.jobDescription ?? ""}`,
    `Required Skills: ${skillNames.join(", ")}`,
  ].join("\n");
}

async function processJobEmbedding(
  driveId: number,
  jobText: string,
): Promise<boolean> {
  try {
    const serviceUrl = process.env.MATCHING_SERVICE_URL;
    const apiKey = process.env.MATCHING_SERVICE_API_KEY;

    if (!serviceUrl || !apiKey) {
      console.error("Matching service environment variables are missing.");
      return false;
    }

    const response = await fetch(`${serviceUrl}/process-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        drive_id: driveId,
        job_text: jobText,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(
        "Job embedding processing failed:",
        response.status,
        await response.text(),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unable to process job embedding:", error);
    return false;
  }
}

// GET: List all placement drives.
export async function GET() {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const [drives] = await pool.execute<DriveRow[]>(
      `SELECT
         d.*,
         DATE_FORMAT(
           d.application_deadline,
           '%Y-%m-%dT%H:%i'
         ) AS application_deadline_local,
         GROUP_CONCAT(
           DISTINCT s.skill_name
           ORDER BY s.skill_name SEPARATOR ', '
         ) AS required_skills
       FROM placement_drives d
       LEFT JOIN drive_required_skills ds
         ON ds.drive_id = d.drive_id
       LEFT JOIN skills s
         ON s.skill_id = ds.skill_id
       GROUP BY d.drive_id
       ORDER BY d.created_at DESC`,
    );

    return NextResponse.json({ success: true, drives });
  } catch (error) {
    console.error("Fetch placement drives error:", error);
    return errorResponse("Unable to fetch placement drives.", 500);
  }
}

// POST: Create a placement drive.
export async function POST(request: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body.", 400);
  }

  const validation = validateDrive(body);

  if (!validation.input) {
    return errorResponse(validation.error ?? "Invalid drive details.", 400);
  }

  const input = validation.input;
  const session = await getSession();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
  `INSERT INTO placement_drives (
    company_name,
    job_role,
    job_description,
    minimum_cgpa,
    eligible_department,
    eligible_graduation_year,
    job_location,
    salary_package,
    application_deadline,
    status,
    created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    input.companyName,
    input.jobRole,
    input.jobDescription,
    input.minimumCgpa,
    input.eligibleDepartment,
    input.eligibleGraduationYear,
    input.jobLocation,
    input.salaryPackage,
    input.applicationDeadline,
    input.status,
    session.userId,
  ]
);

    await saveRequiredSkills(
      connection,
      result.insertId,
      input.requiredSkillIds,
    );

    await connection.commit();

    const jobText = await buildJobText(connection, input);

    const embeddingReady = await processJobEmbedding(
      result.insertId,
      jobText,
    );

    return NextResponse.json(
      {
        success: true,
        message: embeddingReady
          ? "Placement drive created and job embedding generated successfully."
          : "Placement drive created successfully, but job embedding is pending.",
        driveId: result.insertId,
        embeddingStatus: embeddingReady ? "READY" : "PENDING",
      },
      { status: 201 },
    );
  } catch (error) {
    await connection.rollback();

    if (error instanceof Error && error.message === "INVALID_SKILL_IDS") {
      return errorResponse("One or more selected skills do not exist.", 400);
    }

    console.error("Create placement drive error:", error);
    return errorResponse("Unable to create placement drive.", 500);
  } finally {
    connection.release();
  }
}

// PUT: Update a placement drive and replace its required skills.
export async function PUT(request: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body.", 400);
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
    return errorResponse("A valid drive ID is required.", 400);
  }

  const driveId = body.driveId;
  const validation = validateDrive(body);

  if (!validation.input) {
    return errorResponse(validation.error ?? "Invalid drive details.", 400);
  }

  const input = validation.input;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

        const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE placement_drives SET
        company_name = ?,
        job_role = ?,
        job_description = ?,
        minimum_cgpa = ?,
        eligible_department = ?,
        eligible_graduation_year = ?,
        job_location = ?,
        salary_package = ?,
        application_deadline = ?,
        status = ?
       WHERE drive_id = ?`,
      [
        input.companyName,
        input.jobRole,
        input.jobDescription ?? null,
        input.minimumCgpa,
        input.eligibleDepartment ?? null,
        input.eligibleGraduationYear,
        input.jobLocation ?? null,
        input.salaryPackage ?? null,
        input.applicationDeadline,
        input.status,
        driveId,
      ] as (string | number | null)[],
    );

    if (result.affectedRows === 0) {
      const [existing] = await connection.execute<RowDataPacket[]>(
        "SELECT drive_id FROM placement_drives WHERE drive_id = ?",
        [driveId],
      );

      if (existing.length === 0) {
        await connection.rollback();
        return errorResponse("Placement drive not found.", 404);
      }
    }

    await connection.execute(
      "DELETE FROM drive_required_skills WHERE drive_id = ?",
      [driveId],
    );

    await saveRequiredSkills(
      connection,
      driveId,
      input.requiredSkillIds,
    );

    await connection.commit();

    const jobText = await buildJobText(connection, input);

    const embeddingReady = await processJobEmbedding(driveId, jobText);

    return NextResponse.json({
      success: true,
      message: embeddingReady
        ? "Placement drive updated and job embedding regenerated successfully."
        : "Placement drive updated successfully, but job embedding is pending.",
      embeddingStatus: embeddingReady ? "READY" : "PENDING",
    });
  } catch (error) {
    await connection.rollback();

    if (error instanceof Error && error.message === "INVALID_SKILL_IDS") {
      return errorResponse("One or more selected skills do not exist.", 400);
    }

    console.error("Update placement drive error:", error);
    return errorResponse("Unable to update placement drive.", 500);
  } finally {
    connection.release();
  }
}

// DELETE: Delete a placement drive.
export async function DELETE(request: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const driveId = Number(searchParams.get("driveId"));

  if (!Number.isInteger(driveId) || driveId <= 0) {
    return errorResponse("A valid driveId query parameter is required.", 400);
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM placement_drives WHERE drive_id = ?",
      [driveId],
    );

    if (result.affectedRows === 0) {
      return errorResponse("Placement drive not found.", 404);
    }

    let embeddingDeleted = false;

    try {
      const serviceUrl = process.env.MATCHING_SERVICE_URL;
      const apiKey = process.env.MATCHING_SERVICE_API_KEY;

      if (serviceUrl && apiKey) {
        const response = await fetch(
          `${serviceUrl}/job-embedding/${driveId}`,
          {
            method: "DELETE",
            headers: {
              "X-API-Key": apiKey,
            },
            signal: AbortSignal.timeout(15000),
          },
        );

        embeddingDeleted = response.ok;
      }
    } catch (error) {
      console.error("Job embedding cleanup failed:", error);
    }

    return NextResponse.json({
      success: true,
      message: embeddingDeleted
        ? "Placement drive and its job embedding deleted successfully."
        : "Placement drive deleted successfully, but embedding cleanup is pending.",
      embeddingStatus: embeddingDeleted ? "DELETED" : "CLEANUP_PENDING",
    });
  } catch (error) {
    console.error("Delete placement drive error:", error);
    return errorResponse("Unable to delete placement drive.", 500);
  }
}