"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import type { CommMessage } from "@/lib/messages";

/**
 * Two-way emergency channel between a route's driver/attendant and the
 * guardians on that route. Deliberately a *shared thread per route* rather
 * than private DMs: when a bus breaks down, one message must reach every
 * parent at once, and parents need to see that others have been told.
 */
export default function CommsBox({
  routeId,
  routeCode,
  guardianName,
  driverName,
  simSec,
  canMessage,
  seed,
}: {
  routeId: string;
  routeCode: string;
  guardianName: string;
  driverName: string;
  simSec: number;
  canMessage: boolean;
  seed?: CommMessage[];
}) {
  const [messages, setMessages] = useState<CommMessage[]>(seed ?? []);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seed?.length) setMessages(seed);
  }, [seed]);

  // Newest first in state; the list is rendered oldest-first so the thread
  // reads top-to-bottom like a chat.
  const thread = messages.filter((m) => m.routeId === routeId).slice(0, 40);
  const ordered = [...thread].reverse();
  const unread = thread.filter((m) => m.from !== "parent" && !m.seenBy.includes("g-01")).length;

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      {
        id: `msg-local-${Date.now()}`,
        routeId,
        from: "parent",
        authorName: guardianName,
        body,
        atSec: simSec,
        priority: "info",
        seenBy: [],
        mine: true,
      },
      ...prev,
    ]);
    setDraft("");
  };

  return (
    <div className="flex flex-col">
      <div className="card flex items-center gap-2.5 p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
            <circle cx="8" cy="16.6" r="1.2" />
            <circle cx="15" cy="16.6" r="1.2" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">{driverName}</p>
          <p className="truncate text-[10px] text-ink-500">
            {routeCode} · driver &amp; attendant channel
          </p>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-berry-500 px-1.5 py-0.5 text-[9.5px] font-bold text-canvas">
            {unread}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-2">
        {ordered.length === 0 && (
          <p className="py-8 text-center text-[11.5px] text-ink-500">No messages on this route yet.</p>
        )}
        {ordered.map((m) => {
          const fromDriver = m.from === "driver" || m.from === "attendant";
          const urgent = m.priority === "emergency";
          const isMine = m.from === "parent";
          return (
            <div key={m.id} className={cx("flex", isMine ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[86%] rounded-2xl border px-3 py-2",
                  isMine
                    ? "border-brand-600/30 bg-brand-100"
                    : urgent
                      ? "border-berry-500/40 bg-berry-100"
                      : "border-line bg-paper-2"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {urgent && (
                    <span className="rounded-full bg-berry-500 px-1.5 py-0.5 text-[8.5px] font-bold tracking-wide text-canvas uppercase">
                      emergency
                    </span>
                  )}
                  <p className="text-[9.5px] font-semibold tracking-wide text-ink-600 uppercase">
                    {isMine ? "You" : fromDriver ? m.authorName : "School"}
                  </p>
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-800">{m.body}</p>
                <p className="num mt-1 text-[9px] text-ink-500">
                  {!isMine && m.seenBy.includes("g-01") ? "seen · " : ""}
                  {Math.max(1, Math.round((simSec - m.atSec) / 60))} min ago
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {canMessage ? (
        <div className="sticky bottom-0 mt-2.5 rounded-xl border border-line bg-paper-2 p-1.5">
          <div className="flex items-end gap-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={`Message ${driverName.split(" ")[0]}…`}
              className="max-h-24 min-h-[34px] flex-1 resize-none rounded-lg border border-line bg-paper px-2 py-1.5 text-[11.5px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-canvas transition disabled:opacity-40"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12l16-8-6 8 6 8-16-8Z" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="mt-1 px-1 text-[9px] leading-relaxed text-ink-500">
            Emergency channel — the school transport desk is copied on every message here.
          </p>
        </div>
      ) : (
        <p className="mt-2 px-1 text-[9.5px] leading-relaxed text-ink-500">
          Read-only: only guardians with a child on this route can reply.
        </p>
      )}
    </div>
  );
}
