import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getEquipped,
  getInventory,
  getSeenFunFacts,
  getTools,
  getAllProgress,
  funFactById,
} from "@/lib/game";
import { db, type UserRow } from "@/lib/db";
import { getMountain } from "../../../data/mountains";
import { getGear } from "../../../data/gear";
import { ProgressView } from "@/components/ProgressView";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as UserRow | undefined;
  if (!user) redirect("/");

  const summits = getAllProgress(user.id)
    .map((p) => {
      const m = getMountain(p.mountainId);
      if (!m) return null;
      return {
        mountainId: p.mountainId,
        name: m.name,
        height: m.height,
        rank: m.rank,
        profile: m.profile,
        palette: m.palette,
        camp: p.camp,
        status: p.status,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const inventory = getInventory(user.id)
    .map((row) => {
      const gear = getGear(row.item);
      if (!gear) return null;
      return { id: gear.id, name: gear.name, blurb: gear.blurb, effect: gear.effect };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const facts = getSeenFunFacts(user.id)
    .map((id) => funFactById(id))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .map((f) => f.text);

  return (
    <ProgressView
      user={{
        name: user.avatar_name,
        username: user.username,
        gender: user.avatar_gender === "female" ? "female" : "male",
      }}
      summits={summits}
      inventory={inventory}
      equipped={getEquipped(user.id)}
      tools={getTools(user.id)}
      facts={facts}
    />
  );
}
