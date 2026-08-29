"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Search, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";

import { cn } from "@/lib/utils";
import type { SearchMode } from "@/types";

const suggestions = [
  "Quiet villa with a pool",
  "Riad near Jemaa el-Fnaa",
  "Work-friendly stay for two",
];

interface AiSearchBarProps {
  defaultValue?: string;
  defaultMode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  onSearch?: (mode: SearchMode, query: string) => Promise<void> | void;
}

export function AiSearchBar({
  defaultValue = "",
  defaultMode = "standard",
  onModeChange,
  onSearch,
}: AiSearchBarProps) {
  const [mode, setMode] = useState<SearchMode>(defaultMode);
  const [query, setQuery] = useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const aiMode = mode === "ai";

  function selectMode(nextMode: SearchMode) {
    setMode(nextMode);
    onModeChange?.(nextMode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!onSearch) return;
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return;

    setIsSubmitting(true);
    try {
      await onSearch(mode, normalizedQuery);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sand-700">
          {aiMode ? "Describe it naturally" : "Search every property field"}
        </p>
        <div
          className="grid w-full grid-cols-2 rounded-2xl border border-sand-200 bg-sand-100 p-1 shadow-sm sm:w-auto sm:min-w-72"
          role="group"
          aria-label="Search mode"
        >
          <button
            type="button"
            aria-pressed={!aiMode}
            onClick={() => selectMode("standard")}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400",
              !aiMode ? "bg-white text-ink shadow-sm" : "text-sand-600 hover:text-ink",
            )}
          >
            <Search className="size-4" aria-hidden="true" /> Standard
          </button>
          <button
            type="button"
            aria-pressed={aiMode}
            onClick={() => selectMode("ai")}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400",
              aiMode ? "bg-majorelle-600 text-white shadow-sm" : "text-sand-600 hover:text-majorelle-700",
            )}
          >
            <Sparkles className="size-4" aria-hidden="true" /> AI Search
          </button>
        </div>
      </div>

      <form
        action="/search"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-2 rounded-[2rem] border border-white/80 bg-sand-50 p-2 shadow-float sm:flex-row sm:items-center"
      >
        <input type="hidden" name="mode" value={mode} />
        <label htmlFor="hybrid-search" className="sr-only">
          {aiMode ? "Describe your ideal property" : "Search properties"}
        </label>
        <span className={cn(
          "hidden size-12 shrink-0 place-items-center rounded-full sm:grid",
          aiMode ? "bg-terracotta-100 text-terracotta-700" : "bg-majorelle-100 text-majorelle-700",
        )}>
          {aiMode ? <Sparkles className="size-5" aria-hidden="true" /> : <Search className="size-5" aria-hidden="true" />}
        </span>
        <input
          id="hybrid-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          required
          minLength={3}
          maxLength={500}
          placeholder={aiMode
            ? "A quiet villa with a pool and four bedrooms…"
            : "Search by title, neighborhood, address, or property type…"}
          className="min-h-12 flex-1 bg-transparent px-4 text-base text-ink outline-none placeholder:text-sand-600"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400 focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Translating…</>
          ) : (
            <>{aiMode ? "Ask KEYRAK" : "Search stays"}<ArrowRight className="size-4" aria-hidden="true" /></>
          )}
        </button>
      </form>

      {aiMode ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-sand-700">
          <span className="font-semibold">Try:</span>
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion}
              href={`/search?mode=ai&q=${encodeURIComponent(suggestion)}`}
              className="rounded-full border border-sand-300 bg-sand-50/70 px-3 py-1.5 transition hover:border-terracotta-300 hover:text-terracotta-700"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
