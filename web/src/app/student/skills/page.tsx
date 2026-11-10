
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type SyntheticEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface StudentSkill {
  skill_id: number;
  skill_name: string;
  added_at: string;
}

export default function StudentSkillsPage() {
  const router = useRouter();

  const [skills, setSkills] = useState<StudentSkill[]>([]);
  const [skillName, setSkillName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSkills = useCallback(async () => {
    try {
      const response = await fetch("/api/student/skills", {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load skills.");
      }

      setSkills(data.skills);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load skills."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  async function handleAddSkill(
    event: SyntheticEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = skillName.trim();

    if (!name) {
      setError("Please enter a skill name.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/student/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: name }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to add skill.");
      }

      setSkillName("");
      setMessage(data.message);
      await loadSkills();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to add skill."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveSkill(skillId: number) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/student/skills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to remove skill.");
      }

      setMessage(data.message);
      await loadSkills();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove skill."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your skills...</p>
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
          Skills Management
        </h1>

        <p className="mt-2 text-gray-600">
          Maintain your technical skills for placement opportunities.
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
          <h2 className="text-xl font-semibold">Add a Skill</h2>

          <form onSubmit={handleAddSkill} className="mt-4">
            <label
              htmlFor="skillName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Skill name
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="skillName"
                type="text"
                maxLength={100}
                value={skillName}
                disabled={busy}
                onChange={(event) => setSkillName(event.target.value)}
                placeholder="e.g. Python, SQL, React"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />

              <button
                type="submit"
                disabled={busy || !skillName.trim()}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Please wait..." : "Add Skill"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">My Skills</h2>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {skills.length} {skills.length === 1 ? "skill" : "skills"}
            </span>
          </div>

          {skills.length === 0 ? (
            <p className="mt-5 rounded-lg bg-gray-50 p-4 text-gray-600">
              You haven&apos;t added any skills yet. Add your first skill above.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-gray-100">
              {skills.map((skill) => (
                <li
                  key={skill.skill_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">
                      {skill.skill_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Added{" "}
                      {new Date(skill.added_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemoveSkill(skill.skill_id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-5 text-sm text-gray-500">
          Tip: Add relevant skills such as programming languages, databases,
          frameworks, and machine learning tools. Only add skills you can
          honestly claim.
        </p>
      </section>
    </main>
  );
}
