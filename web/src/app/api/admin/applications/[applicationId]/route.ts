
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

const allowedStatuses = [
  "SHORTLISTED",
  "REJECTED",
  "SELECTED",
] as const;

type ApplicationStatus = (typeof allowedStatuses)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    // 1. Check admin authentication
    const session = await getSession();

    if (
      !session.isLoggedIn ||
      !session.userId ||
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 401 }
      );
    }

    // 2. Validate application ID
    const { applicationId } = await params;
    const id = Number(applicationId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid application ID." },
        { status: 400 }
      );
    }

    // 3. Read and validate the requested status
    const body = await request.json();
    const status = body?.status;

    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status as ApplicationStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Use SHORTLISTED, REJECTED, or SELECTED.",
        },
        { status: 400 }
      );
    }

    // 4. Update the application
    const [result] = await pool.execute(
      `UPDATE applications
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE application_id = ?`,
      [status, id]
    );

    const updateResult = result as { affectedRows: number };

    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Application not found." },
        { status: 404 }
      );
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: "Application status updated successfully.",
      applicationId: id,
      status,
    });
  } catch (error) {
    console.error("Admin update application error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update application status." },
      { status: 500 }
    );
  }
}
