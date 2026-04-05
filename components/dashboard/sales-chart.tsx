"use client";

type DayData = {
  label: string;
  fecha: string;
  total: number;
};

type SalesChartProps = {
  data: DayData[];
};

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function SalesChart({ data }: SalesChartProps) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((day) => {
          const pct = (day.total / max) * 100;
          const is_today = day.fecha === new Date().toISOString().slice(0, 10);

          return (
            <div key={day.fecha} className="group flex flex-1 flex-col items-center gap-1">
              {/* Tooltip */}
              <div className="hidden group-hover:flex absolute -mt-8 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl z-10 whitespace-nowrap">
                {currency_formatter.format(day.total)}
              </div>

              {/* Barra */}
              <div className="relative flex w-full flex-col justify-end" style={{ height: "9rem" }}>
                <div
                  className={`w-full rounded-t-xl transition-all duration-500 ${
                    day.total === 0
                      ? "bg-slate-800"
                      : is_today
                        ? "bg-sky-400"
                        : "bg-sky-400/40 group-hover:bg-sky-400/60"
                  }`}
                  style={{ height: `${Math.max(pct, day.total > 0 ? 4 : 2)}%` }}
                />
              </div>

              {/* Label día */}
              <span
                className={`text-xs font-semibold ${
                  is_today ? "text-sky-300" : "text-slate-500"
                }`}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Eje Y — referencia */}
      <div className="mt-3 flex justify-between text-xs text-slate-600">
        <span>$0</span>
        <span>{currency_formatter.format(max / 2)}</span>
        <span>{currency_formatter.format(max)}</span>
      </div>
    </div>
  );
}
