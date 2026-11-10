
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface StudentProfile {
  full_name: string;
  email: string;
  srn: string;
  phone: string | null;
  department: string | null;
  cgpa: number | null;
  graduation_year: number | null;
}

export default function StudentProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/student/profile");
        const data = await response.json();

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load profile.");
        }

        const p: StudentProfile = data.profile;

        setProfile(p);
        setPhone(p.phone ?? "");
        setDepartment(p.department ?? "");
        setCgpa(p.cgpa == null ? "" : String(p.cgpa));
        setGraduationYear(
          p.graduation_year == null ? "" : String(p.graduation_year)
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const parsedCgpa = cgpa.trim() === "" ? null : Number(cgpa);
    const parsedYear =
      graduationYear.trim() === "" ? null : Number(graduationYear);

    if (
      parsedCgpa !== null &&
      (!Number.isFinite(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10)
    ) {
      setError("CGPA must be between 0 and 10.");
      setSaving(false);
      return;
    }

    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) ||
        parsedYear < 1901 ||
        parsedYear > 2155)
    ) {
      setError("Enter a valid graduation year.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || null,
          department: department.trim() || null,
          cgpa: parsedCgpa,
          graduationYear: parsedYear,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile.");
      }

      const p: StudentProfile = data.profile;

      setProfile(p);
      setPhone(p.phone ?? "");
      setDepartment(p.department ?? "");
      setCgpa(p.cgpa == null ? "" : String(p.cgpa));
      setGraduationYear(
        p.graduation_year == null ? "" : String(p.graduation_year)
      );

      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="mt-4 text-red-600">
            {error || "Unable to load your profile."}
          </p>
          <Link
            href="/student/dashboard"
            className="mt-6 inline-block text-blue-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">
            View and update your student information.
          </p>
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Student Information</h2>

            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setError("");
                  setEditing(true);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Full Name
                </label>
                <p className="rounded-lg bg-gray-100 p-3 text-gray-900">
                  {profile.full_name}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Email
                </label>
                <p className="break-all rounded-lg bg-gray-100 p-3 text-gray-900">
                  {profile.email}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  SRN
                </label>
                <p className="rounded-lg bg-gray-100 p-3 text-gray-900">
                  {profile.srn}
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-sm font-medium text-gray-600"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  maxLength={20}
                  value={phone}
                  disabled={!editing || saving}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-lg border border-gray-300 p-3 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="department"
                  className="mb-1 block text-sm font-medium text-gray-600"
                >
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  maxLength={100}
                  value={department}
                  disabled={!editing || saving}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. CSE (AIML)"
                  className="w-full rounded-lg border border-gray-300 p-3 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cgpa"
                  className="mb-1 block text-sm font-medium text-gray-600"
                >
                  CGPA (out of 10)
                </label>
                <input
                  id="cgpa"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  value={cgpa}
                  disabled={!editing || saving}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="e.g. 9.4"
                  className="w-full rounded-lg border border-gray-300 p-3 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="graduationYear"
                  className="mb-1 block text-sm font-medium text-gray-600"
                >
                  Graduation Year
                </label>
                <input
                  id="graduationYear"
                  type="number"
                  min="1901"
                  max="2155"
                  step="1"
                  value={graduationYear}
                  disabled={!editing || saving}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2028"
                  className="w-full rounded-lg border border-gray-300 p-3 disabled:bg-gray-100"
                />
              </div>
            </div>

            {editing && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setPhone(profile.phone ?? "");
                    setDepartment(profile.department ?? "");
                    setCgpa(
                      profile.cgpa == null ? "" : String(profile.cgpa)
                    );
                    setGraduationYear(
                      profile.graduation_year == null
                        ? ""
                        : String(profile.graduation_year)
                    );
                    setEditing(false);
                    setError("");
                    setMessage("");
                  }}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
