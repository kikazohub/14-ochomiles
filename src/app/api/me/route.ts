import { NextResponse } from "next/server";
import { db, type UserRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  getAllProgress,
  getEquipped,
  getInventory,
  getSeenFunFacts,
  getTools,
  getWikiUnlocks,
} from "@/lib/game";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      language: user.language === "en" ? "en" : "es",
      gender: user.avatar_gender === "female" ? "female" : "male",
      name: user.avatar_name,
    },
    tools: getTools(user.id),
    inventory: getInventory(user.id).map((r) => r.item),
    equipped: getEquipped(user.id),
    seenFunFacts: getSeenFunFacts(user.id),
    progress: getAllProgress(user.id),
    wikiUnlocks: getWikiUnlocks(user.id),
  });
}
