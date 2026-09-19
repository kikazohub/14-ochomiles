import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { getAllProgress, getEquipped, getInventory, getTools } from "@/lib/game";
import { MOUNTAINS } from "../../../data/mountains";
import { HomeView } from "@/components/HomeView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as UserRow | undefined;
  if (!user) redirect("/");

  const progress = getAllProgress(user.id).map((p) => ({
    mountainId: p.mountainId,
    camp: p.camp,
    status: p.status,
  }));

  const mountains = MOUNTAINS.map((m) => ({
    id: m.id,
    name: m.name,
    height: m.height,
    rank: m.rank,
    profile: m.profile,
    palette: m.palette,
    countries: m.countries,
  }));

  return (
    <HomeView
      user={{
        name: user.avatar_name,
        username: user.username,
        gender: user.avatar_gender === "female" ? "female" : "male",
      }}
      mountains={mountains}
      progress={progress}
      tools={getTools(user.id)}
      inventory={getInventory(user.id).map((r) => r.item)}
      equipped={getEquipped(user.id)}
    />
  );
}
