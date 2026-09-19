"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { MountainSilhouette } from "@/components/MountainSilhouette";
import type { MountainProfile } from "../../data/types";

interface Preview {
  id: number;
  name: string;
  height: number;
  rank: number;
  profile: MountainProfile;
  palette: { from: string; to: string; accent: string };
}

export function Landing({ mountains }: { mountains: Preview[] }) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login" ? { username, password } : { username, password, name, gender };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(
          data.error === "taken"
            ? t.auth.taken
            : data.error === "username"
              ? t.auth.usernameError
              : data.error === "password"
                ? t.auth.passwordError
                : t.auth.invalid
        );
        return;
      }
      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
      <section className="animate-fade-up">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-4xl">🏔️</span>
          <div className="flex overflow-hidden rounded-lg border border-white/15 text-xs">
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-2.5 py-1.5 ${lang === "es" ? "bg-glacier/25 font-bold" : "hover:bg-white/5"}`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1.5 ${lang === "en" ? "bg-glacier/25 font-bold" : "hover:bg-white/5"}`}
            >
              EN
            </button>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          <span className="bg-gradient-to-r from-glacier via-ice to-alpenglow bg-clip-text text-transparent">
            {t.app.name}
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ice/70">{t.app.tagline}</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {mountains.slice(0, 6).map((m) => (
            <div
              key={m.id}
              className="card-glass rounded-2xl p-3 transition hover:-translate-y-1 hover:border-glacier/40"
            >
              <MountainSilhouette
                profile={m.profile}
                palette={m.palette}
                idSuffix={`land-${m.id}`}
                className="w-full"
              />
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold">{m.name}</span>
                <span className="text-xs text-ice/60">
                  {m.height.toLocaleString()} {t.common.meters}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-glass animate-fade-up rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold">
          {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
        </h2>
        <p className="mt-1 text-sm text-ice/60">{t.auth.guest}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-ice/60">
              {t.auth.username}
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-white/15 bg-night/60 px-3 py-2.5 outline-none focus:border-glacier/60"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-ice/60">
              {t.auth.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-white/15 bg-night/60 px-3 py-2.5 outline-none focus:border-glacier/60"
              required
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-ice/60">
                  {t.auth.name}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tenzing"
                  className="w-full rounded-xl border border-white/15 bg-night/60 px-3 py-2.5 outline-none focus:border-glacier/60"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-ice/60">
                  {t.auth.gender}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`rounded-xl border px-3 py-3 text-center transition ${
                        gender === g
                          ? "border-alpenglow/60 bg-alpenglow/15"
                          : "border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <div className="text-2xl">{g === "female" ? "👩‍🚀" : "🧗"}</div>
                      <div className="mt-1 text-sm">{g === "female" ? t.auth.female : t.auth.male}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-xl border border-alpenglow/40 bg-alpenglow/10 px-3 py-2 text-sm text-alpenglow">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-glacier to-sky-500 px-4 py-3 font-bold text-night transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? t.common.loading : mode === "login" ? t.auth.login : t.auth.register}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-glacier hover:underline"
        >
          {mode === "login" ? t.auth.toRegister : t.auth.toLogin}
        </button>
      </section>
    </div>
  );
}
