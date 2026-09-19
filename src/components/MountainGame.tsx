"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { pick } from "@/lib/dictionary";
import { Avatar } from "@/components/Avatar";
import { MountainSilhouette } from "@/components/MountainSilhouette";
import { FunFactReward, GearReward, ToolsReward } from "@/components/Rewards";
import type { FunFact, Gear, L, MountainProfile } from "../../data/types";

const TAB = "  ";

function indentBlock(code: string, start: number, end: number): { code: string; cursor: number } {
  if (start === end) {
    const next = code.slice(0, start) + TAB + code.slice(end);
    return { code: next, cursor: start + TAB.length };
  }
  const before = code.slice(0, start);
  const suffix = code.slice(end);
  const lineStart = before.lastIndexOf("\n") + 1;
  const sel = code.slice(start, end);
  const lines = sel.split("\n");
  if (lines.length > 1) lines[0] = before.slice(lineStart) + lines[0];
  const out = lines.map((l) => l.replace(/^/, TAB));
  return {
    code: before.slice(0, lineStart) + out.join("\n") + suffix,
    cursor: end + lines.length * TAB.length,
  };
}

function unindentBlock(code: string, start: number, end: number): { code: string; cursor: number } {
  const before = code.slice(0, start);
  const suffix = code.slice(end);
  const lineStart = before.lastIndexOf("\n") + 1;
  const sel = code.slice(start, end);
  const lines = sel.split("\n");
  if (lines.length > 1) lines[0] = before.slice(lineStart) + lines[0];
  const removed = [0];
  const out = lines.map((l, i) => {
    if (l.startsWith(TAB)) {
      removed[i] = TAB.length;
      return l.slice(TAB.length);
    }
    return l;
  });
  const removedTotal = removed.reduce((a, b) => a + b, 0);
  return {
    code: before.slice(0, lineStart) + out.join("\n") + suffix,
    cursor: Math.max(lineStart, end - removedTotal),
  };
}

type Weather = "sunny" | "storm" | "avalanche";
type CodeLang = "python" | "go";

