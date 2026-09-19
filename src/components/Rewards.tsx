"use client";

import { pick } from "@/lib/dictionary";
import { useI18n } from "@/lib/i18n";
import type { FunFact, Gear } from "../../data/types";

const GEAR_ICONS: Record<string, string> = {
  boots: "🥾",
  helmet: "⛑️",
  goggles: "🥽",
  harness: "🪢",
  axes: "⛏️",
  rope: "🧗",
  oxygen: "🫁",
  headlamp: "🔦",
  compass: "🧭",
  tent: "⛺",
  radio: "📻",
  gps: "📡",
  suit: "🧥",
  binoculars: "🔭",
};

export function gearIcon(layer: string): string {
  return GEAR_ICONS[layer] ?? "🎁";
}

export function ToolsReward({ amount, label }: { amount: number; label: string }) {
  return (
    <div className="reward-shine relative flex items-center gap-4 overflow-hidden rounded-2xl border border-summit/40 bg-gradient-to-br from-summit/25 via-amber-500/10 to-transparent p-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-summit to-emerald-400 text-3xl shadow-lg shadow-summit/25">
        🧰
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-summit/80">{label}</p>
        <p className="text-3xl font-extrabold leading-tight text-summit drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]">
          +{amount}
        </p>
      </div>
      <span className="pointer-events-none absolute right-3 top-2 select-none text-lg opacity-40">✨</span>
    </div>
  );
}

export function FunFactReward({ fact, label }: { fact: FunFact; label: string }) {
  const { lang } = useI18n();
  return (
    <div className="reward-shine relative overflow-hidden rounded-2xl border border-glacier/30 bg-gradient-to-br from-glacier/15 via-sky-500/5 to-transparent p-4">
      <span className="pointer-events-none absolute -right-3 -top-3 select-none text-6xl opacity-20">💡</span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-glacier">{label}</p>
      <p className="mt-1.5 pr-8 text-sm leading-relaxed text-ice/90">{pick(fact.text, lang)}</p>
    </div>
  );
}

export function GearReward({
  gear,
  label,
  equippedNote,
}: {
  gear: Gear;
  label: string;
  equippedNote: string;
}) {
  const { lang } = useI18n();
  return (
    <div className="reward-shine relative overflow-hidden rounded-2xl border border-alpenglow/40 bg-gradient-to-br from-alpenglow/20 via-transparent to-glacier/10 p-5">
      <span className="pointer-events-none absolute -right-4 -top-4 select-none text-7xl opacity-10">
        {gearIcon(gear.layer)}
      </span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-alpenglow/80">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-2xl">
          {gearIcon(gear.layer)}
        </span>
        <div>
          <p className="text-lg font-extrabold">{pick(gear.name, lang)}</p>
          <p className="text-sm text-ice/70">{pick(gear.blurb, lang)}</p>
        </div>
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-summit/50 bg-summit/15 px-3 py-1 text-xs font-bold text-summit">
        ✓ {equippedNote}
      </span>
    </div>
  );
}