"use client";

export function SterilizationReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
    >
      Exportar para PDF
    </button>
  );
}
