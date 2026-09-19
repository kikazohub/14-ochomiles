import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { restartMountain, startMountain } from "@/lib/game";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mountainId = Number(body?.mountainId);
  if (!Number.isInteger(mountainId)) {
    return NextResponse.json({ ok: false, error: "mountain" }, { status: 400 });
  }

  const progress = body?.restart ? restartMountain(session.userId, mountainId) : startMountain(session.userId, mountainId);
  if (!progress) return NextResponse.json({ ok: false, error: "mountain" }, { status: 404 });

  return NextResponse.json({ ok: true, progress });
}
