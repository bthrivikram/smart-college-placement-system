
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

interface StudentRow extends RowDataPacket {
  student_id: number;
  full_name: string;
  cgpa: number | string | null;
  department: string | null;
  graduation_year: number | null;
}

interface DriveRow extends RowDataPacket {
  drive_id: number;
  company_name: string;
  job_role: string;
  job_description: string | null;
  minimum_cgpa: number | string | null;
  eligible_department: string | null;
  eligible_graduation_year: number | null;
  job_location: string | null;
  salary_package: string | null;
  application_deadline: Date | string;
  status: "OPEN" | "CLOSED";
  required_skills: string | null;
}

interface SkillRow extends RowDataPacket {
  drive_id: number;
  skill_id: number;
  skill_name: string;
}

interface StudentSkillRow extends RowDataPacket {
  skill_id: number;
  skill_name: string;
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Student access required." },
        { status: 403 }
      );
    }

    // Find the logged-in student's profile.
    const [studentRows] = await pool.execute<StudentRow[]>(
      `SELECT
         s.student_id,
         s.full_name,
         s.cgpa,
         s.department,
         s.graduation_year
       FROM students s
       WHERE s.user_id = ?`,
      [session.userId]
    );

    if (studentRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Student profile not found. Please contact the administrator.",
        },
        { status: 404 }
      );
    }

    const student = studentRows[0];

    // Get all drives, including closed or expired drives, for display.
    const [drives] = await pool.execute<DriveRow[]>(
      `SELECT
         d.drive_id,
         d.company_name,
         d.job_role,
         d.job_description,
         d.minimum_cgpa,
         d.eligible_department,
         d.eligible_graduation_year,
         d.job_location,
         d.salary_package,
         d.application_deadline,
         d.status,
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
       ORDER BY d.created_at DESC`
    );

    // Get each drive's required skill IDs and names.
    const [driveSkillRows] = await pool.execute<SkillRow[]>(
      `SELECT
         ds.drive_id,
         s.skill_id,
         s.skill_name
       FROM drive_required_skills ds
       JOIN skills s ON s.skill_id = ds.skill_id
       ORDER BY s.skill_name`
    );

    // Get the current student's skills.
    const [studentSkills] = await pool.execute<StudentSkillRow[]>(
      `SELECT s.skill_id, s.skill_name
       FROM student_skills ss
       JOIN skills s ON s.skill_id = ss.skill_id
       WHERE ss.student_id = ?`,
      [student.student_id]
    );

    const studentSkillIds = new Set(
      studentSkills.map((skill) => Number(skill.skill_id))
    );

    const skillsByDrive = new Map<
      number,
      { skill_id: number; skill_name: string }[]
    >();

    for (const skill of driveSkillRows) {
      const driveId = Number(skill.drive_id);
      const existing = skillsByDrive.get(driveId) ?? [];

      existing.push({
        skill_id: Number(skill.skill_id),
        skill_name: skill.skill_name,
      });

      skillsByDrive.set(driveId, existing);
    }

    const now = Date.now();

    const results = drives.map((drive) => {
      const requiredSkills =
        skillsByDrive.get(Number(drive.drive_id)) ?? [];

      const matchedSkills = requiredSkills.filter((skill) =>
        studentSkillIds.has(skill.skill_id)
      );

      const missingSkills = requiredSkills.filter(
        (skill) => !studentSkillIds.has(skill.skill_id)
      );

      const reasons: string[] = [];

      const deadline = new Date(drive.application_deadline);

      const isOpen =
        drive.status === "OPEN" && deadline.getTime() >= now;

      // Check drive status and application deadline.
      if (drive.status !== "OPEN") {
        reasons.push("This placement drive is closed.");
      } else if (deadline.getTime() < now) {
        reasons.push("The application deadline has passed.");
      }

      // Check minimum CGPA.
      if (
        drive.minimum_cgpa !== null &&
        drive.minimum_cgpa !== undefined
      ) {
        if (student.cgpa === null) {
          reasons.push("Add your CGPA to check eligibility.");
        } else if (
          Number(student.cgpa) < Number(drive.minimum_cgpa)
        ) {
          reasons.push(
            `Minimum CGPA required: ${drive.minimum_cgpa}.`
          );
        }
      }

      // Check eligible department.
      if (drive.eligible_department) {
        if (!student.department) {
          reasons.push("Add your department to check eligibility.");
        } else {
          const eligibleDepartments = drive.eligible_department
            .split(",")
            .map((department) => department.trim().toLowerCase())
            .filter(Boolean);

          const studentDepartment = student.department
            .trim()
            .toLowerCase();

          if (!eligibleDepartments.includes(studentDepartment)) {
            reasons.push(
              `Eligible departments: ${drive.eligible_department}.`
            );
          }
        }
      }

      // Check eligible graduation year.
      if (drive.eligible_graduation_year !== null) {
        if (student.graduation_year === null) {
          reasons.push(
            "Add your graduation year to check eligibility."
          );
        } else if (
          Number(student.graduation_year) !==
          Number(drive.eligible_graduation_year)
        ) {
          reasons.push(
            `Eligible graduation year: ${drive.eligible_graduation_year}.`
          );
        }
      }

      // Required skills do not affect academic eligibility.
      const eligible = isOpen && reasons.length === 0;

      return {
        driveId: Number(drive.drive_id),
        companyName: drive.company_name,
        jobRole: drive.job_role,
        jobDescription: drive.job_description,
        minimumCgpa:
          drive.minimum_cgpa === null
            ? null
            : Number(drive.minimum_cgpa),
        eligibleDepartment: drive.eligible_department,
        eligibleGraduationYear: drive.eligible_graduation_year,
        jobLocation: drive.job_location,
        salaryPackage: drive.salary_package,
        applicationDeadline: drive.application_deadline,
        status: drive.status,
        requiredSkills,
        matchedSkills: matchedSkills.map(
          (skill) => skill.skill_name
        ),
        missingSkills: missingSkills.map(
          (skill) => skill.skill_name
        ),
        isOpen,
        eligible,
        reasons,
      };
    });

    return NextResponse.json({
      success: true,
      student: {
        fullName: student.full_name,
        cgpa: student.cgpa,
        department: student.department,
        graduationYear: student.graduation_year,
        skills: studentSkills.map((skill) => skill.skill_name),
      },
      drives: results,
    });
  } catch (error) {
    console.error("Fetch student job opportunities error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch job opportunities.",
      },
      { status: 500 }
    );
  }
}
