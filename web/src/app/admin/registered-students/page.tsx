
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Student = {
  studentId: number;
  fullName: string;
  srn: string;
  email: string;
  phone: string | null;
  department: string | null;
  cgpa: number | string | null;
  graduationYear: number | null;
  registeredAt: string | null;
  hasResume: boolean;
};

export default function RegisteredStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [graduationYear, setGraduationYear] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/registered-students");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load students.");
      }

      setStudents(data.students);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const departments = Array.from(
    new Set(
      students
        .map((student) => student.department)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const graduationYears = Array.from(
    new Set(
      students
        .map((student) => student.graduationYear)
        .filter((value): value is number => value !== null)
    )
  ).sort((a, b) => a - b);

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      student.fullName.toLowerCase().includes(query) ||
      student.srn.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query);

    const matchesDepartment =
      department === "ALL" || student.department === department;

    const matchesYear =
      graduationYear === "ALL" ||
      String(student.graduationYear) === graduationYear;

    return matchesSearch && matchesDepartment && matchesYear;
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Registered Students
            </h1>
            <p className="mt-2 text-gray-600">
              View and search students registered on PlaceSmart.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              ← Back to Dashboard
            </Link>

            <button
              onClick={() => void loadStudents()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Total Registered Students</p>
            <p className="mt-2 text-3xl font-bold">{students.length}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">With Resumes</p>
            <p className="mt-2 text-3xl font-bold">
              {students.filter((student) => student.hasResume).length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Without Resumes</p>
            <p className="mt-2 text-3xl font-bold">
              {students.filter((student) => !student.hasResume).length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Showing Results</p>
            <p className="mt-2 text-3xl font-bold">
              {filteredStudents.length}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl bg-white p-5 shadow md:grid-cols-3">
          <div>
            <label
              htmlFor="studentSearch"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Search students
            </label>
            <input
              id="studentSearch"
              type="text"
              placeholder="Search name, SRN, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="departmentFilter"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Department
            </label>
            <select
              id="departmentFilter"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="ALL">All Departments</option>
              {departments.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="graduationFilter"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Graduation Year
            </label>
            <select
              id="graduationFilter"
              value={graduationYear}
              onChange={(event) => setGraduationYear(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="ALL">All Years</option>
              {graduationYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center shadow">
            Loading registered students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
            No students found matching your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    "Student",
                    "Contact",
                    "Academic Details",
                    "Resume",
                    "Registered On",
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
                {filteredStudents.map((student) => (
                  <tr key={student.studentId}>
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-gray-900">
                        {student.fullName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        SRN: {student.srn}
                      </p>
                    </td>

                    <td className="px-5 py-4 align-top text-sm">
                      <p>{student.email}</p>
                      <p className="mt-1 text-gray-500">
                        {student.phone || "Phone not provided"}
                      </p>
                    </td>

                    <td className="px-5 py-4 align-top text-sm">
                      <p>Department: {student.department || "Not provided"}</p>
                      <p className="mt-1">
                        CGPA: {student.cgpa ?? "N/A"}
                      </p>
                      <p className="mt-1">
                        Graduation: {student.graduationYear ?? "N/A"}
                      </p>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          student.hasResume
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {student.hasResume ? "Uploaded" : "Not uploaded"}
                      </span>
                    </td>

                    <td className="px-5 py-4 align-top text-sm text-gray-600">
                      {student.registeredAt
                        ? new Date(student.registeredAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
