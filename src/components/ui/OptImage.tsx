"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

/**
 * Optimized image wrapper.
 * Known domains get Next.js optimization (AVIF/WebP, responsive srcset).
 * Unknown domains pass through unoptimized so they never break.
 * On load error, hides the image so the parent's fallback UI shows.
 */

const OPTIMIZED_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "little-saigon-c055a.firebasestorage.app",
  "upload.wikimedia.org",
  "lh3.googleusercontent.com",
  "maps.googleapis.com",
  "cdn.shopify.com",
];

function isOptimizable(src: string | undefined): boolean {
  if (!src || src.startsWith("/")) return true; // local images — always optimizable
  try {
    const host = new URL(src).hostname;
    return OPTIMIZED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

export default function OptImage({ onError, ...props }: ImageProps) {
  const [errored, setErrored] = useState(false);
  const src = typeof props.src === "string" ? props.src : undefined;
  const shouldOptimize = isOptimizable(src);

  if (errored) return null;

  return (
    <Image
      {...props}
      unoptimized={!shouldOptimize}
      onError={(e) => {
        setErrored(true);
        onError?.(e);
      }}
    />
  );
}
