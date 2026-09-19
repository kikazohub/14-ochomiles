import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { MOUNTAINS } from "../../data/mountains";
import { Landing } from "@/components/Landing";
import type { MountainProfile } from "../../data/types";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/home");

  const preview = MOUNTAINS.map((m) => ({
    id: m.id,
    name: m.name,
    height: m.height,
    rank: m.rank,
    profile: m.profile as MountainProfile,
    palette: m.palette,
  }));

  return <Landing mountains={preview} />;
}
