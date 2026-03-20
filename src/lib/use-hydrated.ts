"use client";

import { useState, useEffect } from "react";

/**
 * Returns true after the component has mounted on the client.
 * Use this to guard Zustand persist-store reads so SSR and the
 * first client render both return the same (empty) output,
 * preventing hydration mismatches that break interactivity.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
