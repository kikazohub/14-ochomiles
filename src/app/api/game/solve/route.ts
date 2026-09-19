import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { solveChallenge } from "@/lib/game";
import type { CodeLang } from "@/lib/executor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mountainId = Number(body?.mountainId);
  const code = String(body?.code ?? "");
  const lang: CodeLang = body?.lang === "go" ? "go" : body?.lang === "python" ? "python" : "python";

  if (!Number.isInteger(mountainId)) {
    return NextResponse.json({ ok: false, error: "mountain" }, { status: 400 });
  }
  if (code.length > 20000) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 413 });
  }

  const outcome = await solveChallenge(session.userId, mountainId, code, lang);
  if (!outcome) return NextResponse.json({ ok: false, error: "state" }, { status: 409 });

  return NextResponse.json({ ok: true, ...outcome });
}
