"use client";

import { jsPDF } from "jspdf";

type PopDownloadPdfButtonProps = {
  title: string;
  content: string;
};

function toPdfFileName(title: string) {
  return `${
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pop-documento"
  }.pdf`;
}

export function PopDownloadPdfButton({
  title,
  content,
}: PopDownloadPdfButtonProps) {
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const textWidth = pageWidth - margin * 2;

    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);

    const titleLines = doc.splitTextToSize(title, textWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 18 + 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const lineHeight = 16;

    for (const rawLine of content.split("\n")) {
      if (!rawLine.trim()) {
        y += lineHeight * 0.7;
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        continue;
      }

      const wrappedLines = doc.splitTextToSize(rawLine, textWidth) as string[];

      if (y + wrappedLines.length * lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(wrappedLines, margin, y);
      y += wrappedLines.length * lineHeight;
    }

    doc.save(toPdfFileName(title));
  };

  return (
    <button
      type="button"
      onClick={handleDownloadPdf}
      className="rounded-md border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5"
    >
      Baixar POP em PDF
    </button>
  );
}
