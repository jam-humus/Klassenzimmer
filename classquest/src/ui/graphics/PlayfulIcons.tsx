/* eslint-disable react-refresh/only-export-components */
import './playful-icons.css';

export type PlayfulIcon = {
  id: string;
  title: string;
  description: string;
  Svg: () => JSX.Element;
};

type StickerTone = 'lilac' | 'gold' | 'mint' | 'sunset';
type StickerTheme = 'light' | 'dark';
type StickerSize = 'default' | 'small';

const stickerToneStyles: Record<StickerTone, { lightBg: string; darkBg: string; border: string; shadow: string }> = {
  lilac: {
    lightBg: 'linear-gradient(135deg, #ede9fe 0%, #cffafe 100%)',
    darkBg: 'linear-gradient(135deg, rgba(109, 40, 217, 0.35), rgba(14, 165, 233, 0.3))',
    border: 'rgba(124, 58, 237, 0.35)',
    shadow: '0 14px 38px rgba(124, 58, 237, 0.22)',
  },
  gold: {
    lightBg: 'linear-gradient(135deg, #fef9c3 0%, #ffe4e6 100%)',
    darkBg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.32), rgba(248, 113, 113, 0.28))',
    border: 'rgba(234, 179, 8, 0.38)',
    shadow: '0 14px 38px rgba(234, 179, 8, 0.2)',
  },
  mint: {
    lightBg: 'linear-gradient(135deg, #d1fae5 0%, #e0f2fe 100%)',
    darkBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(14, 165, 233, 0.28))',
    border: 'rgba(16, 185, 129, 0.35)',
    shadow: '0 14px 38px rgba(16, 185, 129, 0.2)',
  },
  sunset: {
    lightBg: 'linear-gradient(135deg, #fecdd3 0%, #e9d5ff 100%)',
    darkBg: 'linear-gradient(135deg, rgba(248, 113, 113, 0.35), rgba(236, 72, 153, 0.28))',
    border: 'rgba(236, 72, 153, 0.35)',
    shadow: '0 14px 38px rgba(236, 72, 153, 0.22)',
  },
};

const QuestRocket = () => (
  <svg className="playful-icon rocket" viewBox="0 0 160 160" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="rocket-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
      <linearGradient id="rocket-window" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="100%" stopColor="#93c5fd" />
      </linearGradient>
      <radialGradient id="rocket-thrust" cx="50%" cy="0%" r="70%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="60%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="rgba(251, 146, 60, 0)" />
      </radialGradient>
    </defs>
    <g className="floating">
      <ellipse cx="80" cy="132" rx="34" ry="10" fill="rgba(0,0,0,0.18)" />
      <circle cx="48" cy="52" r="6" fill="#fef9c3" className="twinkle" />
      <circle cx="122" cy="70" r="4" fill="#a5f3fc" className="twinkle" />
      <circle cx="26" cy="88" r="3" fill="#c084fc" className="twinkle" />
      <path
        d="M80 18c22 12 38 50 30 74-3 9-10 16-18 22-5 4-19 4-24 0-8-6-15-13-18-22-8-24 8-62 30-74Z"
        fill="url(#rocket-body)"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M92 50c6 10 6 22 0 32-10-6-22-6-32 0-6-10-6-22 0-32 10 6 22 6 32 0Z"
        fill="#1e293b"
        opacity="0.14"
      />
      <circle cx="80" cy="66" r="16" fill="url(#rocket-window)" stroke="#e2e8f0" strokeWidth="3" />
      <path d="M72 40c0-6 16-6 16 0" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M80 114c0 10 12 18 12 18H68s12-8 12-18Z"
        fill="#f97316"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
        className="wobble"
      />
      <path
        d="M80 114c-8 10-28 16-28 16s4-18 18-28"
        fill="#0ea5e9"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M80 114c8 10 28 16 28 16s-4-18-18-28"
        fill="#22d3ee"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M80 114c0-8 0-8 0-16" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 78c-10-2-22 6-22 6s10 10 20 12" stroke="#0f172a" strokeWidth="3" fill="none" />
      <path d="M104 78c10-2 22 6 22 6s-10 10-20 12" stroke="#0f172a" strokeWidth="3" fill="none" />
      <path d="M80 120c0 0 0 22 0 22" stroke="url(#rocket-thrust)" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M80 118c0 0 0 26 0 26"
        stroke="#fde68a"
        strokeWidth="8"
        strokeLinecap="round"
        className="flicker"
      />
    </g>
  </svg>
);

const TrophyBurst = () => (
  <svg className="playful-icon trophy" viewBox="0 0 160 160" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="trophy-cup" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="trophy-base" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <g className="floating">
      <circle cx="34" cy="38" r="6" fill="#fde68a" className="twinkle" />
      <circle cx="124" cy="48" r="5" fill="#a5b4fc" className="twinkle" />
      <circle cx="110" cy="26" r="4" fill="#34d399" className="twinkle" />
      <path
        d="M46 32h68v32c0 16-14 28-34 30l-6 6-6-6c-20-2-34-14-34-30V32Z"
        fill="url(#trophy-cup)"
        stroke="#0f172a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M52 32c0 10-6 18-18 18-4 0-6 4-6 10s6 12 14 12c14 0 22-18 22-40"
        fill="#fde68a"
        stroke="#0f172a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M108 32c0 10 6 18 18 18 4 0 6 4 6 10s-6 12-14 12c-14 0-22-18-22-40"
        fill="#fde68a"
        stroke="#0f172a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="60" r="16" fill="#fef3c7" stroke="#0f172a" strokeWidth="4" />
      <path
        d="M80 44c6 0 8 4 8 8 0 8-8 8-8 8s-8 0-8-8c0-4 2-8 8-8Z"
        fill="#f59e0b"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <path d="M64 98h32l-6 18H70l-6-18Z" fill="#fbbf24" stroke="#0f172a" strokeWidth="4" />
      <rect x="52" y="116" width="56" height="18" rx="8" fill="url(#trophy-base)" />
      <rect x="52" y="116" width="56" height="18" rx="8" fill="none" stroke="#0f172a" strokeWidth="3" />
      <circle cx="80" cy="78" r="6" fill="#fde68a" className="pulse-star" />
    </g>
  </svg>
);

