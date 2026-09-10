import { Image } from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { CredentialAsset } from "../types";

const DEFAULT_MAX_LONG_EDGE = 1440;
const DEFAULT_QUALITY = 0.65;

function getImageDimensions(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error("Could not read image size."))
    );
  });
}

function toCompressedFileName(fileName?: string | null) {
  const source = (fileName || "image").trim();
  const dotIndex = source.lastIndexOf(".");
  const base = dotIndex > 0 ? source.slice(0, dotIndex) : source;
  return `${base}-compressed.jpg`;
}

export function isImageAsset(asset?: CredentialAsset) {
  if (!asset) {
    return false;
  }

  const mime = String(asset.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) {
    return true;
  }

  const name = String(asset.fileName || "").toLowerCase();
  return /\.(png|jpe?g|webp|heic|heif|bmp|gif)$/i.test(name);
}

export async function compressImageForUpload(
  asset: CredentialAsset,
  options?: {
    maxLongEdge?: number;
    quality?: number;
  }
) {
  if (!asset.uri || !isImageAsset(asset)) {
    return asset;
  }

  try {
    const maxLongEdge = options?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
    const quality = options?.quality ?? DEFAULT_QUALITY;
    const { width, height } = await getImageDimensions(asset.uri);
    const longestSide = Math.max(width, height);
    const shouldResize = longestSide > maxLongEdge;
    const resizeAction =
      width >= height
        ? [{ resize: { width: maxLongEdge } }]
        : [{ resize: { height: maxLongEdge } }];

    const result = await manipulateAsync(asset.uri, shouldResize ? resizeAction : [], {
      compress: quality,
      format: SaveFormat.JPEG
    });

    return {
      ...asset,
      uri: result.uri,
      fileName: toCompressedFileName(asset.fileName),
      mimeType: "image/jpeg"
    };
  } catch {
    return asset;
  }
}
