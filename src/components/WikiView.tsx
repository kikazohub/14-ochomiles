"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { pick } from "@/lib/dictionary";
import { MountainSilhouette } from "@/components/MountainSilhouette";
import type { L, MountainProfile, WikiSectionDef } from "../../data/types";

interface MountainItem {
  id: number;
  name: string;
  height: number;
  rank: number;
  countries: L;
  profile: MountainProfile;
  palette: { from: string; to: string; accent: string };
  intro: L;
  firstAscent: L;
  facts: L[];
  curiosities: L[];
  climbers: L[];
  legends: L[];
  routes: L[];
}

interface Props {
  mountains: MountainItem[];
  sections: WikiSectionDef[];
  unlocked: string[];
  tools: number;
}

export function WikiView(props: Props) {
  return (
    <Suspense fallback={null}>
      <WikiViewInner {...props} />
    </Suspense>
  );
}

function WikiViewInner({ mountains, sections, unlocked, tools }: Props) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = Number(searchParams.get("mountain"));
  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(new Set(unlocked));
  const [toolsCount, setToolsCount] = useState(tools);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (Number.isInteger(urlId) && mountains.some((m) => m.id === urlId)) return urlId;
    return mountains[0]?.id ?? 1;
  }, [mountains, urlId]);

  const mountain = useMemo(() => mountains.find((m) => m.id === selected), [mountains, selected]);

  function selectMountain(id: number) {
    setMessage(null);
    if (id === selected) return;
    router.replace(`/wiki?mountain=${id}`, { scroll: false });
  }

  function contentFor(sectionId: string): L[] {
    if (!mountain) return [];
    switch (sectionId) {
      case "history":
        return [mountain.intro, mountain.firstAscent, ...mountain.facts];
      case "curiosities":
        return mountain.curiosities;
      case "climbers":
        return mountain.climbers;
      case "legends":
        return mountain.legends;
      case "routes":
        return mountain.routes;
      default:
        return [];
    }
  }

  async function unlock(sectionId: string) {
    setMessage(null);
    const res = await fetch("/api/wiki/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mountainId: selected, section: sectionId }),
    });
    const data = await res.json();
    if (data.ok) {
      setUnlockedSet((prev) => new Set(prev).add(`${selected}:${sectionId}`));
      setToolsCount(data.tools);
    } else {
      setMessage(data.reason === "no_tools" ? t.wiki.notEnough : t.wiki.already);
    }
  }

  if (!mountain) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t.wiki.title}</h1>
          <p className="mt-1 text-sm text-ice/60">{t.wiki.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-night/40 px-4 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wide text-ice/50">{t.wiki.yourTools}</div>
          <div className="text-xl font-bold text-summit">🧰 {toolsCount}</div>
        </div>
      </header>

      <p className="text-xs text-ice/40">{t.wiki.howTo}</p>

      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2">
        {mountains.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => selectMountain(m.id)}
            className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition ${
              selected === m.id
                ? "border-glacier/60 bg-glacier/15 font-semibold"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <section className="card-glass rounded-3xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <MountainSilhouette
            profile={mountain.profile}
            palette={mountain.palette}
            idSuffix={`wiki-${mountain.id}`}
            className="mx-auto w-full max-w-[180px] sm:mx-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-ice/70">
                #{mountain.rank}
              </span>
              <h2 className="text-2xl font-bold">{mountain.name}</h2>
            </div>
            <p className="mt-1 text-sm text-ice/60">
              {mountain.height.toLocaleString()} m · {pick(mountain.countries, lang)}
            </p>
          </div>
        </div>
      </section>

      {message && (
        <p className="rounded-xl border border-alpenglow/40 bg-alpenglow/10 px-3 py-2 text-sm text-alpenglow">
          {message}
        </p>
      )}

      <div className="space-y-4">
        {sections.map((section) => {
          const key = `${selected}:${section.id}`;
          const isUnlocked = unlockedSet.has(key);
          const canAfford = toolsCount >= section.price;
          const items = contentFor(section.id);
          return (
            <section key={section.id} className="card-glass rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold">
                  {pick(section.title, lang)}{" "}
                  {isUnlocked && <span className="text-sm text-summit">✓</span>}
                </h3>
                {!isUnlocked && (
                  <button
                    type="button"
                    onClick={() => unlock(section.id)}
                    disabled={!canAfford}
                    className="rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-4 py-2 text-sm font-bold text-night hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.wiki.unlock} · 🧰 {section.price}
                  </button>
                )}
              </div>

              {isUnlocked ? (
                <ul className="mt-3 space-y-2">
                  {items.map((item, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-white/10 bg-night/40 px-3 py-2 text-sm text-ice/80"
                    >
                      {pick(item, lang)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-white/15 bg-night/30 px-3 py-4 text-center text-sm text-ice/40">
                  🔒 {t.wiki.locked} · {t.wiki.cost}: 🧰 {section.price}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
