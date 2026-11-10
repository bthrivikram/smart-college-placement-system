"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Drive = {
  drive_id: number;
  total_applications: number;
  company_name: string;
  job_role: string;
  job_description: string | null;
  minimum_cgpa: number | null;
  eligible_department: string | null;
  eligible_graduation_year: number | null;
  job_location: string | null;
  salary_package: string | null;
  application_deadline: string;
  application_deadline_local: string;
  status: "OPEN" | "CLOSED";
  required_skills: string | null;
};

type Skill = {
  skill_id: number;
  skill_name: string;
};

type DriveForm = {
  company_name: string;
  job_role: string;
  job_description: string;
  minimum_cgpa: string;
  eligible_department: string;
  eligible_graduation_year: string;
  job_location: string;
  salary_package: string;
  application_deadline: string;
  status: "OPEN" | "CLOSED";
  skill_ids: number[];
};

const emptyForm: DriveForm = {
  company_name: "",
  job_role: "",
  job_description: "",
  minimum_cgpa: "",
  eligible_department: "",
  eligible_graduation_year: "",
  job_location: "",
  salary_package: "",
  application_deadline: "",
  status: "OPEN",
  skill_ids: [],
};

export default function PlacementDrivesPage() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [form, setForm] = useState<DriveForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [skillSearch, setSkillSearch] = useState("");

  const loadDrives = useCallback(async () => {
    const response = await fetch("/api/admin/placement-drives");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || data.message || "Could not load placement drives."
      );
    }

    setDrives(data.drives);
  }, []);

  const loadSkills = useCallback(async () => {
    const response = await fetch("/api/admin/skills");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Could not load available skills.");
    }

    setSkills(data.skills);
  }, []);

  useEffect(() => {
    async function loadPage() {
      try {
        await Promise.all([loadDrives(), loadSkills()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [loadDrives, loadSkills]);

  function updateField<K extends keyof DriveForm>(
    field: K,
    value: DriveForm[K]
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setSkillSearch("");
  }

  async function addNewSkill() {
    const skillName = skillSearch.trim();

    if (!skillName || addingSkill) return;

    setAddingSkill(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skill_name: skillName }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not add the skill.");
      }

      const newSkill: Skill = data.skill;

      setSkills((previous) => {
        const alreadyExists = previous.some(
          (skill) => skill.skill_id === newSkill.skill_id
        );

        if (alreadyExists) return previous;

        return [...previous, newSkill].sort((a, b) =>
          a.skill_name.localeCompare(b.skill_name)
        );
      });

      setForm((previous) => ({
        ...previous,
        skill_ids: previous.skill_ids.includes(newSkill.skill_id)
          ? previous.skill_ids
          : [...previous.skill_ids, newSkill.skill_id],
      }));

      setSkillSearch("");
      setMessage(`"${newSkill.skill_name}" added and selected successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the skill.");
    } finally {
      setAddingSkill(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const payload = {
        companyName: form.company_name,
        jobRole: form.job_role,
        jobDescription: form.job_description.trim() || null,
        minimumCgpa: form.minimum_cgpa
          ? Number(form.minimum_cgpa)
          : null,
        eligibleDepartment: form.eligible_department.trim() || null,
        eligibleGraduationYear: form.eligible_graduation_year
          ? Number(form.eligible_graduation_year)
          : null,
        jobLocation: form.job_location.trim() || null,
        salaryPackage: form.salary_package.trim() || null,

        // Send the exact local date/time selected in datetime-local.
        applicationDeadline: form.application_deadline,

        status: form.status,
        requiredSkillIds: form.skill_ids,
      };

      const response = await fetch("/api/admin/placement-drives", {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId === null
            ? payload
            : { ...payload, driveId: editingId }
        ),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Could not save the placement drive."
        );
      }

      setMessage(
        editingId === null
          ? "Placement drive created."
          : "Placement drive updated."
      );

      resetForm();
      await loadDrives();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(drive: Drive) {
    const requiredSkillNames = (drive.required_skills || "")
      .split(",")
      .map((name) => name.trim());

    const selectedSkillIds = skills
      .filter((skill) => requiredSkillNames.includes(skill.skill_name))
      .map((skill) => skill.skill_id);

    setForm({
      company_name: drive.company_name,
      job_role: drive.job_role,
      job_description: drive.job_description || "",
      minimum_cgpa: drive.minimum_cgpa?.toString() || "",
      eligible_department: drive.eligible_department || "",
      eligible_graduation_year:
        drive.eligible_graduation_year?.toString() || "",
      job_location: drive.job_location || "",
      salary_package: drive.salary_package || "",

      // Use the SQL-formatted local value. Do not use toISOString().
      application_deadline: drive.application_deadline_local
        ? drive.application_deadline_local.slice(0, 16)
        : "",

      status: drive.status,
      skill_ids: selectedSkillIds,
    });

    setEditingId(drive.drive_id);
    setSkillSearch("");
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteDrive(driveId: number) {
    if (!window.confirm("Delete this placement drive? This cannot be undone.")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/placement-drives?driveId=${driveId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not delete the drive.");
      }

      setMessage("Placement drive deleted.");
      await loadDrives();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the drive."
      );
    }
  }

  async function toggleStatus(drive: Drive) {
    const nextStatus = drive.status === "OPEN" ? "CLOSED" : "OPEN";

    const requiredSkillNames = (drive.required_skills || "")
      .split(",")
      .map((name) => name.trim());

    const requiredSkillIds = skills
      .filter((skill) => requiredSkillNames.includes(skill.skill_name))
      .map((skill) => skill.skill_id);

    const payload = {
      companyName: drive.company_name,
      jobRole: drive.job_role,
      jobDescription: drive.job_description || null,
      minimumCgpa:
        drive.minimum_cgpa === null ? null : Number(drive.minimum_cgpa),
      eligibleDepartment: drive.eligible_department,
      eligibleGraduationYear:
        drive.eligible_graduation_year === null
          ? null
          : Number(drive.eligible_graduation_year),
      jobLocation: drive.job_location,
      salaryPackage: drive.salary_package,

      // Preserve the exact local date/time.
      applicationDeadline: drive.application_deadline_local.slice(0, 16),

      status: nextStatus,
      requiredSkillIds,
      driveId: drive.drive_id,
    };

    try {
      const response = await fetch("/api/admin/placement-drives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not update drive status.");
      }

      setMessage(`Drive ${nextStatus.toLowerCase()}.`);
      setError("");
      await loadDrives();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  const filteredSkills = skills.filter((skill) =>
    skill.skill_name
      .toLowerCase()
      .includes(skillSearch.toLowerCase().trim())
  );

  const exactSkillExists = skills.some(
    (skill) =>
      skill.skill_name.toLowerCase() === skillSearch.trim().toLowerCase()
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin/dashboard"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Admin Dashboard
        </a>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Placement Drive Management
        </h1>

        <p className="mt-2 text-gray-600">
          Create and manage company recruitment drives.
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-100 p-3 text-red-800"
          >
            {error}
          </p>
        )}

        <section className="mt-8 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            {editingId === null
              ? "Create Placement Drive"
              : "Edit Placement Drive"}
          </h2>

          <form
            onSubmit={submitForm}
            className="mt-5 grid gap-5 md:grid-cols-2"
          >
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Company name *
              </span>
              <input
                required
                maxLength={150}
                value={form.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Job role *
              </span>
              <input
                required
                maxLength={150}
                value={form.job_role}
                onChange={(e) => updateField("job_role", e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Job description
              </span>
              <textarea
                rows={4}
                value={form.job_description}
                onChange={(e) =>
                  updateField("job_description", e.target.value)
                }
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Minimum CGPA (0–10)
              </span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={form.minimum_cgpa}
                onChange={(e) => updateField("minimum_cgpa", e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Eligible Departments (comma-separated)
              </span>
              <input
                value={form.eligible_department}
                onChange={(e) =>
                  updateField("eligible_department", e.target.value)
                }
                placeholder="e.g. CSE, AIML, ISE"
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Eligible graduation year
              </span>
              <input
                type="number"
                min="2000"
                max="2100"
                value={form.eligible_graduation_year}
                onChange={(e) =>
                  updateField("eligible_graduation_year", e.target.value)
                }
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Job location
              </span>
              <input
                value={form.job_location}
                onChange={(e) => updateField("job_location", e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Salary package
              </span>
              <input
                value={form.salary_package}
                onChange={(e) => updateField("salary_package", e.target.value)}
                placeholder="e.g. 8 LPA"
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Application deadline *
              </span>
              <input
                type="datetime-local"
                required
                value={form.application_deadline}
                onChange={(e) =>
                  updateField("application_deadline", e.target.value)
                }
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Status
              </span>
              <select
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value as "OPEN" | "CLOSED")
                }
                className="mt-1 w-full rounded-lg border p-3"
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>

            {/* Required Skills */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Required Skills
              </label>

              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 hover:border-blue-500">
                  <span className="text-gray-700">
                    {form.skill_ids.length === 0
                      ? "Search and select skills"
                      : `${form.skill_ids.length} skills selected`}
                  </span>
                  <span className="text-gray-500 group-open:rotate-180">
                    ▼
                  </span>
                </summary>

                <div className="absolute z-30 mt-2 w-full rounded-lg border bg-white shadow-lg">
                  <div className="border-b p-3">
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Search or add a skill..."
                      className="w-full rounded-lg border p-2 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto p-2">
                    {filteredSkills.map((skill) => (
                      <label
                        key={skill.skill_id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.skill_ids.includes(skill.skill_id)}
                          onChange={(e) => {
                            updateField(
                              "skill_ids",
                              e.target.checked
                                ? [...form.skill_ids, skill.skill_id]
                                : form.skill_ids.filter(
                                    (id) => id !== skill.skill_id
                                  )
                            );
                          }}
                          className="h-4 w-4 accent-blue-600"
                        />

                        <span className="text-sm text-gray-700">
                          {skill.skill_name}
                        </span>
                      </label>
                    ))}

                    {skillSearch.trim() && !exactSkillExists && (
                      <button
                        type="button"
                        onClick={() => void addNewSkill()}
                        disabled={addingSkill}
                        className="mt-2 w-full rounded-md bg-blue-50 px-3 py-3 text-left text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {addingSkill
                          ? "Adding skill..."
                          : `+ Add "${skillSearch.trim()}" as a new skill`}
                      </button>
                    )}

                    {filteredSkills.length === 0 && !skillSearch.trim() && (
                      <p className="p-3 text-sm text-gray-500">
                        No skills available.
                      </p>
                    )}
                  </div>
                </div>
              </details>

              {form.skill_ids.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills
                    .filter((skill) => form.skill_ids.includes(skill.skill_id))
                    .map((skill) => (
                      <span
                        key={skill.skill_id}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        {skill.skill_name}

                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              "skill_ids",
                              form.skill_ids.filter(
                                (id) => id !== skill.skill_id
                              )
                            )
                          }
                          className="font-bold hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId === null
                    ? "Create Drive"
                    : "Save Changes"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border px-5 py-3 hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Existing Placement Drives */}
        <section className="mt-8 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Existing Placement Drives
          </h2>

          {loading ? (
            <p className="mt-4 text-gray-600">Loading drives...</p>
          ) : drives.length === 0 ? (
            <p className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-600">
              No placement drives yet. Create your first drive using the form above.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {drives.map((drive) => (
                <article
                  key={drive.drive_id}
                  className="rounded-lg border p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {drive.company_name} — {drive.job_role}
                      </h3>

                      {/* Application count maintained by MySQL trigger */}
                      <p className="mt-2 text-sm font-semibold text-blue-700">
                        Total applications: {drive.total_applications ?? 0}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {drive.job_location || "Location not specified"} ·{" "}
                        {drive.salary_package || "Package not specified"}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        Minimum CGPA: {drive.minimum_cgpa ?? "Not specified"} ·{" "}
                        Department: {drive.eligible_department || "All"} ·{" "}
                        Graduation year: {drive.eligible_graduation_year ?? "All"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        drive.status === "OPEN"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {drive.status}
                    </span>
                  </div>

                  {drive.job_description && (
                    <p className="mt-3 whitespace-pre-wrap text-gray-700">
                      {drive.job_description}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-gray-600">
                    Required skills: {drive.required_skills || "Not specified"}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Application deadline:{" "}
                    {drive.application_deadline_local.replace("T", " ")}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(drive)}
                      className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleStatus(drive)}
                      className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                    >
                      {drive.status === "OPEN" ? "Close Drive" : "Reopen Drive"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteDrive(drive.drive_id)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}