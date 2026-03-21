"use client";

import { useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 4;

export function PhotoPicker() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Mantém previews sincronizados e revoga object URLs antigas para evitar leak
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  // Injeta os arquivos no FormData via evento nativo 'formdata' do form pai.
  // Funciona em todos os browsers modernos incluindo iOS Safari 15+, ao
  // contrário da técnica de atribuir input.files via DataTransfer.
  useEffect(() => {
    const form = wrapperRef.current?.closest("form");
    if (!form) return;

    const handleFormData = (e: FormDataEvent) => {
      for (const file of files) {
        e.formData.append("photos", file);
      }
    };

    form.addEventListener("formdata", handleFormData);
    return () => form.removeEventListener("formdata", handleFormData);
  }, [files]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.size > 0);
    setFiles((prev) => [...prev, ...arr].slice(0, MAX_PHOTOS));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const canAdd = files.length < MAX_PHOTOS;

  return (
    <div ref={wrapperRef} className="mt-3 space-y-3">
      {/* Trigger oculto — galeria (multi) */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Trigger oculto — câmera traseira */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Thumbnails das fotos selecionadas */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-24 w-24 rounded-xl border border-slate-200 object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remover foto ${i + 1}`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botões de ação */}
      {canAdd && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 text-sm font-medium text-primary transition hover:bg-primary/10 active:scale-95"
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
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Câmera
          </button>

          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-foreground transition hover:bg-slate-50 active:scale-95"
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Galeria
          </button>
        </div>
      )}

      <p className="text-xs text-muted">
        {files.length}/{MAX_PHOTOS} foto{files.length !== 1 ? "s" : ""}
        {files.length >= MAX_PHOTOS && (
          <span className="ml-1 font-semibold text-warning">
            — limite atingido
          </span>
        )}
      </p>
    </div>
  );
}
