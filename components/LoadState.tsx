"use client";

/**
 * What the user sees while there is no live data yet.
 *
 * A blank skeleton is the worst outcome: it looks identical to a broken app.
 * After a few seconds this tells them what is happening, and after ~8s offers a
 * retry, so nobody is left staring at a spinner with no explanation.
 */

import { useEffect, useState } from "react";
import { cx } from "@/lib/format";

export function LoadingState({
  title,
  detail,
  error,
  onRetry,
}: {
  title: string;
  detail?: string;
  error?: string | null;
  onRetry?: () => void;
}) {
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const failed = Boolean(error) || waited;

  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="max-w-[280px] text-center">
        {failed ? (
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-berry-100 text-berry-600">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M12 4a6 6 0 0 0-6 6v4l-1.5 3h15L18 14V10a6 6 0 0 0-6-6Z" strokeLinejoin="round" />
              <path d="M9.5 19.5 14.5 4.5" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div className="mx-auto size-9 animate-pulse rounded-full bg-brand-200" />
        )}

        <p className="mt-3 text-[13px] font-semibold text-ink-800">
          {failed ? (error ?? "Still waiting for the live feed") : title}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">
          {failed
            ? "Your data is safe. This is a connection problem, not a data problem."
            : (detail ?? "Connecting to the transport feed")}
        </p>

        {failed && onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-[11.5px] font-bold text-canvas transition hover:bg-brand-500"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/** Non-blocking banner shown when data on screen is known to be out of date. */
export function StaleBanner({
  lastOkMs,
  onRetry,
  className = "",
}: {
  lastOkMs: number | null;
  onRetry?: () => void;
  className?: string;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const seconds = lastOkMs ? Math.max(0, Math.round((Date.now() - lastOkMs) / 1000)) : null;

  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-lg border border-sun-500/40 bg-sun-100 px-2.5 py-1.5",
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-sun-500" />
      <p className="flex-1 text-[10.5px] leading-snug font-medium text-sun-600">
        Live feed interrupted
        {seconds !== null ? ` — showing data from ${seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`} ago` : ""}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-md bg-sun-500 px-2 py-0.5 text-[10px] font-bold text-canvas"
        >
          Retry
        </button>
      )}
    </div>
  );
}
