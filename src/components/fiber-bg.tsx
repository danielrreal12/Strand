export function FiberBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 strand-haze" />
      <div className="absolute inset-0 strand-grid opacity-60" />
      <svg
        className="fiber-drift absolute -left-[10%] top-[18%] h-[40%] w-[120%] opacity-70"
        viewBox="0 0 1200 240"
        fill="none"
      >
        <path
          d="M0 140 C180 40 320 220 520 120 S860 40 1200 150"
          stroke="url(#fiber1)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M0 170 C220 90 380 200 600 150 S920 100 1200 180"
          stroke="url(#fiber2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <defs>
          <linearGradient id="fiber1" x1="0" y1="0" x2="1200" y2="0">
            <stop stopColor="#5ee4d0" stopOpacity="0" />
            <stop offset="0.35" stopColor="#5ee4d0" stopOpacity="0.85" />
            <stop offset="0.7" stopColor="#e8a35c" stopOpacity="0.55" />
            <stop offset="1" stopColor="#5ee4d0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fiber2" x1="0" y1="0" x2="1200" y2="0">
            <stop stopColor="#7eb8ff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7eb8ff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#7eb8ff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
