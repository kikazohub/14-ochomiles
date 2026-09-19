"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { pick } from "@/lib/dictionary";
import { Avatar } from "@/components/Avatar";
import { MountainSilhouette } from "@/components/MountainSilhouette";
import { EFFECT_INFO } from "../../data/gear";
import type { GearEffect, L, MountainProfile } from "../../data/types";

interface SummitItem {
  mountainId: number;
  name: string;
  height: number;
  rank: number;
  profile: MountainProfile;
  palette: { from: string; to: string; accent: string };
  camp: number;
  status: "in_progress" | "summited";
}

interface GearItem {
  id: string;
  name: L;
  blurb: L;
  effect: GearEffect;
}

interface Props {
  user: { name: string; username: string; gender: "male" | "female" };
  summits: SummitItem[];
  inventory: GearItem[];
  equipped: string[];
  tools: number;
  facts: L[];
}

export function ProgressView({ user, summits, inventory, equipped, tools, facts }: Props) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(user.name);
  const [gender, setGender] = useState<"male" | "female">(user.gender);
  const [equippedItems, setEquippedItems] = useState(equipped);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const summitedCount = summits.filter((s) => s.status === "summited").length;
  const altitude = summits
    .filter((s) => s.status === "summited")
    .reduce((sum, s) => sum + s.height, 0);

  async function saveAvatar() {
    setBusy(true);
    setSaved(false);
    try {
      await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gender }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(gearId: string) {
    const res = await fetch("/api/game/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gearId }),
    });
    const data = await res.json();
    if (data.ok) setEquippedItems(data.equipped);
  }

  async function reset() {
    if (!window.confirm(t.progress.resetConfirm)) return;
    await fetch("/api/game/reset", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">{t.progress.title}</h1>
        <p className="mt-1 text-sm text-ice/60">{t.progress.subtitle}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card-glass rounded-3xl p-6 text-center">
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 -z-10 rounded-full bg-glacier/10 blur-2xl" />
            <Avatar gender={gender} equipped={equippedItems} size={170} glow />
          </div>
          <h2 className="mt-2 text-xl font-bold">{name || user.username}</h2>
          <div className="mt-4 space-y-3 text-left">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-ice/60">
                {t.auth.name}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="w-full rounded-xl border border-white/15 bg-night/60 px-3 py-2 outline-none focus:border-glacier/60"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-ice/60">
                {t.auth.gender}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      gender === g ? "border-alpenglow/60 bg-alpenglow/15" : "border-white/15 hover:bg-white/5"
                    }`}
                  >
                    {g === "female" ? `👩‍🚀 ${t.auth.female}` : `🧗 ${t.auth.male}`}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={saveAvatar}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-4 py-2.5 font-bold text-night hover:brightness-110 disabled:opacity-60"
            >
              {saved ? t.progress.saved : t.progress.save}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t.progress.climbed} value={`${summitedCount}/14`} />
            <Stat label={t.progress.totalAltitude} value={`${altitude.toLocaleString()} m`} />
            <Stat label={t.progress.tools} value={`🧰 ${tools}`} />
          </div>

          <div className="card-glass rounded-3xl p-5">
            <h3 className="text-lg font-bold">{t.home.title}</h3>
            <ul className="mt-3 space-y-2">
              {summits.length === 0 && <li className="text-sm text-ice/50">—</li>}
              {summits.map((s) => (
                <li key={s.mountainId}>
                  <Link
                    href={`/mountain/${s.mountainId}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-night/40 p-2 transition hover:border-glacier/40"
                  >
                    <MountainSilhouette
                      profile={s.profile}
                      palette={s.palette}
                      idSuffix={`prog-${s.mountainId}`}
                      summitReached={s.status === "summited"}
                      className="w-20 shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ice/40">#{s.rank}</span>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                      <div className="text-xs text-ice/50">
                        {s.status === "summited" ? t.home.summited : `${t.home.camp} ${s.camp}/10`}
                      </div>
                    </div>
                    <span className="text-lg">{s.status === "summited" ? "🚩" : "⛺"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="card-glass rounded-3xl p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-bold">{t.progress.loadout}</h3>
          <span className="text-xs text-ice/40">
            {t.progress.equipped}: {equippedItems.length}/{inventory.length}
          </span>
        </div>
        {inventory.length === 0 ? (
          <p className="mt-3 text-sm text-ice/50">{t.progress.noGear}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {inventory.map((gear) => {
              const isOn = equippedItems.includes(gear.id);
              return (
                <div
                  key={gear.id}
                  className={`rounded-2xl border p-4 transition ${
                    isOn ? "border-glacier/50 bg-glacier/10" : "border-white/10 bg-night/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold">{pick(gear.name, lang)}</h4>
                    <button
                      type="button"
                      onClick={() => toggle(gear.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                        isOn
                          ? "bg-glacier/25 text-glacier"
                          : "border border-white/15 hover:bg-white/5"
                      }`}
                    >
                      {isOn ? t.progress.unequip : t.progress.equip}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-ice/70">{pick(gear.blurb, lang)}</p>
                  <p className="mt-2 text-xs text-summit">
                    ✦ {t.progress.effects}: {pick(EFFECT_INFO[gear.effect], lang)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-glass rounded-3xl p-6">
        <h3 className="text-lg font-bold">💡 {t.progress.seenFacts}</h3>
        {facts.length === 0 ? (
          <p className="mt-3 text-sm text-ice/50">{t.progress.noFacts}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {facts.map((f, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-night/40 px-3 py-2 text-sm text-ice/80">
                {pick(f, lang)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-alpenglow/30 bg-alpenglow/5 p-6">
        <h3 className="text-lg font-bold text-alpenglow">{t.progress.reset}</h3>
        <p className="mt-1 text-sm text-ice/70">{t.progress.resetConfirm}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl border border-alpenglow/50 bg-alpenglow/15 px-4 py-2.5 text-sm font-bold text-alpenglow hover:bg-alpenglow/25"
        >
          {t.progress.reset}
        </button>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night/40 px-3 py-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ice/50">{label}</div>
    </div>
  );
}
