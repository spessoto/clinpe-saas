"use client";

import { jsPDF } from "jspdf";

type PopDownloadPdfButtonProps = {
  title: string;
  content: string;
  updatedAt?: string;
};

type LineType =
  | "mainTitle"
  | "section"
  | "subsection"
  | "bullet"
  | "paragraph"
  | "empty";

type ClassifiedLine = {
  text: string;
  type: LineType;
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
  updatedAt,
}: PopDownloadPdfButtonProps) {
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 52;
    const headerHeight = 64;
    const topOffset = 24;
    const bottomMargin = 50;
    const textWidth = pageWidth - marginX * 2;

    const contentStartY = topOffset + headerHeight + 24;

    const classifyLine = (line: string): ClassifiedLine => {
      const trimmed = line.trim();

      if (!trimmed) {
        return { text: "", type: "empty" };
      }

      if (/^MANUAL\sDE\sBOAS\sPR[ÁA]TICAS/i.test(trimmed)) {
        return { text: trimmed, type: "mainTitle" };
      }

      if (/^POP\s\d+:/i.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        return { text: trimmed, type: "section" };
      }

      if (/^[A-ZÀ-Ú0-9\s\-()]+:$/.test(trimmed)) {
        return { text: trimmed, type: "subsection" };
      }

      if (/^(?:-|•)\s+/.test(trimmed)) {
        return {
          text: trimmed.replace(/^(?:-|•)\s+/, "").trim(),
          type: "bullet",
        };
      }

      return { text: trimmed, type: "paragraph" };
    };

    const drawPageHeader = () => {
      doc.setFillColor(246, 248, 250);
      doc.rect(0, 0, pageWidth, topOffset + headerHeight, "F");

      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Manual POP", marginX, topOffset + 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const updatedText = updatedAt
        ? `Atualizado em ${updatedAt}`
        : "Documento operacional";
      doc.text(updatedText, marginX, topOffset + 34);

      doc.setDrawColor(220, 224, 229);
      doc.line(
        marginX,
        topOffset + headerHeight,
        pageWidth - marginX,
        topOffset + headerHeight,
      );
    };

    const ensurePageSpace = (currentY: number, requiredHeight: number) => {
      if (currentY + requiredHeight <= pageHeight - bottomMargin) {
        return currentY;
      }

      doc.addPage();
      drawPageHeader();
      return contentStartY;
    };

    drawPageHeader();

    let y = contentStartY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    const titleLines = doc.splitTextToSize(title, textWidth);
    y = ensurePageSpace(y, titleLines.length * 22 + 12);
    doc.text(titleLines, marginX, y);
    y += titleLines.length * 22 + 10;

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;

    const lines = content.split("\n").map(classifyLine);

    for (const line of lines) {
      if (line.type === "empty") {
        y += 7;
        continue;
      }

      let fontStyle: "normal" | "bold" = "normal";
      let fontSize = 10.5;
      let lineHeight = 14;
      let spacingBefore = 0;
      let spacingAfter = 4;
      let text = line.text;
      let x = marginX;
      let width = textWidth;

      if (line.type === "mainTitle") {
        fontStyle = "bold";
        fontSize = 14;
        lineHeight = 18;
        spacingBefore = 8;
        spacingAfter = 6;
      } else if (line.type === "section") {
        fontStyle = "bold";
        fontSize = 12;
        lineHeight = 16;
        spacingBefore = 11;
        spacingAfter = 5;
      } else if (line.type === "subsection") {
        fontStyle = "bold";
        fontSize = 10.5;
        lineHeight = 14;
        spacingBefore = 8;
        spacingAfter = 4;
      } else if (line.type === "bullet") {
        fontSize = 10.5;
        lineHeight = 14;
        spacingAfter = 2;
        x += 16;
        width -= 16;
        text = `- ${text}`;
      }

      const wrapped = doc.splitTextToSize(text, width) as string[];
      const blockHeight =
        spacingBefore + wrapped.length * lineHeight + spacingAfter;

      y = ensurePageSpace(y, blockHeight);
      y += spacingBefore;

      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(17, 24, 39);
      doc.text(wrapped, x, y);
      y += wrapped.length * lineHeight + spacingAfter;

      if (line.type === "section") {
        y = ensurePageSpace(y, 8);
        doc.setDrawColor(235, 238, 243);
        doc.line(marginX, y - 2, pageWidth - marginX, y - 2);
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Pagina ${page} de ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 24,
        {
          align: "right",
        },
      );
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
