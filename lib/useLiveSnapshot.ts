"use client";

import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/types";

/**
 * Polls the live snapshot. Interpolated locally so the map stays fluid between
 * server ticks, and survives a dropped request without blanking the console.
 */
export function useLiveSnapshot(intervalMs = 1200) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;

    async function pull() {
      try {
        const res = await fetch("/api/snapshot", { cache: "no-store" });
        if (!res.ok) throw new Error(`Snapshot failed (${res.status})`);
        const data = (await res.json()) as Snapshot;
        if (!cancelled && mounted.current) {
          setSnapshot(data);
          setError(null);
          setTick((t) => t + 1);
        }
      } catch (e) {
        if (!cancelled && mounted.current) {
          setError(e instanceof Error ? e.message : "Connection lost");
        }
      }
    }

    pull();
    const id = setInterval(pull, intervalMs);
    return () => {
      cancelled = true;
      mounted.current = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { snapshot, error, tick };
}
