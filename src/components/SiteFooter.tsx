"use client";

import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-white/5 py-6 text-center text-xs text-ice/50">
      🏔️ {t.app.name} · {t.app.tagline}
    </footer>
  );
}
