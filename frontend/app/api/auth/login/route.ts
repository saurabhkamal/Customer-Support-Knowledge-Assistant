import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
  verifyPassword,
} from "../../../lib/auth";

export async function POST(request: Request) {
  const APP_USERNAME = process.env.APP_USERNAME;
  const APP_PASSWORD_HASH = process.env.APP_PASSWORD_HASH;

  if (!APP_USERNAME || !APP_PASSWORD_HASH) {
    return NextResponse.json(
      { detail: "Login is not configured. Set APP_USERNAME and APP_PASSWORD_HASH." },
      { status: 500 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { detail: "Username and password are required" },
      { status: 400 },
    );
  }

  // Both checks run unconditionally, so a wrong username takes the same time
  // as a wrong password rather than short-circuiting on the cheaper check.
  const validUsername = username === APP_USERNAME;
  const validPassword = verifyPassword(password, APP_PASSWORD_HASH);

  if (!validUsername || !validPassword) {
    return NextResponse.json({ detail: "Invalid username or password" }, { status: 401 });
  }

  const token = createSessionToken(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
