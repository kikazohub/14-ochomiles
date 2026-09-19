import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const gender = body?.gender === "female" ? "female" : "male";
  const name = String(body?.name ?? "").trim().slice(0, 24) || "Alpinista";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { ok: false, error: "username" },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json({ ok: false, error: "password" }, { status: 400 });
  }

  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (exists) {
    return NextResponse.json({ ok: false, error: "taken" }, { status: 409 });
  }

  const info = db
    .prepare(
      "INSERT INTO users (username, password_hash, avatar_gender, avatar_name) VALUES (?, ?, ?, ?)"
    )
    .run(username, hashPassword(password), gender, name);

  const userId = Number(info.lastInsertRowid);
  await createSession(userId);
  return NextResponse.json({ ok: true, userId });
}
