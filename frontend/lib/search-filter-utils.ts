import type { Tag } from "@/types";

function normalizeTag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function reconcileSearchTags(requestedTags: string[], availableTags: Tag[]): string[] {
  const available = availableTags.map((tag) => ({
    name: tag.name,
    normalized: normalizeTag(tag.name),
  }));

  return requestedTags
    .map((requested) => {
      const normalizedRequested = normalizeTag(requested);
      if (!normalizedRequested) return null;

      const exact = available.find((tag) => tag.normalized === normalizedRequested);
      if (exact) return exact.name;

      const compatible = available
        .filter((tag) => (
          tag.normalized.includes(normalizedRequested) || normalizedRequested.includes(tag.normalized)
        ))
        .sort((left, right) => left.normalized.length - right.normalized.length)[0];
      return compatible?.name ?? null;
    })
    .filter((tag): tag is string => Boolean(tag))
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}
