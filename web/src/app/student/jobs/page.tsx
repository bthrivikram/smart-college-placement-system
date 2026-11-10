
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface JobSkill {
  skill_id: number;
  skill_name: string;
}

interface Drive {
  driveId: number;
  companyName: string;
  jobRole: string;
  jobDescription: string | null;
  minimumCgpa: number | null;
  eligibleDepartment: string | null;
  eligibleGraduationYear: number | null;
  jobLocation: string | null;
  salaryPackage: string | null;
  applicationDeadline: string;
  status: "OPEN" | "CLOSED";
  requiredSkills: JobSkill[];
  matchedSkills: string[];
  missingSkills: string[];
  isOpen: boolean;
  eligible: boolean;
  reasons: string[];

  // Resume matching information
  resumeRelevanceScore?: number | null;
  resumeMissingSkills?: string[];
  matchAvailable?: boolean;
}

interface MatchApiResponse {
  success: boolean;
  message?: string;
  match?: {
    success: boolean;
    final_score: number | null;
    missing_skills: string[];
  };
}

interface ApiResponse {
  success: boolean;
  message?: string;
  drives?: Drive[];
}

interface ApplicationMessage {
  type: "success" | "error";
  text: string;
}

export default function StudentJobsPage() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applyingDriveId, setApplyingDriveId] = useState<number | null>(
    null
  );

  const [applicationMessages, setApplicationMessages] = useState<
    Record<number, ApplicationMessage>
  >({});

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/student/jobs");
        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || "Unable to load job opportunities.");
          return;
        }

        // Fetch resume matching information for each drive.
        const drivesWithMatches = await Promise.all(
          (data.drives ?? []).map(async (drive): Promise<Drive> => {
            try {
              const matchResponse = await fetch("/api/student/match", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  driveId: drive.driveId,
                }),
              });

              const matchData: MatchApiResponse =
                await matchResponse.json();

              if (
                !matchResponse.ok ||
                !matchData.success ||
                !matchData.match?.success
              ) {
                return {
                  ...drive,
                  resumeRelevanceScore: null,
                  resumeMissingSkills: [],
                  matchAvailable: false,
                };
              }

              return {
                ...drive,
                resumeRelevanceScore: matchData.match.final_score,
                resumeMissingSkills:
                  matchData.match.missing_skills ?? [],
                matchAvailable: true,
              };
            } catch {
              return {
                ...drive,
                resumeRelevanceScore: null,
                resumeMissingSkills: [],
                matchAvailable: false,
              };
            }
          })
        );

        setDrives(drivesWithMatches);
      } catch {
        setError("Could not connect to the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  async function handleApply(driveId: number) {
    setApplyingDriveId(driveId);

    setApplicationMessages((previous) => {
      const updated = { ...previous };
      delete updated[driveId];
      return updated;
    });

    try {
      const response = await fetch(
        `/api/student/jobs/${driveId}/apply`,
        {
          method: "POST",
        }
      );

      const data: { success: boolean; message?: string } =
        await response.json();

      const succeeded = response.ok && data.success;

      setApplicationMessages((previous) => ({
        ...previous,
        [driveId]: {
          type: succeeded ? "success" : "error",
          text:
            data.message ||
            (succeeded
              ? "Application submitted successfully!"
              : "Unable to submit your application."),
        },
      }));
    } catch {
      setApplicationMessages((previous) => ({
        ...previous,
        [driveId]: {
          type: "error",
          text: "Could not connect to the server. Please try again.",
        },
      }));
    } finally {
      setApplyingDriveId(null);
    }
  }

  const filteredDrives = drives.filter((drive) => {
    if (filter === "ELIGIBLE") return drive.eligible;
    if (filter === "OPEN") return drive.isOpen;
    return true;
  });

  function formatDeadline(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/student/dashboard"
          className="text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-gray-900">
          Job Opportunities
        </h1>

        <p className="mt-2 text-gray-600">
          Explore placement drives, check your eligibility, and apply for
          suitable opportunities.
        </p>

        {/* Job filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            {
              value: "ALL",
              label: `All Drives (${drives.length})`,
            },
            {
              value: "OPEN",
              label: `Open Drives (${
                drives.filter((drive) => drive.isOpen).length
              })`,
            },
            {
              value: "ELIGIBLE",
              label: `Eligible (${
                drives.filter((drive) => drive.eligible).length
              })`,
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === option.value
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <p className="mt-8 text-gray-600">
            Loading placement drives and resume matches...
          </p>
        )}

        {/* Error while loading jobs */}
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

        {/* Empty state */}
        {!loading && !error && filteredDrives.length === 0 && (
          <div className="mt-8 rounded-xl bg-white p-8 text-center shadow">
            <h2 className="text-xl font-semibold text-gray-800">
              No placement drives found
            </h2>

            <p className="mt-2 text-gray-600">
              {filter === "ELIGIBLE"
                ? "No drives currently match all your eligibility criteria."
                : filter === "OPEN"
                  ? "There are no open placement drives right now."
                  : "Placement drives will appear here when the admin creates them."}
            </p>
          </div>
        )}

        {/* Placement drive cards */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {filteredDrives.map((drive) => {
            const applicationMessage =
              applicationMessages[drive.driveId];

            const isApplying =
              applyingDriveId === drive.driveId;

            const canApply = drive.eligible && drive.isOpen;

            return (
              <article
                key={drive.driveId}
                className="rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
              >
                {/* Company and job title */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {drive.jobRole}
                    </h2>

                    <p className="mt-1 font-medium text-gray-600">
                      {drive.companyName}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      !drive.isOpen
                        ? "bg-gray-100 text-gray-700"
                        : drive.eligible
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {!drive.isOpen
                      ? "Closed"
                      : drive.eligible
                        ? "Eligible"
                        : "Check Requirements"}
                  </span>
                </div>

                {/* Job description */}
                {drive.jobDescription && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {drive.jobDescription}
                  </p>
                )}

                {/* Job details */}
                <div className="mt-5 space-y-2 text-sm text-gray-700">
                  {drive.jobLocation && (
                    <p>
                      <strong>Location:</strong> {drive.jobLocation}
                    </p>
                  )}

                  {drive.salaryPackage && (
                    <p>
                      <strong>Package:</strong> {drive.salaryPackage}
                    </p>
                  )}

                  {drive.minimumCgpa !== null && (
                    <p>
                      <strong>Minimum CGPA:</strong>{" "}
                      {drive.minimumCgpa}
                    </p>
                  )}

                  {drive.eligibleDepartment && (
                    <p>
                      <strong>Eligible departments:</strong>{" "}
                      {drive.eligibleDepartment}
                    </p>
                  )}

                  {drive.eligibleGraduationYear !== null && (
                    <p>
                      <strong>Graduation year:</strong>{" "}
                      {drive.eligibleGraduationYear}
                    </p>
                  )}

                  <p>
                    <strong>Application deadline:</strong>{" "}
                    {formatDeadline(drive.applicationDeadline)}
                  </p>
                </div>

                {/* Resume matching information */}
                <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Resume Matching
                  </h3>

                  {drive.matchAvailable ? (
                    <>
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          Resume relevance score
                        </p>

                        <p className="mt-1 text-2xl font-bold text-blue-700">
                          {drive.resumeRelevanceScore !== null &&
                          drive.resumeRelevanceScore !== undefined
                            ? `${drive.resumeRelevanceScore.toFixed(2)}/100`
                            : "Not available"}
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-800">
                          Missing required skills
                        </p>

                        {drive.resumeMissingSkills &&
                        drive.resumeMissingSkills.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {drive.resumeMissingSkills.map(
                              (skill, index) => (
                                <span
                                  key={`${skill}-${index}`}
                                  className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-800"
                                >
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-green-700">
                            No missing required skills detected.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">
                      Resume matching is unavailable. Please ensure
                      that you have uploaded a resume.
                    </p>
                  )}

                  <p className="mt-3 text-xs text-gray-500">
                    Matching information is for reference only. It does
                    not affect your placement eligibility or ability to
                    apply.
                  </p>
                </div>

                {/* Eligibility information */}
                {drive.eligible ? (
                  <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                    You meet all the configured eligibility criteria.
                  </p>
                ) : (
                  drive.reasons.length > 0 && (
                    <div className="mt-5 rounded-lg bg-yellow-50 p-3">
                      <p className="text-sm font-semibold text-yellow-900">
                        Eligibility details
                      </p>

                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-800">
                        {drive.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )
                )}

                {/* Application response message */}
                {applicationMessage && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`mt-4 rounded-lg p-3 text-sm ${
                      applicationMessage.type === "success"
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {applicationMessage.text}
                  </p>
                )}

                {/* Apply button */}
                <button
                  type="button"
                  onClick={() => handleApply(drive.driveId)}
                  disabled={!canApply || applyingDriveId !== null}
                  className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                >
                  {isApplying
                    ? "Submitting..."
                    : !drive.isOpen
                      ? "Applications Closed"
                      : !drive.eligible
                        ? "Not Eligible"
                        : applicationMessage?.type === "success"
                          ? "Applied Successfully"
                          : "Apply Now"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
