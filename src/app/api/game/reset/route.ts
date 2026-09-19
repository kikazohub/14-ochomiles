import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resetUser } from "@/lib/game";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  resetUser(session.userId);
  return NextResponse.json({ ok: true });
}
