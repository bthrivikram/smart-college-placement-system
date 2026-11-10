
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "REJECTED"
  | "SELECTED";

interface Application {
  applicationId: number;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  driveId: number;
  companyName: string;
  jobRole: string;
  jobLocation: string | null;
  salaryPackage: string | null;
  applicationDeadline: string;
  driveStatus: "OPEN" | "CLOSED";
}

interface ApiResponse {
  success: boolean;
  message?: string;
  applications?: Application[];
}

const statusStyles: Record<ApplicationStatus, string> = {
  APPLIED: "bg-blue-100 text-blue-800",
  SHORTLISTED: "bg-purple-100 text-purple-800",
  REJECTED: "bg-red-100 text-red-800",
  SELECTED: "bg-green-100 text-green-800",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplications() {
      try {
        const response = await fetch("/api/student/applications");
        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || "Unable to load your applications.");
          return;
        }

        setApplications(data.applications ?? []);
      } catch {
        setError("Could not connect to the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  const counts = {
    total: applications.length,
    applied: applications.filter((a) => a.status === "APPLIED").length,
    shortlisted: applications.filter(
      (a) => a.status === "SHORTLISTED"
    ).length,
    selected: applications.filter((a) => a.status === "SELECTED").length,
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/student/dashboard"
              className="text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-5 text-3xl font-bold text-gray-900">
              My Applications
            </h1>

            <p className="mt-2 text-gray-600">
              Track your placement applications and their current status.
            </p>
          </div>

          <Link
            href="/student/jobs"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Browse Jobs
          </Link>
        </div>

        {loading && (
          <p className="mt-8 text-gray-600">
            Loading your applications...
          </p>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
            {error.toLowerCase().includes("log in") && (
              <Link href="/login" className="ml-2 underline">
                Log in
              </Link>
            )}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Application summary */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total Applications",
                  value: counts.total,
                  style: "bg-white",
                },
                {
                  label: "Awaiting Review",
                  value: counts.applied,
                  style: "bg-blue-50",
                },
                {
                  label: "Shortlisted",
                  value: counts.shortlisted,
                  style: "bg-purple-50",
                },
                {
                  label: "Selected",
                  value: counts.selected,
                  style: "bg-green-50",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl p-5 shadow ${item.style}`}
                >
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {applications.length === 0 ? (
              <div className="mt-8 rounded-xl bg-white p-10 text-center shadow">
                <h2 className="text-xl font-semibold text-gray-800">
                  No applications yet
                </h2>

                <p className="mt-2 text-gray-600">
                  Browse available placement drives and apply for suitable
                  opportunities.
                </p>

                <Link
                  href="/student/jobs"
                  className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Explore Jobs
                </Link>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {applications.map((application) => (
                  <article
                    key={application.applicationId}
                    className="rounded-xl bg-white p-6 shadow transition hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {application.jobRole}
                        </h2>

                        <p className="mt-1 font-medium text-gray-600">
                          {application.companyName}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          statusStyles[application.status]
                        }`}
                      >
                        {application.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 text-sm text-gray-700 sm:grid-cols-2">
                      {application.jobLocation && (
                        <p>
                          <strong>Location:</strong>{" "}
                          {application.jobLocation}
                        </p>
                      )}

                      {application.salaryPackage && (
                        <p>
                          <strong>Package:</strong>{" "}
                          {application.salaryPackage}
                        </p>
                      )}

                      <p>
                        <strong>Applied on:</strong>{" "}
                        {formatDate(application.appliedAt)}
                      </p>

                      <p>
                        <strong>Last updated:</strong>{" "}
                        {formatDate(application.updatedAt)}
                      </p>

                      <p>
                        <strong>Application deadline:</strong>{" "}
                        {formatDate(application.applicationDeadline)}
                      </p>

                      <p>
                        <strong>Drive status:</strong>{" "}
                        {application.driveStatus}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-500">
                        Application ID: {application.applicationId}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        {application.status === "APPLIED"
                          ? "Your application has been submitted and is awaiting review."
                          : application.status === "SHORTLISTED"
                            ? "Congratulations! You have been shortlisted."
                            : application.status === "SELECTED"
                              ? "Congratulations! You have been selected."
                              : "Your application was rejected."}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
