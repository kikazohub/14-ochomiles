import type { ReactNode } from "react";

export type AvatarGender = "male" | "female";

interface AvatarProps {
  gender: AvatarGender;
  equipped: string[];
  size?: number;
  className?: string;
  glow?: boolean;
}

function has(list: string[], id: string): boolean {
  return list.includes(id);
}

export function Avatar({ gender, equipped, size = 200, className, glow }: AvatarProps) {
  const skin = "#f0c39c";
  const skinShade = "#d9a578";
  const hair = gender === "female" ? "#3b2317" : "#241812";
  const pants = "#20375e";
  const shirt = "#dbe6f4";

  const suit = has(equipped, "traje_gh2");
  const boots = has(equipped, "botas_plumas");
  const helmet = has(equipped, "casco_k2");
  const goggles = has(equipped, "gafas_kanchenjunga");
  const harness = has(equipped, "arnes_lhotse");
  const rope = has(equipped, "cuerda_chooyu");
  const axes = has(equipped, "piolets_makalu");
  const oxygen = has(equipped, "oxigeno_dhaulagiri");
  const headlamp = has(equipped, "frontal_manaslu");
  const compass = has(equipped, "brujula_nanga");
  const tent = has(equipped, "tienda_annapurna");
  const radio = has(equipped, "radio_gasherbrum");
  const gps = has(equipped, "gps_broadpeak");
  const binoculars = has(equipped, "prismaticos_shisha");

  const layers: ReactNode[] = [];

  // ----- Legs -----
  layers.push(
    <g key="legs">
      <rect x="84" y="150" width="15" height="62" rx="7" fill={pants} />
      <rect x="101" y="150" width="15" height="62" rx="7" fill={pants} />
    </g>
  );

  // ----- Arms -----
  layers.push(
    <g key="arms">
      <rect x="58" y="96" width="17" height="60" rx="8" fill={suit ? "#e2603f" : shirt} transform="rotate(6 66 100)" />
      <rect x="125" y="96" width="17" height="60" rx="8" fill={suit ? "#e2603f" : shirt} transform="rotate(-6 134 100)" />
      <circle cx="60" cy="160" r="9" fill={skin} />
      <circle cx="140" cy="160" r="9" fill={skin} />
    </g>
  );

  // ----- Torso -----
  layers.push(
    <g key="torso">
      <path
        d="M72 92 Q100 82 128 92 L132 152 Q100 162 68 152 Z"
        fill={suit ? "#e2603f" : shirt}
        stroke={suit ? "#b23f28" : "#b9c8dc"}
        strokeWidth="1.5"
      />
      {suit && (
        <>
          <path d="M100 88 L100 158" stroke="#b23f28" strokeWidth="2" />
          <rect x="74" y="120" width="52" height="7" rx="3" fill="#b23f28" opacity="0.7" />
        </>
      )}
    </g>
  );

  // ----- Neck + head -----
  layers.push(
    <g key="head">
      <rect x="94" y="74" width="12" height="16" rx="5" fill={skinShade} />
      {gender === "female" && (
        <path d="M70 70 Q64 120 78 138 L84 132 Q76 104 82 74 Z" fill={hair} />
      )}
      <circle cx="100" cy="62" r="27" fill={skin} />
      {gender === "female" && (
        <path d="M73 60 Q78 30 100 30 Q122 30 127 60 Q120 44 100 44 Q80 44 73 60 Z" fill={hair} />
      )}
      {gender === "male" && (
        <path d="M74 58 Q76 32 100 32 Q124 32 126 58 Q118 46 100 46 Q82 46 74 58 Z" fill={hair} />
      )}
      <circle cx="90" cy="63" r="2.6" fill="#2a2a35" />
      <circle cx="110" cy="63" r="2.6" fill="#2a2a35" />
      <path d="M93 74 Q100 79 107 74" stroke="#a86b52" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );

  // ----- Boots -----
  if (boots) {
    layers.push(
      <g key="boots">
        <rect x="79" y="200" width="26" height="20" rx="6" fill="#7a4a24" />
        <rect x="95" y="200" width="26" height="20" rx="6" fill="#7a4a24" />
        <rect x="79" y="214" width="26" height="6" rx="3" fill="#38230f" />
        <rect x="95" y="214" width="26" height="6" rx="3" fill="#38230f" />
      </g>
    );
  } else {
    layers.push(
      <g key="shoes">
        <rect x="82" y="206" width="20" height="13" rx="5" fill="#2b3b55" />
        <rect x="98" y="206" width="20" height="13" rx="5" fill="#2b3b55" />
      </g>
    );
  }

  // ----- Backpack / tent -----
  if (tent) {
    layers.push(
      <g key="tent">
        <rect x="67" y="96" width="16" height="52" rx="7" fill="#2f6b4f" />
        <rect x="117" y="96" width="16" height="52" rx="7" fill="#2f6b4f" />
        <rect x="70" y="78" width="60" height="16" rx="8" fill="#3f8f6a" />
        <path d="M70 86 L130 86" stroke="#245c43" strokeWidth="2" />
      </g>
    );
  }

  // ----- Harness -----
  if (harness) {
    layers.push(
      <g key="harness">
        <rect x="70" y="140" width="60" height="10" rx="4" fill="#f59e0b" />
        <rect x="84" y="150" width="9" height="16" rx="3" fill="#f59e0b" />
        <rect x="107" y="150" width="9" height="16" rx="3" fill="#f59e0b" />
      </g>
    );
  }

  // ----- Rope -----
  if (rope) {
    layers.push(
      <g key="rope">
        <path d="M76 96 L126 148" stroke="#eab308" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="130" cy="150" r="10" fill="none" stroke="#eab308" strokeWidth="4" />
        <circle cx="130" cy="150" r="5" fill="none" stroke="#facc15" strokeWidth="3" />
      </g>
    );
  }

  // ----- Ice axes -----
  if (axes) {
    layers.push(
      <g key="axes">
        <rect x="50" y="120" width="4" height="42" rx="2" fill="#334155" />
        <path d="M44 122 L60 116 L60 124 Z" fill="#94a3b8" />
        <rect x="146" y="120" width="4" height="42" rx="2" fill="#334155" />
        <path d="M140 122 L156 116 L156 124 Z" fill="#94a3b8" />
      </g>
    );
  }

  // ----- Oxygen -----
  if (oxygen) {
    layers.push(
      <g key="oxygen">
        <rect x="80" y="150" width="40" height="22" rx="10" fill="#1f2937" opacity="0.85" />
        <rect x="72" y="110" width="12" height="46" rx="6" fill="#64748b" />
        <rect x="116" y="110" width="12" height="46" rx="6" fill="#64748b" />
        <rect x="82" y="52" width="36" height="18" rx="8" fill="#111827" opacity="0.55" />
        <circle cx="90" cy="61" r="4" fill="#9ca3af" />
        <circle cx="110" cy="61" r="4" fill="#9ca3af" />
      </g>
    );
  }

  // ----- Helmet + headlamp + goggles -----
  if (helmet) {
    layers.push(
      <path key="helmet" d="M71 58 Q73 27 100 27 Q127 27 129 58 Q100 48 71 58 Z" fill="#f59e0b" />
    );
  }
  if (headlamp) {
    layers.push(
      <g key="headlamp">
        <rect x="88" y="28" width="24" height="8" rx="4" fill="#334155" />
        <circle cx="100" cy="32" r="4" fill="#fef08a" className={glow ? "animate-glow" : undefined} />
      </g>
    );
  }
  if (goggles) {
    layers.push(
      <g key="goggles">
        <rect x="74" y="54" width="52" height="16" rx="8" fill="#0ea5e9" opacity="0.9" />
        <rect x="78" y="57" width="44" height="10" rx="5" fill="#38bdf8" opacity="0.6" />
      </g>
    );
  }

  // ----- Compass (wrist) -----
  if (compass) {
    layers.push(
      <g key="compass">
        <circle cx="140" cy="162" r="7" fill="#e5e7eb" stroke="#475569" strokeWidth="2" />
        <path d="M140 157 L142 162 L140 167 L138 162 Z" fill="#ef4444" />
      </g>
    );
  }

  // ----- GPS (hand) -----
  if (gps) {
    layers.push(
      <g key="gps">
        <rect x="46" y="150" width="18" height="24" rx="4" fill="#111827" />
        <rect x="49" y="154" width="12" height="12" rx="2" fill="#22d3ee" />
      </g>
    );
  }

  // ----- Radio (shoulder) -----
  if (radio) {
    layers.push(
      <g key="radio">
        <rect x="126" y="86" width="14" height="30" rx="4" fill="#1f2937" />
        <rect x="130" y="66" width="3" height="22" rx="1.5" fill="#4b5563" />
        <circle cx="133" cy="94" r="3" fill="#22c55e" />
      </g>
    );
  }

  // ----- Binoculars (neck) -----
  if (binoculars) {
    layers.push(
      <g key="binoculars">
        <path d="M84 88 Q100 104 116 88" stroke="#374151" strokeWidth="3" fill="none" />
        <rect x="78" y="98" width="12" height="16" rx="4" fill="#1f2937" />
        <rect x="110" y="98" width="12" height="16" rx="4" fill="#1f2937" />
      </g>
    );
  }

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      className={className}
      role="img"
      aria-label="avatar"
    >
      {layers}
    </svg>
  );
}
