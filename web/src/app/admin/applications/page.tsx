
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "REJECTED"
  | "SELECTED";

type Application = {
  applicationId: number;
  applicationStatus: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  studentId: number;
  studentName: string;
  srn: string;
  studentEmail: string;
  department: string | null;
  cgpa: number | string | null;
  graduationYear: number | null;
  driveId: number;
  companyName: string;
  jobRole: string;
};

const statuses: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "REJECTED",
  "SELECTED",
];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState("ALL");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/applications");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load applications.");
      }

      setApplications(data.applications);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function updateStatus(
    applicationId: number,
    newStatus: ApplicationStatus
  ) {
    setUpdatingId(applicationId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update status.");
      }

      setApplications((current) =>
        current.map((application) =>
          application.applicationId === applicationId
            ? {
                ...application,
                applicationStatus: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : application
        )
      );

      setMessage(
        `Application #${applicationId} updated to ${newStatus}.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredApplications =
    filter === "ALL"
      ? applications
      : applications.filter(
          (application) => application.applicationStatus === filter
        );

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p>Loading applications...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Applications</h1>
          <p className="mt-2 text-gray-600">
            Review student applications and update their status.
          </p>
        </div>

        <Link
        href="/admin/dashboard"
        className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
        >
        ← Back to Dashboard
        </Link>

        <button
          onClick={() => void loadApplications()}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">
          {message}
        </p>
      )}

      <div className="mb-6 rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">Total applications</p>
        <p className="mt-1 text-3xl font-bold">
          {applications.length}
        </p>

        <label className="mt-4 block text-sm font-medium">
          Filter by status
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="mt-2 rounded-lg border px-3 py-2"
        >
          <option value="ALL">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow">
          No applications found for this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Student",
                  "Academic Details",
                  "Placement Drive",
                  "Applied On",
                  "Status",
                  "Update Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <tr key={application.applicationId}>
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold">
                      {application.studentName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {application.srn}
                    </p>
                    <p className="text-sm text-gray-600">
                      {application.studentEmail}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Application #{application.applicationId}
                    </p>
                  </td>

                  <td className="px-5 py-4 align-top text-sm">
                    <p>{application.department || "Not provided"}</p>
                    <p>CGPA: {application.cgpa ?? "N/A"}</p>
                    <p>
                      Graduation: {application.graduationYear ?? "N/A"}
                    </p>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold">
                      {application.companyName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {application.jobRole}
                    </p>
                  </td>

                  <td className="px-5 py-4 align-top text-sm">
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {application.applicationStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <select
                      value={application.applicationStatus}
                      disabled={updatingId === application.applicationId}
                      onChange={(event) =>
                        void updateStatus(
                          application.applicationId,
                          event.target.value as ApplicationStatus
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {updatingId === application.applicationId && (
                      <p className="mt-1 text-xs text-gray-500">
                        Updating...
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
