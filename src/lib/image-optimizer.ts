import sharp from "sharp";

function toSafeBaseName(fileName: string) {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  const baseName = normalized.replace(/\.[^.]+$/, "");
  return baseName || "image";
}

export type OptimizedImageUpload = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
};

type OptimizeImageUploadOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export async function optimizeImageUpload(
  file: File,
  options: OptimizeImageUploadOptions = {},
): Promise<OptimizedImageUpload> {
  const maxWidth = options.maxWidth ?? 2400;
  const maxHeight = options.maxHeight ?? maxWidth;
  const quality = options.quality ?? 88;

  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
    });

  const output = await pipeline.toBuffer();

  return {
    bytes: new Uint8Array(output),
    contentType: "image/webp",
    fileName: `${toSafeBaseName(file.name || "image")}.webp`,
  };
}
