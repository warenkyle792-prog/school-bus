"use client";

import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/types";

export type LiveState = {
  snapshot: Snapshot | null;
  error: string | null;
  /** true once we've failed repeatedly — the data on screen may be out of date */
  stale: boolean;
  /** wall-clock ms of the last successful update */
  lastOkMs: number | null;
  tick: number;
  retry: () => void;
};

const REQUEST_TIMEOUT_MS = 8000;
const FAILURES_BEFORE_STALE = 2;

/**
 * Polls the live snapshot.
 *
 * Deliberately defensive, because a console that silently freezes on a rural
 * connection is worse than one that says it's stale:
 *  - every request has a timeout, so a hung socket can't stall the loop
 *  - the last good snapshot is kept, so a blip never blanks the screen
 *  - failures are counted; only after 2 do we call the data stale
 *  - backoff slows polling when the network is down, and recovers on success
 */
export function useLiveSnapshot(intervalMs = 1200, initial?: Snapshot | null): LiveState {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [lastOkMs, setLastOkMs] = useState<number | null>(initial ? Date.now() : null);
  const [tick, setTick] = useState(0);
  const [nonce, setNonce] = useState(0);
  const failures = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pull() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch("/api/snapshot", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = (await res.json()) as Snapshot;
        if (cancelled) return;

        failures.current = 0;
        setSnapshot(data);
        setError(null);
        setStale(false);
        setLastOkMs(Date.now());
        setTick((t) => t + 1);
      } catch (e) {
        if (cancelled) return;
        failures.current += 1;
        const aborted = e instanceof DOMException && e.name === "AbortError";
        setError(aborted ? "The live feed timed out" : "Can't reach the live feed");
        if (failures.current >= FAILURES_BEFORE_STALE) setStale(true);
      } finally {
        clearTimeout(timeout);
        if (!cancelled) {
          // slow down when failing, snap back when healthy
          const delay = failures.current === 0 ? intervalMs : Math.min(intervalMs * 2 ** failures.current, 15000);
          timer = setTimeout(pull, delay);
        }
      }
    }

    pull();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs, nonce]);

  return {
    snapshot,
    error,
    stale,
    lastOkMs,
    tick,
    retry: () => {
      failures.current = 0;
      setNonce((n) => n + 1);
    },
  };
}
