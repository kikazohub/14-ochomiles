import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rollWeather } from "@/lib/game";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mountainId = Number(body?.mountainId);
  if (!Number.isInteger(mountainId)) {
    return NextResponse.json({ ok: false, error: "mountain" }, { status: 400 });
  }

  const result = rollWeather(session.userId, mountainId);
  if (!result) return NextResponse.json({ ok: false, error: "state" }, { status: 409 });

  return NextResponse.json({ ok: true, ...result });
}
