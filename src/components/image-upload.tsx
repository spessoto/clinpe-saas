"use client";

import { useState } from "react";
import Image from "next/image";

import { uploadProfileImageAction } from "@/app/(protected)/settings/actions";

type ImageUploadProps = {
  type: "avatar" | "logo";
  currentUrl?: string | null;
  label: string;
  className?: string;
};

export function ImageUpload({
  type,
  currentUrl,
  label,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem deve ter menos de 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const result = await uploadProfileImageAction(formData);

      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("url" in result && result.url) {
        setImageUrl(result.url);
      }
    } catch (e) {
      setError("Erro ao fazer upload");
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleUpload(files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files[0]) {
      handleUpload(files[0]);
    }
  }

  const isAvatar = type === "avatar";
  const sizeClass = isAvatar ? "w-32 h-32" : "w-48 h-32";

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2 text-foreground">
        {label}
      </label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative ${sizeClass} rounded-lg border-2 border-dashed transition cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-slate-300 bg-slate-50 hover:border-primary/50"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        {imageUrl ? (
          <div className="w-full h-full relative">
            <Image
              src={imageUrl}
              alt={label}
              fill
              className={`object-cover ${isAvatar ? "rounded-lg" : "rounded-t-lg"}`}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                <div className="text-white text-sm font-semibold">Enviando...</div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-sm text-muted">
            {uploading ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Arraste uma imagem ou clique</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}

      {imageUrl && !uploading && (
        <p className="mt-2 text-xs text-muted">
          Clique ou arraste para trocar
        </p>
      )}
    </div>
  );
}
