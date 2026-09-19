import type { MountainProfile } from "../../data/types";

interface Props {
  profile: MountainProfile;
  palette: { from: string; to: string; accent: string };
  size?: number;
  className?: string;
  summitReached?: boolean;
  idSuffix?: string;
}

function shape(profile: MountainProfile): { d: string; cap: string } {
  switch (profile) {
    case "dome":
      return {
        d: "M0 118 Q55 44 100 44 Q145 44 200 118 Z",
        cap: "M74 66 Q100 46 126 66 Q113 60 100 60 Q87 60 74 66 Z",
      };
    case "twin":
      return {
        d: "M0 118 L58 34 L100 76 L150 20 L200 118 Z",
        cap: "M50 48 L66 34 L82 50 Q66 44 50 48 Z M141 36 L150 22 L160 38 Q150 33 141 36 Z",
      };
    case "ridge":
      return {
        d: "M0 118 L36 54 L92 42 L150 52 L200 118 Z",
        cap: "M70 48 Q92 40 116 50 Q98 50 82 54 Q76 50 70 48 Z",
      };
    case "spire":
      return {
        d: "M18 118 L96 10 L106 12 L120 118 Z",
        cap: "M92 26 L96 11 L101 14 L108 32 Q100 26 92 26 Z",
      };
    case "massif":
      return {
        d: "M0 118 L28 68 L68 50 L104 18 L142 56 L172 64 L200 118 Z",
        cap: "M92 32 L104 18 L118 38 Q104 30 92 32 Z",
      };
    default:
      return {
        d: "M0 118 L100 14 L200 118 Z",
        cap: "M86 38 L100 15 L115 40 Q100 32 86 38 Z",
      };
  }
}

export function MountainSilhouette({
  profile,
  palette,
  size = 200,
  className,
  summitReached,
  idSuffix = "v",
}: Props) {
  const { d, cap } = shape(profile);
  const gradId = `mg-${idSuffix}`;
  const skyId = `sky-${idSuffix}`;

  return (
    <svg viewBox="0 0 200 120" width={size} height={size * 0.6} className={className} role="img" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.to} />
          <stop offset="100%" stopColor={palette.from} />
        </linearGradient>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.from} stopOpacity="0.22" />
          <stop offset="100%" stopColor="#060b18" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="120" fill={`url(#${skyId})`} />
      <path d={d} fill={`url(#${gradId})`} stroke={palette.accent} strokeWidth="1" strokeOpacity="0.5" />
      <path d={cap} fill="#f8fbff" opacity="0.85" />
      {summitReached && (
        <g>
          <line x1="100" y1="16" x2="100" y2="40" stroke="#f8fbff" strokeWidth="2" />
          <path d="M100 16 L116 21 L100 26 Z" fill={palette.accent} />
        </g>
      )}
    </svg>
  );
}
