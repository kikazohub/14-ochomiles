import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const gender = body?.gender === "female" ? "female" : body?.gender === "male" ? "male" : null;
  const name = body?.name === undefined ? null : String(body.name).trim().slice(0, 24);

  if (gender !== null) {
    db.prepare("UPDATE users SET avatar_gender = ? WHERE id = ?").run(gender, session.userId);
  }
  if (name !== null && name.length > 0) {
    db.prepare("UPDATE users SET avatar_name = ? WHERE id = ?").run(name, session.userId);
  }
  return NextResponse.json({ ok: true });
}
