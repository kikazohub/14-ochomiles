import { randomBytes } from "node:crypto";
import { db, type ProgressRow } from "./db";
import { MOUNTAINS, getMountain } from "../../data/mountains";
import { challengesByTier } from "../../data/challenges";
import { GO_CHALLENGES } from "../../data/challengesGo";
import { WIKI_SECTIONS, gearForMountain, getGear, GEAR } from "../../data/gear";
import { FUN_FACTS, factById } from "../../data/funFacts";
import { runChallenge, type CodeLang } from "./executor";
import type { Challenge, FunFact, Gear, L } from "../../data/types";

export const MAX_CAMP = 10;
export const SUNNY_CHANCE = 0.15;
export const AVALANCHE_CHANCE = 0.05;

export type Weather = "sunny" | "storm" | "avalanche";

export interface ProgressState {
  mountainId: number;
  camp: number;
  pending: boolean;
  status: "in_progress" | "summited";
  summitedAt: string | null;
}

interface ProgressDbRow extends ProgressRow {
  pending: number;
}

function randomSeed(): string {
  return randomBytes(8).toString("hex");
}

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function getProgress(userId: number, mountainId: number): ProgressState | null {
  const row = db
    .prepare("SELECT * FROM progress WHERE user_id = ? AND mountain_id = ?")
    .get(userId, mountainId) as ProgressDbRow | undefined;
  if (!row) return null;
  return {
    mountainId: row.mountain_id,
    camp: row.camp,
    pending: row.pending === 1,
    status: row.status === "summited" ? "summited" : "in_progress",
    summitedAt: row.summited_at,
  };
}

export function getAllProgress(userId: number): ProgressState[] {
  const rows = db
    .prepare("SELECT * FROM progress WHERE user_id = ?")
    .all(userId) as ProgressDbRow[];
  return rows.map((row) => ({
    mountainId: row.mountain_id,
    camp: row.camp,
    pending: row.pending === 1,
    status: row.status === "summited" ? "summited" : "in_progress",
    summitedAt: row.summited_at,
  }));
}

function getSeed(userId: number, mountainId: number): string {
  const row = db
    .prepare("SELECT run_seed FROM progress WHERE user_id = ? AND mountain_id = ?")
    .get(userId, mountainId) as { run_seed: string } | undefined;
  return row?.run_seed ?? "";
}

export function startMountain(userId: number, mountainId: number): ProgressState | null {
  if (!getMountain(mountainId)) return null;
  const existing = getProgress(userId, mountainId);
  if (existing) return existing;
  db.prepare(
    "INSERT INTO progress (user_id, mountain_id, camp, run_seed, pending, status) VALUES (?, ?, 0, ?, 0, 'in_progress')"
  ).run(userId, mountainId, randomSeed());
  return getProgress(userId, mountainId);
}

export function restartMountain(userId: number, mountainId: number): ProgressState | null {
  if (!getMountain(mountainId)) return null;
  const existing = getProgress(userId, mountainId);
  if (!existing) return startMountain(userId, mountainId);
  db.prepare(
    "UPDATE progress SET camp = 0, run_seed = ?, pending = 0, status = 'in_progress', summited_at = NULL WHERE user_id = ? AND mountain_id = ?"
  ).run(randomSeed(), userId, mountainId);
  return getProgress(userId, mountainId);
}

export function challengeForCamp(userId: number, mountainId: number, camp: number): Challenge | null {
  if (camp < 1 || camp > MAX_CAMP) return null;
  const seed = getSeed(userId, mountainId);
  const pool = challengesByTier(camp);
  if (pool.length === 0) return null;
  const idx = fnv1a(`${seed}:${mountainId}:${camp}`) % pool.length;
  return pool[idx];
}

export interface EquippedEffects {
  hint1: boolean;
  hint2: boolean;
  example: boolean;
  hiddenCount: boolean;
  avalancheGuard: boolean;
}

