import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { unlockWikiSection } from "@/lib/game";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mountainId = Number(body?.mountainId);
  const section = String(body?.section ?? "");
  if (!Number.isInteger(mountainId)) {
    return NextResponse.json({ ok: false, error: "mountain" }, { status: 400 });
  }

  const result = unlockWikiSection(session.userId, mountainId, section);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
