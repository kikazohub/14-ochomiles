"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { MountainSilhouette } from "@/components/MountainSilhouette";
import { pick } from "@/lib/dictionary";
import type { MountainProfile } from "../../data/types";

interface MountainItem {
  id: number;
  name: string;
  height: number;
  rank: number;
  profile: MountainProfile;
  palette: { from: string; to: string; accent: string };
  countries: { es: string; en: string };
}

interface ProgressItem {
  mountainId: number;
  camp: number;
  status: "in_progress" | "summited";
}

interface Props {
  user: { name: string; username: string; gender: "male" | "female" };
  mountains: MountainItem[];
  progress: ProgressItem[];
  tools: number;
  inventory: string[];
  equipped: string[];
}

export function HomeView({ user, mountains, progress, tools, inventory, equipped }: Props) {
  const { t, lang } = useI18n();
  const progressMap = new Map(progress.map((p) => [p.mountainId, p]));
  const summits = progress.filter((p) => p.status === "summited").length;
  const altitude = progress
    .filter((p) => p.status === "summited")
    .reduce((sum, p) => {
      const m = mountains.find((x) => x.id === p.mountainId);
      return sum + (m?.height ?? 0);
    }, 0);

  return (
    <div className="space-y-8">
      <section className="card-glass animate-fade-up flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto sm:mx-0">
          <div className="absolute inset-0 -z-10 rounded-full bg-glacier/10 blur-2xl" />
          <Avatar gender={user.gender} equipped={equipped} size={132} glow />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm uppercase tracking-widest text-glacier/80">{t.home.yourAvatar}</p>
          <h1 className="text-3xl font-extrabold">{user.name}</h1>
          <p className="mt-1 text-sm text-ice/60">{t.app.tagline}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label={t.home.climbed} value={`${summits}/14`} />
            <Stat label={t.nav.tools} value={tools.toString()} />
            <Stat label={t.home.gearOwned} value={inventory.length.toString()} />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-xs text-ice/50">{t.progress.totalAltitude}</p>
          <p className="text-2xl font-bold text-summit">{altitude.toLocaleString()} m</p>
          <Link
            href="/progress"
            className="rounded-xl border border-white/15 px-3 py-2 text-center text-sm hover:bg-white/5"
          >
            {t.home.seeProgress}
          </Link>
          <Link
            href="/wiki"
            className="rounded-xl border border-white/15 px-3 py-2 text-center text-sm hover:bg-white/5"
          >
            {t.home.seeWiki}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">{t.home.title}</h2>
        <p className="mt-1 text-sm text-ice/60">{t.home.subtitle}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mountains.map((m) => {
            const p = progressMap.get(m.id);
            const summited = p?.status === "summited";
            const inProgress = p && !summited;
            return (
              <Link
                key={m.id}
                href={`/mountain/${m.id}`}
                className="card-glass group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-1 hover:border-glacier/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ice/40">#{m.rank}</span>
                      <h3 className="text-lg font-bold">{m.name}</h3>
                    </div>
                    <p className="text-xs text-ice/50">{pick(m.countries, lang)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                      summited
                        ? "bg-summit/20 text-summit"
                        : inProgress
                          ? "bg-glacier/20 text-glacier"
                          : "bg-white/10 text-ice/60"
                    }`}
                  >
                    {summited ? t.home.summited : inProgress ? t.home.inProgress : t.home.notStarted}
                  </span>
                </div>

                <MountainSilhouette
                  profile={m.profile}
                  palette={m.palette}
                  idSuffix={`home-${m.id}`}
                  summitReached={summited}
                  className="mx-auto my-2 w-full max-w-[220px]"
                />

                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ice/80">{m.height.toLocaleString()} m</span>
                  <span className="text-xs text-ice/60">
                    {summited
                      ? t.home.summited
                      : inProgress
                        ? `${t.home.camp} ${p.camp}/10`
                        : t.home.enter}
                  </span>
                </div>

                {inProgress && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-glacier to-summit"
                      style={{ width: `${(p.camp / 10) * 100}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-night/40 px-3 py-2 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ice/50">{label}</div>
    </div>
  );
}
