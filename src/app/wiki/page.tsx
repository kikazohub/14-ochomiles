import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTools, getWikiUnlocks } from "@/lib/game";
import { db, type UserRow } from "@/lib/db";
import { MOUNTAINS } from "../../../data/mountains";
import { WIKI_SECTIONS } from "../../../data/gear";
import { WikiView } from "@/components/WikiView";

export const dynamic = "force-dynamic";

export default async function WikiPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as UserRow | undefined;
  if (!user) redirect("/");

  const mountains = MOUNTAINS.map((m) => ({
    id: m.id,
    name: m.name,
    height: m.height,
    rank: m.rank,
    countries: m.countries,
    profile: m.profile,
    palette: m.palette,
    intro: m.intro,
    firstAscent: m.firstAscent,
    facts: m.facts,
    curiosities: m.curiosities,
    climbers: m.climbers,
    legends: m.legends,
    routes: m.routes,
  }));

  const unlocks = getWikiUnlocks(user.id).map((u) => `${u.mountainId}:${u.section}`);

  return (
    <WikiView mountains={mountains} sections={WIKI_SECTIONS} unlocked={unlocks} tools={getTools(user.id)} />
  );
}
