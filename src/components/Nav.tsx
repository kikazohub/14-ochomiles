"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface NavUser {
  name: string;
  gender: "male" | "female";
  username: string;
}

export function Nav({ user }: { user: NavUser | null }) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={user ? "/home" : "/"} className="flex items-center gap-2">
          <span className="text-xl">🏔️</span>
          <span className="font-extrabold tracking-tight">{t.app.name}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm text-ice/80 sm:flex">
          {user && (
            <>
              <Link className="rounded-lg px-3 py-1.5 hover:bg-white/5" href="/home">
                {t.nav.home}
              </Link>
              <Link className="rounded-lg px-3 py-1.5 hover:bg-white/5" href="/wiki">
                {t.nav.wiki}
              </Link>
              <Link className="rounded-lg px-3 py-1.5 hover:bg-white/5" href="/progress">
                {t.nav.progress}
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs sm:flex">
                <span>{user.gender === "female" ? "👩‍🚀" : "🧗"}</span>
                <span className="font-semibold">{user.name}</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
              >
                {t.nav.logout}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
