"use client";

import { useSyncExternalStore } from "react";

const COARSE_POINTER_QUERY = "(pointer: coarse)";

function subscribeToPointerType(callback: () => void) {
  const mql = window.matchMedia(COARSE_POINTER_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function isCoarsePointer() {
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

function isCoarsePointerServerSnapshot() {
  return false;
}

// true en dispositivos cuyo puntero principal es táctil ("(pointer: coarse)").
// Snapshot de servidor false: el primer render (SSR/hidratación) es siempre "no táctil".
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeToPointerType,
    isCoarsePointer,
    isCoarsePointerServerSnapshot,
  );
}
