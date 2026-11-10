
import { requireAuth } from "@/lib/auth";
import { connection } from "next/server";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export const instant = false;

export default async function AdminDashboard() {
  await connection();
  await requireAuth("ADMIN");

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Manage placement activities in PlaceSmart.
        </p>

        <LogoutButton />

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Registered Students */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">Registered Students</h2>
            <p className="mt-2 text-gray-600">
              View registered students, academic details, and resume status.
            </p>
            <Link
              href="/admin/registered-students"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              View Registered Students
            </Link>
          </div>

          {/* Companies and Placement Drives */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">
              Companies & Jobs
            </h2>

            <p className="mt-2 text-gray-600">
              Manage companies, jobs, and placement drives.
            </p>

            <Link
              href="/admin/placement-drives"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Manage Placement Drives
            </Link>
          </div>

          {/* Applications */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">
              Applications
            </h2>

            <p className="mt-2 text-gray-600">
              Review student applications and update their placement status.
            </p>

            <Link
              href="/admin/applications"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Manage Applications
            </Link>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
