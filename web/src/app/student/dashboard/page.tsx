
import { requireAuth } from "@/lib/auth";
import { connection } from "next/server";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export const instant = false;

export default async function StudentDashboard() {
  await connection();
  await requireAuth("STUDENT");

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Student Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome to PlaceSmart! Manage your placement journey here.
        </p>

        <div className="mt-4">
          <LogoutButton />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">

          {/* My Profile */}
          <Link
            href="/student/profile"
            className="block rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold">My Profile</h2>
            <p className="mt-2 text-gray-600">
              View and update your student details.
            </p>
            <span className="mt-4 inline-block text-blue-600">
              View Profile →
            </span>
          </Link>

          {/* Resume Management */}
          <Link
            href="/student/resume"
            className="block rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold">Resume</h2>
            <p className="mt-2 text-gray-600">
              Upload, download, replace, or delete your resume.
            </p>
            <span className="mt-4 inline-block text-blue-600">
              Manage Resume →
            </span>
          </Link>

          {/* Skills Management - NEW */}
          <Link
            href="/student/skills"
            className="block rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold">My Skills</h2>
            <p className="mt-2 text-gray-600">
              Add and manage your technical skills for placements.
            </p>
            <span className="mt-4 inline-block text-blue-600">
              Manage Skills →
            </span>
          </Link>

          {/* Job Opportunities */}
          <Link
            href="/student/jobs"
            className="block rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold">Job Opportunities</h2>
            <p className="mt-2 text-gray-600">
              Explore placement drives, view job details, and check your eligibility.
            </p>
            <span className="mt-4 inline-block text-blue-600">
              Explore Jobs →
            </span>
          </Link>

          
          {/* My Applications */}
          <Link
            href="/student/applications"
            className="block rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold">My Applications</h2>
            <p className="mt-2 text-gray-600">
              Track your placement applications and view their current status.
            </p>
            <span className="mt-4 inline-block text-blue-600">
              View Applications →
            </span>
          </Link>


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
