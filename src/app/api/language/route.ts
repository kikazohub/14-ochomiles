import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const lang = body?.lang === "en" ? "en" : "es";
  db.prepare("UPDATE users SET language = ? WHERE id = ?").run(lang, session.userId);
  return NextResponse.json({ ok: true, lang });
}
