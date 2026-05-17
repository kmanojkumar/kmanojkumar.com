import readingTime from "reading-time";

export interface ReadingStats {
  /** Round-up minutes — at least 1. */
  minutes: number;
  /** Word count of the body. */
  words: number;
  /** Human-readable label e.g. "4 min read". */
  text: string;
  /** ISO 8601 duration e.g. "PT4M", suitable for schema.org `timeRequired`. */
  iso: string;
}

export function getReadingStats(body: string | undefined): ReadingStats {
  const safe = body ?? "";
  const stats = readingTime(safe);
  const minutes = Math.max(1, Math.ceil(stats.minutes));
  return {
    minutes,
    words: stats.words,
    text: `${minutes} min read`,
    iso: `PT${minutes}M`,
  };
}
