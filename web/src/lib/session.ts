
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface UserSession {
  userId: number;
  email: string;
  role: "STUDENT" | "ADMIN";
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD!,
  cookieName: "placesmart_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<UserSession>(cookieStore, sessionOptions);
}
