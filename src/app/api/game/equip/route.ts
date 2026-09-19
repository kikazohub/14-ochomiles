import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toggleEquip } from "@/lib/game";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const gearId = String(body?.gearId ?? "");
  const equipped = toggleEquip(session.userId, gearId);
  if (!equipped) return NextResponse.json({ ok: false, error: "gear" }, { status: 400 });

  return NextResponse.json({ ok: true, equipped });
}