export function equippedEffects(userId: number): EquippedEffects {
  const rows = db
    .prepare("SELECT item FROM equipped WHERE user_id = ?")
    .all(userId) as { item: string }[];
  const effects: EquippedEffects = {
    hint1: false,
    hint2: false,
    example: false,
    hiddenCount: false,
    avalancheGuard: false,
  };
  for (const row of rows) {
    const gear = getGear(row.item);
    if (!gear) continue;
    if (gear.effect === "hint1") effects.hint1 = true;
    if (gear.effect === "hint2") effects.hint2 = true;
    if (gear.effect === "example") effects.example = true;
    if (gear.effect === "hidden_count") effects.hiddenCount = true;
    if (gear.effect === "avalanche_guard") effects.avalancheGuard = true;
  }
  return effects;
}

export interface PublicChallenge {
  id: string;
  tier: number;
  title: L;
  statement: L;
  starterPy: string;
  starterGo: string;
  typesPy: L;
  typesGo: L;
  reveals: {
    hint1?: { py: L; go: L };
    hint2?: { py: L; go: L };
    example?: { call: string; output: string; note: L };
    hiddenCount?: number;
  };
}

export function toPublicChallenge(challenge: Challenge, userId: number): PublicChallenge {
  const fx = equippedEffects(userId);
  const goData = GO_CHALLENGES[challenge.id];
  return {
    id: challenge.id,
    tier: challenge.tier,
    title: challenge.title,
    statement: challenge.statement,
    starterPy: challenge.starter,
    starterGo: goData?.starterGo ?? challenge.starter,
    typesPy: challenge.types,
    typesGo: goData?.typesGo ?? challenge.types,
    reveals: {
      hint1: fx.hint1 ? { py: challenge.hint1, go: goData?.hintsGo?.hint1 ?? challenge.hint1 } : undefined,
      hint2: fx.hint2 ? { py: challenge.hint2, go: goData?.hintsGo?.hint2 ?? challenge.hint2 } : undefined,
      example: fx.example ? challenge.example : undefined,
      hiddenCount: fx.hiddenCount ? challenge.tests.length : undefined,
    },
  };
}

export interface RollResult {
  weather: Weather;
  guarded?: boolean;
  camp: number;
  summited: boolean;
  challenge?: PublicChallenge;
  gear?: Gear;
}

export function rollWeather(userId: number, mountainId: number): RollResult | null {
  const progress = getProgress(userId, mountainId);
  if (!progress || progress.status === "summited") return null;

  if (progress.pending) {
    const challenge = challengeForCamp(userId, mountainId, progress.camp + 1);
    return {
      weather: "storm",
      camp: progress.camp,
      summited: false,
      challenge: challenge ? toPublicChallenge(challenge, userId) : undefined,
    };
  }

  const r = Math.random();
  if (r < SUNNY_CHANCE) {
    const camp = progress.camp + 1;
    const summited = camp >= MAX_CAMP;
    db.prepare("UPDATE progress SET camp = ?, status = ?, summited_at = ? WHERE user_id = ? AND mountain_id = ?").run(
      camp,
      summited ? "summited" : "in_progress",
      summited ? new Date().toISOString() : null,
      userId,
      mountainId
    );
    if (summited) grantSummitGear(userId, mountainId);
    return { weather: "sunny", camp, summited, gear: summited ? gearForMountain(mountainId) ?? undefined : undefined };
  }

  if (r < SUNNY_CHANCE + AVALANCHE_CHANCE) {
    const fx = equippedEffects(userId);
    if (fx.avalancheGuard) {
      return { weather: "avalanche", guarded: true, camp: progress.camp, summited: false };
    }
    const camp = Math.max(0, progress.camp - 1);
    db.prepare("UPDATE progress SET camp = ? WHERE user_id = ? AND mountain_id = ?").run(camp, userId, mountainId);
    return { weather: "avalanche", camp, summited: false };
  }

  db.prepare("UPDATE progress SET pending = 1 WHERE user_id = ? AND mountain_id = ?").run(userId, mountainId);
  const challenge = challengeForCamp(userId, mountainId, progress.camp + 1);
  return {
    weather: "storm",
    camp: progress.camp,
    summited: false,
    challenge: challenge ? toPublicChallenge(challenge, userId) : undefined,
  };
}

