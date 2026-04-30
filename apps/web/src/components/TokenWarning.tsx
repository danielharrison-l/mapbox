export function TokenWarning() {
  return (
    <section
      className="fixed top-6 left-6 z-[1] w-[min(380px,calc(100vw-48px))] rounded-lg border border-slate-300 bg-white p-4 font-sans text-[#17202a] shadow-[0_12px_32px_rgb(15_23_42_/_14%)]"
      aria-live="polite"
    >
      <h1 className="m-0 mb-2 text-lg leading-tight font-semibold">Mapbox token ausente</h1>
      <p className="m-0 text-sm leading-relaxed text-slate-600">
        Configure VITE_MAPBOX_ACCESS_TOKEN no ambiente do frontend.
      </p>
    </section>
  );
}
