
import Link from "next/link";
import { connection } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export const instant = false;

interface OfferCountRow extends RowDataPacket {
  totalOffers: number;
}

export default async function Home() {
  await connection();

  let totalOffers = 0;

  try {
    const [rows] = await pool.query<OfferCountRow[]>(
      `SELECT total_offers AS totalOffers
       FROM placement_statistics
       WHERE statistic_id = 1`
    );

    totalOffers = Number(rows[0]?.totalOffers ?? 0);
  } catch (error) {
    console.error("Failed to fetch total offers:", error);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation bar */}
      <nav className="flex items-center justify-between border-b bg-white px-6 py-5 md:px-10">
        <Link href="/" className="block">
          <h1 className="text-xl font-bold text-blue-700">
            PlaceSmart
          </h1>
          <p className="text-xs text-slate-500">
            College Placement Management
          </p>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Register
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:px-10 md:py-28">
        <div>
          <p className="mb-5 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            Smart Placements. Better Careers.
          </p>

          <h2 className="text-4xl font-bold leading-tight md:text-5xl">
            Your next opportunity starts here.
          </h2>

          <p className="mt-6 max-w-lg leading-7 text-slate-600">
            Discover job opportunities, match your resume with job
            requirements, identify skill gaps, and track your placement
            journey in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800"
            >
              Explore Opportunities
            </Link>

            <Link
              href="/register"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-100"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Total offers received */}
        <div className="rounded-2xl border border-slate-300 bg-white p-8 shadow-sm md:p-10">
          <h3 className="text-xl font-semibold">
            Placement Dashboard
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Your placement journey, organized.
          </p>

          <div className="mt-8 rounded-xl bg-blue-50 p-8">
            <p className="text-base font-medium text-slate-600">
              Total Offers Received
            </p>

            <p className="mt-3 text-5xl font-bold text-blue-700">
              {totalOffers}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Students selected for placement opportunities
            </p>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            Live count based on applications marked as Selected.
          </p>
        </div>
      </section>

      {/* Features section */}
      <section className="border-t bg-white px-6 py-16 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h3 className="text-center text-2xl font-bold">
            Everything you need for placements
          </h3>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Feature
              title="Semantic Resume Matching"
              description="Find relevant jobs by comparing resume content with job descriptions."
            />

            <Feature
              title="Skill Gap Analysis"
              description="Identify missing skills and understand what to learn for your target role."
            />

            <Feature
              title="Application Tracking"
              description="Track applications, interview rounds, and offer updates in one place."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-sm text-slate-500">
        PlaceSmart · Smart College Placement System
      </footer>
    </main>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-6">
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