function pickFunFact(userId: number): FunFact | null {
  const seenRows = db
    .prepare("SELECT fact_id FROM seen_funfacts WHERE user_id = ?")
    .all(userId) as { fact_id: number }[];
  const seen = new Set(seenRows.map((r) => r.fact_id));
  const pool = FUN_FACTS.filter((f) => !seen.has(f.id));
  if (pool.length === 0) return null;
  const fact = pool[Math.floor(Math.random() * pool.length)];
  db.prepare("INSERT OR IGNORE INTO seen_funfacts (user_id, fact_id) VALUES (?, ?)").run(userId, fact.id);
  return fact;
}

function addTools(userId: number, amount: number): void {
  db.prepare(
    `INSERT INTO inventory (user_id, item, qty) VALUES (?, 'tech_tools', ?)
     ON CONFLICT(user_id, item) DO UPDATE SET qty = qty + excluded.qty`
  ).run(userId, amount);
}

function grantSummitGear(userId: number, mountainId: number): Gear | null {
  const gear = gearForMountain(mountainId);
  if (!gear) return null;
  db.prepare(
    `INSERT INTO inventory (user_id, item, qty) VALUES (?, ?, 1)
     ON CONFLICT(user_id, item) DO UPDATE SET qty = 1`
  ).run(userId, gear.id);
  db.prepare("INSERT OR IGNORE INTO equipped (user_id, item) VALUES (?, ?)").run(userId, gear.id);
  return gear;
}

export interface SolveRewards {
  tools: number;
  funFact: FunFact | null;
  gear: Gear | null;
}

export interface SolveOutcome {
  passed: boolean;
  total: number;
  passedCount: number;
  firstFailure?: {
    index: number;
    total: number;
    args: string[];
    expected: string;
    actual: string;
  };
  error?: string;
  camp: number;
  summited: boolean;
  rewards?: SolveRewards;
}

export async function solveChallenge(
  userId: number,
  mountainId: number,
  code: string,
  lang: CodeLang = "python"
): Promise<SolveOutcome | null> {
  const progress = getProgress(userId, mountainId);
  if (!progress || progress.status === "summited") return null;

  const tier = progress.camp + 1;
  const challenge = progress.pending
    ? challengeForCamp(userId, mountainId, tier)
    : null;

  if (!challenge) {
    return {
      passed: false,
      total: 0,
      passedCount: 0,
      error: "no_pending",
      camp: progress.camp,
      summited: false,
    };
  }

  const result = await runChallenge(challenge, code, lang);

  if (!result.passed) {
    return {
      passed: false,
      total: result.total,
      passedCount: result.passedCount,
      firstFailure: result.firstFailure,
      error: result.error,
      camp: progress.camp,
      summited: false,
    };
  }

  const camp = progress.camp + 1;
  const summited = camp >= MAX_CAMP;
  const tools = tier + 2;

  const apply = db.transaction(() => {
    db.prepare(
      "UPDATE progress SET camp = ?, pending = 0, status = ?, summited_at = ? WHERE user_id = ? AND mountain_id = ?"
    ).run(camp, summited ? "summited" : "in_progress", summited ? new Date().toISOString() : null, userId, mountainId);
    addTools(userId, tools);
  });
  apply();

  const funFact = pickFunFact(userId);
  const gear = summited ? grantSummitGear(userId, mountainId) : null;

  return {
    passed: true,
    total: result.total,
    passedCount: result.passedCount,
    camp,
    summited,
    rewards: { tools, funFact, gear },
  };
}

