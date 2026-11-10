
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

type AllowedRole = "STUDENT" | "ADMIN";

export async function requireAuth(role: AllowedRole) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.role) {
    redirect("/login");
  }

  if (session.role !== role) {
    redirect(
      session.role === "ADMIN"
        ? "/admin/dashboard"
        : "/student/dashboard"
    );
  }

  return session;
}
