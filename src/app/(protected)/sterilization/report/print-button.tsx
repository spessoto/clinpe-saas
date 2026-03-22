"use client";

export function SterilizationReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#0F5AA5] to-[#0D9488] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 17H7a2 2 0 01-2-2v-3a2 2 0 012-2h10a2 2 0 012 2v3a2 2 0 01-2 2z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 10V4h10v6"
        />
      </svg>
      Exportar para PDF
    </button>
  );
}
