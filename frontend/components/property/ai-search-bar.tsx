import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const suggestions = [
  "Quiet villa with a pool",
  "Riad near Jemaa el-Fnaa",
  "Work-friendly stay for two",
];

export function AiSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <div className="w-full">
      <form
        action="/search"
        className="flex w-full flex-col gap-2 rounded-[2rem] border border-white/80 bg-sand-50 p-2 shadow-float sm:flex-row sm:items-center"
      >
        <label htmlFor="ai-search" className="sr-only">Describe your ideal property</label>
        <span className="hidden size-12 shrink-0 place-items-center rounded-full bg-terracotta-100 text-terracotta-700 sm:grid">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <input
          id="ai-search"
          name="q"
          defaultValue={defaultValue}
          required
          minLength={3}
          maxLength={500}
          placeholder="A quiet villa with a pool for four people…"
          className="min-h-12 flex-1 bg-transparent px-4 text-base text-ink outline-none placeholder:text-sand-600"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400 focus-visible:ring-offset-2"
        >
          Find my stay
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-sand-700">
        <span className="font-semibold">Try:</span>
        {suggestions.map((suggestion) => (
          <Link
            key={suggestion}
            href={`/search?q=${encodeURIComponent(suggestion)}`}
            className="rounded-full border border-sand-300 bg-sand-50/70 px-3 py-1.5 transition hover:border-terracotta-300 hover:text-terracotta-700"
          >
            {suggestion}
          </Link>
        ))}
      </div>
    </div>
  );
}
