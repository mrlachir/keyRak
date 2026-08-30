import { ExternalLink } from "lucide-react";
import Link from "next/link";

import type { Property } from "@/types";

export function ViewPropertyLink({ property }: { property: Pick<Property, "id" | "title" | "active"> }) {
  const className = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-majorelle-200 bg-majorelle-50 px-3 py-2 text-xs font-bold text-majorelle-700 transition hover:border-majorelle-300 hover:bg-majorelle-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45";

  if (!property.active) {
    return (
      <button type="button" disabled className={className} title="Publish this property to view its public page.">
        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" /> View property
      </button>
    );
  }

  return (
    <Link
      href={`/properties/${property.id}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${property.title} (opens in a new tab)`}
      className={className}
    >
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" /> View property
    </Link>
  );
}
