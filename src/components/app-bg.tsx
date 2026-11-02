export function AppBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 strand-haze" />
      <div className="absolute inset-0 strand-grid opacity-60" />
    </div>
  );
}
