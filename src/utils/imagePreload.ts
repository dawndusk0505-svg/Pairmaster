import { useEffect, useState } from 'react';
import { ThemeItem } from '../data/matchThemes';

/**
 * In-memory cache of preloaded Image objects so decoded textures stay resident in RAM/GPU
 * and never wait on click-time network fetching.
 */
const preloadedCache = new Map<string, HTMLImageElement>();
const loadedUrls = new Set<string>();
const failedUrls = new Set<string>();
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignore subscriber error
    }
  });
}

export function preloadImageUrl(url: string): void {
  if (!url || typeof window === 'undefined') return;
  if (loadedUrls.has(url) || preloadedCache.has(url)) return;

  const img = new Image();
  img.decoding = 'sync';
  img.referrerPolicy = 'no-referrer';

  const markLoaded = () => {
    loadedUrls.add(url);
    failedUrls.delete(url);
    notifyAll();
  };

  img.onload = () => {
    if (typeof img.decode === 'function') {
      img.decode().then(markLoaded).catch(markLoaded);
    } else {
      markLoaded();
    }
  };

  img.onerror = () => {
    failedUrls.add(url);
    notifyAll();
  };

  img.src = url;
  preloadedCache.set(url, img);

  if (img.complete && img.naturalWidth > 0) {
    markLoaded();
  }
}

export function preloadThemeItems(items: ThemeItem[]): void {
  items.forEach((item) => {
    if (item.imageUrl) {
      preloadImageUrl(item.imageUrl);
    }
  });
}

/**
 * React hook that eagerly preloads & decodes all theme imageUrls on mount/theme change
 * and re-renders cleanly as each image finishes decoding.
 */
export function usePreloadedThemeImages(items: ThemeItem[]): {
  isImageReady: (url?: string) => boolean;
  isImageFailed: (url?: string) => boolean;
} {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    listeners.add(onUpdate);
    preloadThemeItems(items);
    return () => {
      listeners.delete(onUpdate);
    };
  }, [items]);

  return {
    isImageReady: (url?: string) => Boolean(url && loadedUrls.has(url)),
    isImageFailed: (url?: string) => Boolean(url && failedUrls.has(url)),
  };
}