const RainbowBook = () => (
  <svg className="playful-icon book" viewBox="0 0 160 160" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="book-cover" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="book-ribbon" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#fb7185" />
      </linearGradient>
    </defs>
    <g className="floating">
      <rect x="38" y="28" width="70" height="104" rx="14" fill="url(#book-cover)" stroke="#0f172a" strokeWidth="4" />
      <path
        d="M108 40c10 0 16 10 16 22v56c0 10-6 14-12 14H62c-8 0-14-6-14-14"
        fill="#a5b4fc"
        opacity="0.3"
      />
      <rect x="52" y="40" width="70" height="104" rx="14" fill="url(#book-cover)" stroke="#0f172a" strokeWidth="4" />
      <rect x="66" y="40" width="8" height="104" fill="#0ea5e9" />
      <rect x="82" y="40" width="8" height="104" fill="#14b8a6" />
      <rect x="98" y="40" width="8" height="104" fill="#f59e0b" />
      <rect x="114" y="40" width="8" height="104" fill="#f97316" />
      <path
        d="M118 40c4 0 6 4 6 8v90c0 6-4 10-10 10H56"
        stroke="#0f172a"
        strokeWidth="4"
        fill="none"
      />
      <path
        d="M88 40c4 0 6 4 6 8v82l-10-10-10 10V48c0-4 2-8 6-8h8Z"
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <path d="M84 40v76l-8-8" stroke="#0ea5e9" strokeWidth="3" />
      <path d="M96 52h12" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 68h18" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 84h14" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M74 40h12l-6 26c0 0-4-8-10-10l4-16Z"
        fill="url(#book-ribbon)"
        stroke="#0f172a"
        strokeWidth="3"
        className="wobble"
      />
      <circle cx="56" cy="36" r="6" fill="#a5f3fc" className="twinkle" />
      <circle cx="122" cy="46" r="4" fill="#fef08a" className="twinkle" />
    </g>
  </svg>
);

const XPComet = () => (
  <svg className="playful-icon comet" viewBox="0 0 160 160" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="comet-tail" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
        <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.1" />
      </linearGradient>
      <radialGradient id="comet-core" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="70%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#f97316" />
      </radialGradient>
    </defs>
    <g className="floating">
      <path
        d="M20 94c40-12 70-34 118-46l-26 24c-6 6-4 16 4 18l22 8c-46 14-92 22-118-4Z"
        fill="url(#comet-tail)"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
        className="comet-tail"
      />
      <circle cx="112" cy="92" r="22" fill="url(#comet-core)" stroke="#0f172a" strokeWidth="4" />
      <circle cx="110" cy="90" r="10" fill="#fef9c3" opacity="0.9" />
      <circle cx="98" cy="88" r="4" fill="#bae6fd" className="twinkle" />
      <circle cx="130" cy="96" r="4" fill="#fef08a" className="twinkle" />
      <path d="M118 78c2-4 8-4 12 0" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <path d="M104 104c6 6 18 6 24 0" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

export const playfulIcons: PlayfulIcon[] = [
  {
    id: 'quest-rocket',
    title: 'Quest-Rakete',
    description: 'Setzt Ziele in Bewegung – ideal für Quests und Events.',
    Svg: QuestRocket,
  },
  {
    id: 'trophy-burst',
    title: 'Glitzer-Pokal',
    description: 'Feiert Rankings und Saison-Highlights mit funkelnden Details.',
    Svg: TrophyBurst,
  },
  {
    id: 'rainbow-book',
    title: 'Regenbogen-Buch',
    description: 'Perfekt für Wissenshappen, Regeln oder Lernressourcen.',
    Svg: RainbowBook,
  },
  {
    id: 'xp-comet',
    title: 'XP-Komet',
    description: 'Visueller Boost für XP-Gewinne, Level-Ups und Achievements.',
    Svg: XPComet,
  },
];

export function PlayfulSticker({
  iconId = 'quest-rocket',
  label,
  tone = 'lilac',
  theme = 'light',
  size = 'default',
}: {
  iconId?: PlayfulIcon['id'];
  label: string;
  tone?: StickerTone;
  theme?: StickerTheme;
  size?: StickerSize;
}) {
  const icon = playfulIcons.find((entry) => entry.id === iconId) ?? playfulIcons[0];
  const Svg = icon.Svg;
  const palette = stickerToneStyles[tone];
  const classNames = ['playful-sticker'];

  if (theme === 'dark') {
    classNames.push('playful-sticker--dark');
  }
  if (size === 'small') {
    classNames.push('playful-sticker--small');
  }

  return (
    <div
      className={classNames.join(' ')}
      style={{
        background: theme === 'dark' ? palette.darkBg : palette.lightBg,
        borderColor: palette.border,
        boxShadow: palette.shadow,
      }}
      role="img"
      aria-label={label}
    >
      <div className="playful-sticker__icon">
        <Svg />
      </div>
      <div className="playful-sticker__text">
        <span className="playful-sticker__eyebrow">Bunt &amp; spielerisch</span>
        <span className="playful-sticker__label">{label}</span>
      </div>
    </div>
  );
}