interface PublicChallenge {
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

interface FirstFailure {
  index: number;
  total: number;
  args: string[];
  expected: string;
  actual: string;
}

interface SolveOutcome {
  passed: boolean;
  total: number;
  passedCount: number;
  firstFailure?: FirstFailure;
  error?: string;
  camp: number;
  summited: boolean;
  rewards?: { tools: number; funFact: FunFact | null; gear: Gear | null };
}

interface Props {
  mountain: {
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
  };
  progress: { camp: number; pending: boolean; status: "in_progress" | "summited" };
  equipped: string[];
  tools: number;
  reveals: { hint1: boolean; hint2: boolean; example: boolean; hiddenCount: boolean };
  gender: "male" | "female";
}

export function MountainGame({ mountain, progress, equipped, tools, reveals, gender }: Props) {
  const { t, lang } = useI18n();
  const router = useRouter();

  const [camp, setCamp] = useState(progress.camp);
  const [status, setStatus] = useState(progress.status);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [guarded, setGuarded] = useState(false);
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [codeLang, setCodeLang] = useState<CodeLang>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("ochomiles-lang");
      if (saved === "go" || saved === "python") return saved;
    }
    return "python";
  });
  const [codePy, setCodePy] = useState("");
  const [codeGo, setCodeGo] = useState("");
  const code = codeLang === "go" ? codeGo : codePy;
  const codeLangKey = codeLang === "go" ? "go" : "py";
  const [rolling, setRolling] = useState(false);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<SolveOutcome | null>(null);
  const [passedBanner, setPassedBanner] = useState(false);
  const [toolsCount, setToolsCount] = useState(tools);
  const [equippedItems, setEquippedItems] = useState(equipped);
  const [summitInfo, setSummitInfo] = useState<{ tools: number; funFact: FunFact | null; gear: Gear | null } | null>(
    null
  );
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const maxReached = status === "summited" ? 10 : camp;
  const pct = (maxReached / 10) * 100;

  useEffect(() => {
    if (progress.pending && progress.status !== "summited") {
      void roll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectLang(l: CodeLang) {
    if (l === codeLang) return;
    setCodeLang(l);
    try {
      window.localStorage.setItem("ochomiles-lang", l);
    } catch {
      /* ignore */
    }
  }

  function setCode(next: string) {
    if (codeLang === "go") setCodeGo(next);
    else setCodePy(next);
  }

  async function roll() {
    if (rolling || running) return;
    setRolling(true);
    setOutcome(null);
    setPassedBanner(false);
    try {
      const res = await fetch("/api/game/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mountainId: mountain.id }),
      });
      const data = await res.json();
      if (!data.ok) return;
      setWeather(data.weather as Weather);
      setGuarded(!!data.guarded);
      setCamp(data.camp);
      if (data.challenge) {
        const next = data.challenge as PublicChallenge;
        setChallenge(next);
        setCodePy(next.starterPy);
        setCodeGo(next.starterGo);
        setTimeout(() => editorRef.current?.focus(), 200);
      } else {
        setChallenge(null);
      }
      if (data.summited) {
        setStatus("summited");
        setSummitInfo({ tools: 0, funFact: null, gear: (data.gear as Gear) ?? null });
        router.refresh();
      }
    } finally {
      setRolling(false);
    }
  }

  async function run() {
    if (!challenge || running) return;
    setRunning(true);
    setPassedBanner(false);
    try {
      const res = await fetch("/api/game/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mountainId: mountain.id, code, lang: codeLang }),
      });
      const data = (await res.json()) as { ok: boolean } & SolveOutcome;
      if (!data.ok) return;
      setOutcome(data);
      if (data.passed) {
        setCamp(data.camp);
        setChallenge(null);
        setPassedBanner(true);
        if (data.rewards) {
          setToolsCount((n) => n + data.rewards!.tools);
          if (data.rewards.gear) setEquippedItems((prev) => [...prev, data.rewards!.gear!.id]);
        }
        if (data.summited) {
          setStatus("summited");
          setSummitInfo({
            tools: data.rewards?.tools ?? 0,
            funFact: data.rewards?.funFact ?? null,
            gear: data.rewards?.gear ?? null,
          });
          router.refresh();
        }
      }
    } finally {
      setRunning(false);
    }
  }

  function handleEditorKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = e.shiftKey ? unindentBlock(code, start, end) : indentBlock(code, start, end);
    setCode(next.code);
    requestAnimationFrame(() => {
      el.selectionStart = next.cursor;
      el.selectionEnd = next.cursor;
    });
  }

  async function restart() {
    if (typeof window !== "undefined" && !window.confirm(t.mountain.restartConfirm)) return;
    await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mountainId: mountain.id, restart: true }),
    });
    setCamp(0);
    setStatus("in_progress");
    setWeather(null);
    setChallenge(null);
    setOutcome(null);
    setSummitInfo(null);
    setPassedBanner(false);
    router.refresh();
  }

  function nextCamp() {
    setPassedBanner(false);
    setOutcome(null);
    setWeather(null);
    setChallenge(null);
    setCodePy("");
    setCodeGo("");
  }

  const errorText = useMemo(() => {
    if (!outcome?.error) return null;
    switch (outcome.error) {
      case "no_solution":
        return t.mountain.errorNoSolution;
      case "timeout":
        return t.mountain.errorTimeout;
      case "crashed":
        return t.mountain.errorCrashed;
      case "no_pending":
        return t.mountain.errorNoPending;
      case "student_error":
        return t.mountain.errorStudent;
      default:
        return t.mountain.errorCrashed;
    }
  }, [outcome, t]);

  return (
    <div className="space-y-6">
      <section
        className={`card-glass relative overflow-hidden rounded-3xl p-6 ${
          weather === "storm" ? "animate-storm" : ""
        }`}
        style={{ background: `linear-gradient(160deg, ${mountain.palette.from}22, transparent 60%)` }}
      >
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <MountainSilhouette
            profile={mountain.profile}
            palette={mountain.palette}
            idSuffix={`mount-${mountain.id}`}
            summitReached={status === "summited"}
            className="mx-auto w-full max-w-[260px] sm:mx-0"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-ice/70">
                #{mountain.rank}
              </span>
              <h1 className="text-3xl font-extrabold">{mountain.name}</h1>
            </div>
            <p className="mt-1 text-sm text-ice/60">
              {mountain.height.toLocaleString()} m · {pick(mountain.countries, lang)}
            </p>
            <p className="mt-3 max-w-2xl text-sm text-ice/80">{pick(mountain.intro, lang)}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat label={t.mountain.altitude} value={`${mountain.height.toLocaleString()} m`} />
              <MiniStat label={t.mountain.location} value={pick(mountain.countries, lang)} />
              <MiniStat label={t.nav.tools} value={toolsCount.toString()} />
            </div>
          </div>
          <div className="hidden lg:block">
            <Avatar gender={gender} equipped={equippedItems} size={120} />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-ice/60">
            <span>{t.mountain.baseCamp}</span>
            <span>
              {t.home.camp} {maxReached}/10
            </span>
            <span>{t.mountain.summit}</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-glacier via-ice to-summit transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between">
            {Array.from({ length: 11 }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i <= maxReached ? "bg-summit" : i === maxReached + 1 ? "bg-glacier" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {status === "summited" && !summitInfo && (
        <section className="card-glass rounded-3xl p-6 text-center">
          <div className="text-4xl">🚩</div>
          <h2 className="mt-2 text-2xl font-bold text-summit">{t.mountain.summitTitle}</h2>
          <p className="mt-2 text-sm text-ice/70">{t.mountain.summitText}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/home" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              {t.mountain.backHome}
            </Link>
            <button
              type="button"
              onClick={restart}
              className="rounded-xl bg-glacier/20 px-4 py-2 text-sm font-semibold text-glacier hover:bg-glacier/30"
            >
              {t.mountain.restart}
            </button>
          </div>
        </section>
      )}

      {status !== "summited" && (
        <section className="card-glass rounded-3xl p-6">
          {!weather && !challenge && (
            <div className="text-center">
              <p className="text-sm text-ice/60">{t.weather.chances}</p>
              <button
                type="button"
                onClick={roll}
                disabled={rolling}
                className="mt-4 rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-6 py-3 font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              >
                {rolling ? t.common.loading : camp === 0 ? t.mountain.start : t.mountain.startDay}
              </button>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={restart}
                  className="text-xs text-ice/40 hover:text-ice/70"
                >
                  {t.mountain.restart}
                </button>
              </div>
            </div>
          )}

          {weather && (
            <div className="animate-fade-up">
              <h2 className="text-lg font-bold">{t.mountain.dayResult}</h2>
              <div
                className={`mt-3 rounded-2xl border p-4 ${
                  weather === "sunny"
                    ? "border-summit/40 bg-summit/10"
                    : weather === "storm"
                      ? "border-alpenglow/40 bg-alpenglow/10"
                      : "border-glacier/40 bg-glacier/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {weather === "sunny" ? "☀️" : weather === "storm" ? "⛈️" : "🌨️"}
                  </span>
                  <div>
                    <h3 className="font-bold">
                      {weather === "sunny"
                        ? t.mountain.sunny
                        : weather === "storm"
                          ? t.mountain.storm
                          : t.mountain.avalanche}
                    </h3>
                    <p className="text-sm text-ice/70">
                      {weather === "sunny"
                        ? t.mountain.sunnyDesc
                        : weather === "storm"
                          ? t.mountain.stormDesc
                          : guarded
                            ? t.mountain.guardedDesc
                            : t.mountain.avalancheDesc}
                    </p>
                  </div>
                </div>
                {weather === "sunny" && (
                  <p className="mt-3 text-sm font-semibold text-summit">
                    {t.mountain.advanceFree} {camp}/10 →
                  </p>
                )}
                {(weather === "sunny" || weather === "avalanche") && !challenge && (
                  <button
                    type="button"
                    onClick={nextCamp}
                    className="mt-3 rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-5 py-2.5 font-bold text-night hover:brightness-110"
                  >
                    {t.mountain.continue} →
                  </button>
                )}
                {weather === "storm" && !challenge && (
                  <p className="mt-3 text-sm text-ice/60">{t.mountain.notStorm}</p>
                )}
              </div>
            </div>
          )}

          {passedBanner && outcome?.passed && !outcome.summited && (
            <div className="mt-4 animate-fade-up space-y-3 rounded-2xl border border-summit/40 bg-summit/10 p-4">
              <h3 className="font-bold text-summit">
                🎉 {t.mountain.testsPassed} {outcome.passedCount}/{outcome.total}
              </h3>
              {outcome.rewards && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToolsReward amount={outcome.rewards.tools} label={t.mountain.toolsEarned} />
                  {outcome.rewards.funFact && (
                    <FunFactReward fact={outcome.rewards.funFact} label={t.mountain.funFact} />
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={nextCamp}
                  className="rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-5 py-2.5 font-bold text-night hover:brightness-110"
                >
                  {t.mountain.nextChallenge}
                </button>
              </div>
            </div>
          )}

          {challenge && (
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <div className="animate-fade-up">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-alpenglow/20 px-2 py-1 text-[10px] font-bold uppercase text-alpenglow">
                    Tier {challenge.tier}
                  </span>
                  <h2 className="text-lg font-bold">{pick(challenge.title, lang)}</h2>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ice/80">{pick(challenge.statement, lang)}</p>
                <p className="mt-3 rounded-xl border border-white/10 bg-night/40 p-3 text-xs text-ice/60">
                  <span className="font-semibold uppercase tracking-wide">{t.mountain.types}: </span>
                  {pick(codeLang === "go" ? challenge.typesGo : challenge.typesPy, lang)}
                </p>

                <div className="mt-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ice/60">
                    {t.mountain.hints}
                  </h3>
                  <div className="mt-2 space-y-2">
                    <Reveal
                      title={t.mountain.hint1}
                      enabled={reveals.hint1}
                      lockedText={t.mountain.locked}
                      body={challenge.reveals.hint1 ? pick(challenge.reveals.hint1[codeLangKey], lang) : null}
                    />
                    <Reveal
                      title={t.mountain.hint2}
                      enabled={reveals.hint2}
                      lockedText={t.mountain.locked}
                      body={challenge.reveals.hint2 ? pick(challenge.reveals.hint2[codeLangKey], lang) : null}
                    />
                    <Reveal
                      title={t.mountain.example}
                      enabled={reveals.example}
                      lockedText={t.mountain.locked}
                      body={
                        challenge.reveals.example
                          ? `${t.mountain.exampleCall}: ${challenge.reveals.example.call}\n${t.mountain.exampleOutput}: ${challenge.reveals.example.output}\n${pick(challenge.reveals.example.note, lang)}`
                          : null
                      }
                    />
                    {reveals.hiddenCount && typeof challenge.reveals.hiddenCount === "number" && (
                      <Reveal
                        title={t.mountain.hiddenCases}
                        enabled
                        lockedText=""
                        body={String(challenge.reveals.hiddenCount)}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ice/40">{t.mountain.equipHint}</p>
                </div>
              </div>

              <div className="animate-fade-up">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-sm font-bold uppercase tracking-wide text-ice/60">
                    {t.mountain.codeEditor}
                  </label>
                  <div className="flex rounded-lg border border-white/15 bg-night/40 p-0.5 text-xs font-bold">
                    {(["python", "go"] as CodeLang[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => selectLang(l)}
                        className={`rounded-md px-3 py-1 transition ${
                          codeLang === l
                            ? "bg-glacier/25 text-glacier"
                            : "text-ice/50 hover:text-ice/80"
                        }`}
                      >
                        {l === "python" ? "Python" : "Go"}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  ref={editorRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleEditorKey}
                  spellCheck={false}
                  rows={16}
                  className="scrollbar-thin w-full resize-y rounded-2xl border border-white/15 bg-[#0a1120] p-4 font-mono text-sm leading-relaxed outline-none focus:border-glacier/60"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={run}
                    disabled={running}
                    className="rounded-xl bg-gradient-to-r from-summit to-emerald-400 px-5 py-2.5 font-bold text-night hover:brightness-110 disabled:opacity-60"
                  >
                    {running ? t.mountain.running : t.mountain.run}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCode(codeLang === "go" ? challenge.starterGo : challenge.starterPy)}
                    className="rounded-xl border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5"
                  >
                    {t.mountain.resetCode}
                  </button>
                </div>

                {outcome && !outcome.passed && (
                  <div className="mt-4 animate-fade-up rounded-2xl border border-alpenglow/40 bg-alpenglow/10 p-4 text-sm">
                    <h3 className="font-bold text-alpenglow">
                      {t.mountain.testsFailed} {outcome.passedCount}/{outcome.total}
                    </h3>
                    {errorText && <p className="mt-1 text-ice/80">{errorText}</p>}
                    {outcome.firstFailure && (
                      <div className="mt-3 space-y-1 font-mono text-xs text-ice/80">
                        <p className="font-sans font-semibold text-ice/60">
                          {t.mountain.caseFailed} {outcome.firstFailure.index + 1}/{outcome.firstFailure.total}
                        </p>
                        {outcome.firstFailure.args.length > 0 && (
                          <p>
                            {t.mountain.withArgs}: {outcome.firstFailure.args.join(", ")}
                          </p>
                        )}
                        <p>
                          <span className="text-ice/50">{t.mountain.expected}:</span>{" "}
                          <span className="text-summit">{outcome.firstFailure.expected}</span>
                        </p>
                        <p>
                          <span className="text-ice/50">{t.mountain.got}:</span>{" "}
                          <span className="text-alpenglow">{outcome.firstFailure.actual}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="card-glass rounded-3xl p-6">
        <h2 className="text-lg font-bold">{t.mountain.story}</h2>
        <p className="mt-3 text-sm text-ice/80">
          <span className="font-semibold text-glacier">{t.mountain.firstAscent}: </span>
          {pick(mountain.firstAscent, lang)}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {mountain.facts.map((f, i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-night/40 px-3 py-2 text-sm text-ice/75">
              {pick(f, lang)}
            </li>
          ))}
        </ul>
        <Link
          href={`/wiki?mountain=${mountain.id}`}
          className="mt-4 inline-block text-sm text-glacier hover:underline"
        >
          {t.mountain.viewWiki}
        </Link>
      </section>

      {summitInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur">
          <div className="card-glass animate-fade-up max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 text-center">
            <div className="text-5xl">🏔️🚩</div>
            <h2 className="mt-3 text-2xl font-extrabold text-summit">{t.mountain.summitTitle}</h2>
            <p className="mt-2 text-sm text-ice/80">
              {mountain.name} · {mountain.height.toLocaleString()} m
            </p>
            <p className="mt-2 text-sm text-ice/70">{t.mountain.summitText}</p>

            {summitInfo.gear && (
              <div className="mt-5 text-left">
                <GearReward
                  gear={summitInfo.gear}
                  label={t.mountain.summitGear}
                  equippedNote={t.mountain.summitAutoEquip}
                />
              </div>
            )}

            {summitInfo.tools > 0 && (
              <div className="mt-3 text-left">
                <ToolsReward amount={summitInfo.tools} label={t.mountain.toolsEarned} />
              </div>
            )}

            {summitInfo.funFact && (
              <div className="mt-3 text-left">
                <FunFactReward fact={summitInfo.funFact} label={t.mountain.funFact} />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/home"
                className="rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-5 py-2.5 font-bold text-night hover:brightness-110"
              >
                {t.mountain.backHome}
              </Link>
              <Link
                href={`/wiki?mountain=${mountain.id}`}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5"
              >
                {t.mountain.viewWiki}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-night/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-ice/50">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function Reveal({
  title,
  enabled,
  lockedText,
  body,
}: {
  title: string;
  enabled: boolean;
  lockedText: string;
  body: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-night/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-sm font-semibold text-ice/80">
          {title} {!enabled && <span className="text-ice/40">🔒</span>}
        </span>
        <span className="text-[10px] text-ice/40">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-white/10 px-3 py-2 text-sm text-ice/70">
          {enabled ? body ?? "—" : lockedText}
        </p>
      )}
    </div>
  );
}
