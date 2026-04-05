export default function ProveedoresLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="rounded-[28px] border border-white/[0.06] bg-[#111114] p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-20 rounded-full bg-zinc-800" />
            <div className="h-8 w-44 rounded-xl bg-zinc-800" />
            <div className="h-4 w-80 rounded-full bg-zinc-900" />
          </div>
          <div className="h-11 w-36 rounded-2xl bg-zinc-800" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-4 space-y-2">
              <div className="h-3 w-24 rounded-full bg-zinc-800" />
              <div className="h-7 w-20 rounded-lg bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/[0.06] bg-[#111114] p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="grid grid-cols-6 gap-4 bg-white/[0.02] px-4 py-3 border-b border-white/10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 rounded-full bg-zinc-800" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-white/5 last:border-0 items-center"
            >
              <div className="space-y-1.5 col-span-2">
                <div className="h-3 w-40 rounded-full bg-zinc-800" />
                <div className="h-2.5 w-28 rounded-full bg-zinc-900" />
              </div>
              <div className="h-3 w-24 rounded-full bg-zinc-900" />
              <div className="h-3 w-16 rounded-full bg-zinc-900" />
              <div className="h-3 w-20 rounded-full bg-zinc-900" />
              <div className="h-5 w-24 rounded-full bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
