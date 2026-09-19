import type { Metadata } from "next";
import "./globals.css";
import { db, getLang, type UserRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "14 Ochomiles — Escala los 8.000",
  description:
    "Juego para escalar los 14 ochomiles resolviendo retos de programación en Python. Climb the 14 eight-thousanders by solving Python challenges.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as UserRow | undefined)
    : undefined;
  const lang = user ? getLang(user.id) : "es";

  return (
    <html lang={lang} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <LanguageProvider initial={lang}>
          <Nav
            user={
              user
                ? {
                    name: user.avatar_name,
                    gender: user.avatar_gender === "female" ? "female" : "male",
                    username: user.username,
                  }
                : null
            }
          />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
