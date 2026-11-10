
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface ResumeInfo {
  resumeId: number;
  filename: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
}

export default function StudentResumePage() {
  const router = useRouter();

  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadResume = useCallback(async () => {
    try {
      const response = await fetch("/api/student/resume", {
        cache: "no-store",
      });
      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load resume.");
      }

      setResume(data.resume);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load resume."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadResume();
  }, [loadResume]);

  async function uploadResume() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/student/resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Upload failed.");
      }

      setMessage(data.message);
      setFile(null);

      const input = document.getElementById(
        "resume-file"
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      await loadResume();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteResume() {
    if (!window.confirm("Are you sure you want to delete your resume?")) {
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/student/resume", {
        method: "DELETE",
      });
      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Delete failed.");
      }

      setResume(null);
      setFile(null);
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function formatSize(bytes: number) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading resume details...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-4 shadow-sm">
        <Link
          href="/student/dashboard"
          className="text-xl font-bold text-blue-700"
        >
          PlaceSmart
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/student/dashboard"
            className="text-sm text-gray-600 hover:text-blue-700"
          >
            Dashboard
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Resume Management
        </h1>
        <p className="mt-2 text-gray-600">
          Upload and manage the resume used for your placement applications.
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Your Current Resume</h2>

          {resume ? (
            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <p className="break-all font-medium text-gray-900">
                {resume.filename}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Size: {formatSize(resume.fileSize)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Uploaded: {new Date(resume.uploadedAt).toLocaleString()}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={resume.downloadUrl}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Download Resume
                </a>

                <button
                  type="button"
                  disabled={busy}
                  onClick={deleteResume}
                  className="rounded-lg border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete Resume
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-600">
              You have not uploaded a resume yet.
            </p>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold">
              {resume ? "Replace Resume" : "Upload Resume"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              PDF only. Maximum file size: 5 MB.
            </p>

            <input
              id="resume-file"
              type="file"
              accept=".pdf,application/pdf"
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage("");
                setError("");
              }}
              className="mt-4 block w-full rounded-lg border border-gray-300 p-3 text-sm disabled:opacity-60"
            />

            {file && (
              <p className="mt-2 break-all text-sm text-gray-600">
                Selected: {file.name} ({formatSize(file.size)})
              </p>
            )}

            <button
              type="button"
              disabled={busy || !file}
              onClick={uploadResume}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Please wait..."
                : resume
                  ? "Upload Replacement"
                  : "Upload Resume"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
