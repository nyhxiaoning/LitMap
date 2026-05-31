/**
 * Runtime validation for BookData — development only.
 * Catches data integrity issues early with clear console warnings.
 */
import type { BookData } from "@/types";

/** Valid sliderVal range (see BottomTimeline constants) */
const VALID_SLIDER_VALS = new Set([0, 1, 2, 3, 4, 5, 6, 7]);

export function validateBooks(books: BookData[]): string[] {
  if (import.meta.env.PROD) return []; // skip in production builds
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const b of books) {
    // Required fields
    if (!b.id) errors.push(`Book rank=${b.rank}: missing id`);
    if (seenIds.has(b.id)) errors.push(`Book "${b.title}": duplicate id "${b.id}"`);
    seenIds.add(b.id);

    if (!b.title?.trim()) errors.push(`Book id=${b.id}: missing title`);
    if (!b.author?.trim()) errors.push(`"${b.title}": missing author`);
    if (!VALID_SLIDER_VALS.has(b.sliderVal))
      errors.push(`"${b.title}": invalid sliderVal=${b.sliderVal}`);
    if (!b.century?.trim()) errors.push(`"${b.title}": missing century`);

    // Coordinate range
    if (b.lat < -90 || b.lat > 90)
      errors.push(`"${b.title}": lat=${b.lat} out of range [-90, 90]`);
    if (b.lng < -180 || b.lng > 180)
      errors.push(`"${b.title}": lng=${b.lng} out of range [-180, 180]`);
    if (Math.abs(b.lat) > 85)
      errors.push(`"${b.title}": lat=${b.lat} near pole — may not display`);

    // Path validation
    if (b.isTrajectory && (!b.path || b.path.length < 2))
      errors.push(`"${b.title}": marked as trajectory but has < 2 path nodes`);

    if (b.path) {
      for (let i = 0; i < b.path.length; i++) {
        const n = b.path[i];
        if (!n.name) errors.push(`"${b.title}" path[${i}]: missing name`);
        if (!n.coord || n.coord.length !== 2)
          errors.push(`"${b.title}" path[${i}]: invalid coord`);
        if (n.coord && (n.coord[0] < -90 || n.coord[0] > 90))
          errors.push(`"${b.title}" path[${i}]: lat out of range`);
      }
    }
  }

  // Summary
  if (errors.length > 0) {
    console.warn(
      `⚠️  Book data validation: ${errors.length} issue(s) found:\n` +
      errors.map((e) => `  • ${e}`).join("\n")
    );
  }

  return errors;
}
