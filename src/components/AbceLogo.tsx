interface AbceLogoProps {
  height?: number;
  className?: string;
}

export function AbceLogo({ height = 120, className }: AbceLogoProps) {
  return (
    <svg
      viewBox="-21 0 112 120"
      height={height}
      width={height * 0.933}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ABCE Festas"
    >
      <defs>
        <radialGradient id="abce-balloon" cx="36%" cy="28%" r="64%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="100%" stopColor="#F9A825" />
        </radialGradient>
      </defs>

      {/* Balloon body */}
      <ellipse cx="40" cy="38" rx="30" ry="35" fill="url(#abce-balloon)" stroke="#E6A800" strokeWidth="1" />

      {/* Shine */}
      <ellipse
        cx="28" cy="23" rx="7" ry="10"
        fill="white" fillOpacity="0.28"
        transform="rotate(-20 28 23)"
      />

      {/* Knot */}
      <polygon points="37,72 40,81 43,72" fill="#E65100" />

      {/* String — short, tilted left */}
      <path d="M40,81 Q32,92 27,108" stroke="#795548" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Sparkles — 3 four-pointed stars, yellow, pulsing */}
      <g fill="#F9A825">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
        {/* Big star */}
        <path d="M80,9 L82,14 L87,16 L82,18 L80,23 L78,18 L73,16 L78,14 Z" />
        {/* Medium star */}
        <path d="M71,0 L72.5,3.5 L76,5 L72.5,6.5 L71,10 L69.5,6.5 L66,5 L69.5,3.5 Z" />
        {/* Small star */}
        <path d="M87,27 L88.2,29.8 L91,31 L88.2,32.2 L87,35 L85.8,32.2 L83,31 L85.8,29.8 Z" />
      </g>
    </svg>
  );
}
