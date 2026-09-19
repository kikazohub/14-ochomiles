import { notFound, redirect } from "next/navigation";
import { db, type UserRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getMountain } from "../../../../data/mountains";
import { equippedEffects, getEquipped, getTools, startMountain } from "@/lib/game";
import { MountainGame } from "@/components/MountainGame";

export const dynamic = "force-dynamic";

export default async function MountainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mountainId = Number(id);
  const mountain = Number.isInteger(mountainId) ? getMountain(mountainId) : undefined;
  if (!mountain) notFound();

  const session = await getSession();
  if (!session) redirect("/");

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as UserRow | undefined;
  if (!user) redirect("/");

  const progress = startMountain(user.id, mountainId);
  if (!progress) notFound();

  const fx = equippedEffects(user.id);

  return (
    <MountainGame
      mountain={{
        id: mountain.id,
        name: mountain.name,
        height: mountain.height,
        rank: mountain.rank,
        countries: mountain.countries,
        profile: mountain.profile,
        palette: mountain.palette,
        intro: mountain.intro,
        firstAscent: mountain.firstAscent,
        facts: mountain.facts,
      }}
      progress={{ camp: progress.camp, pending: progress.pending, status: progress.status }}
      equipped={getEquipped(user.id)}
      tools={getTools(user.id)}
      reveals={{
        hint1: fx.hint1,
        hint2: fx.hint2,
        example: fx.example,
        hiddenCount: fx.hiddenCount,
      }}
      gender={user.avatar_gender === "female" ? "female" : "male"}
    />
  );
}
