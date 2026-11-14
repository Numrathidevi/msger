export function SkillPathLogo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="28"
          height="28"
          rx="8"
          className="fill-[#15803D]"
        />
        <path
          d="M7.5 19L12.5 13.5L16 17L20.5 9.5"
          stroke="white"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 9.5H20.5V13"
          stroke="white"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span
          className={`font-display text-lg font-bold tracking-tight leading-none ${
            inverted ? 'text-white' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          SkillPath AI
        </span>
      )}
    </div>
  );
}
