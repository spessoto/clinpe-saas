"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PeriodToggle({ period }: { period: "monthly" | "annual" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(newPeriod: "monthly" | "annual") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", newPeriod);
    router.push(`/billing?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-surface p-1">
      <button
        type="button"
        onClick={() => setPeriod("monthly")}
        className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
          period === "monthly"
            ? "bg-primary text-white shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Mensal
      </button>
      <button
        type="button"
        onClick={() => setPeriod("annual")}
        className={`relative rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
          period === "annual"
            ? "bg-primary text-white shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Anual
        <span className="absolute -right-1 -top-2.5 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">
          -10%
        </span>
      </button>
    </div>
  );
}