export function getTools(userId: number): number {
  const row = db
    .prepare("SELECT qty FROM inventory WHERE user_id = ? AND item = 'tech_tools'")
    .get(userId) as { qty: number } | undefined;
  return row?.qty ?? 0;
}

export function getInventory(userId: number): { item: string; qty: number }[] {
  return db
    .prepare("SELECT item, qty FROM inventory WHERE user_id = ? AND item != 'tech_tools'")
    .all(userId) as { item: string; qty: number }[];
}

export function getEquipped(userId: number): string[] {
  const rows = db.prepare("SELECT item FROM equipped WHERE user_id = ?").all(userId) as { item: string }[];
  return rows.map((r) => r.item);
}

export function hasGear(userId: number, gearId: string): boolean {
  const row = db
    .prepare("SELECT qty FROM inventory WHERE user_id = ? AND item = ?")
    .get(userId, gearId) as { qty: number } | undefined;
  return !!row && row.qty > 0;
}

export function toggleEquip(userId: number, gearId: string): string[] | null {
  if (!getGear(gearId) || !hasGear(userId, gearId)) return null;
  const equipped = getEquipped(userId);
  if (equipped.includes(gearId)) {
    db.prepare("DELETE FROM equipped WHERE user_id = ? AND item = ?").run(userId, gearId);
  } else {
    db.prepare("INSERT INTO equipped (user_id, item) VALUES (?, ?)").run(userId, gearId);
  }
  return getEquipped(userId);
}

export function getWikiUnlocks(userId: number): { mountainId: number; section: string }[] {
  const rows = db
    .prepare("SELECT mountain_id, section FROM wiki_unlocks WHERE user_id = ?")
    .all(userId) as { mountain_id: number; section: string }[];
  return rows.map((r) => ({ mountainId: r.mountain_id, section: r.section }));
}

export function unlockWikiSection(
  userId: number,
  mountainId: number,
  sectionId: string
): { ok: boolean; reason?: "already" | "no_tools" | "invalid"; tools: number } {
  const section = WIKI_SECTIONS.find((s) => s.id === sectionId);
  const mountain = getMountain(mountainId);
  if (!section || !mountain) return { ok: false, reason: "invalid", tools: getTools(userId) };

  const existing = db
    .prepare("SELECT 1 FROM wiki_unlocks WHERE user_id = ? AND mountain_id = ? AND section = ?")
    .get(userId, mountainId, sectionId);
  if (existing) return { ok: false, reason: "already", tools: getTools(userId) };

  if (getTools(userId) < section.price) return { ok: false, reason: "no_tools", tools: getTools(userId) };

  const tx = db.transaction(() => {
    db.prepare("UPDATE inventory SET qty = qty - ? WHERE user_id = ? AND item = 'tech_tools'").run(
      section.price,
      userId
    );
    db.prepare("INSERT INTO wiki_unlocks (user_id, mountain_id, section) VALUES (?, ?, ?)").run(
      userId,
      mountainId,
      sectionId
    );
  });
  tx();
  return { ok: true, tools: getTools(userId) };
}

export function getSeenFunFacts(userId: number): number[] {
  const rows = db.prepare("SELECT fact_id FROM seen_funfacts WHERE user_id = ?").all(userId) as {
    fact_id: number;
  }[];
  return rows.map((r) => r.fact_id);
}

export function resetUser(userId: number): void {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM progress WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM inventory WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM equipped WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM wiki_unlocks WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM seen_funfacts WHERE user_id = ?").run(userId);
  });
  tx();
}

export function allGear(): Gear[] {
  return GEAR;
}

export function allFunFacts(): FunFact[] {
  return FUN_FACTS;
}

export function funFactById(id: number): FunFact | undefined {
  return factById(id);
}

export function mountainList() {
  return MOUNTAINS;
}
