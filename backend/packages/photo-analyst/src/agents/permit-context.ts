import type { InsightCategory, PermitRecord } from '@bones-report/shared';
import { permitsForCategory } from '@bones-report/shared';

/**
 * Render the permits bearing on one category, for appending to that agent's
 * brief.
 *
 * This is per-category and therefore must stay *after* the cache breakpoint,
 * alongside the brief — moving it earlier would make the prompt prefix vary per
 * agent and cost a full re-upload of every photo.
 */
export function permitContext(
  permits: PermitRecord[] | undefined,
  category: InsightCategory,
): string {
  if (!permits || permits.length === 0) return '';

  const relevant = permitsForCategory(permits, category);
  if (relevant.length === 0) {
    return (
      '\n\n## Permit records\n\n' +
      'This property has permits on record, but none of them relate to your category. ' +
      'Treat that as no information either way — plenty of work happens without a permit.'
    );
  }

  const thisYear = new Date().getFullYear();
  const lines = relevant.map((p) => {
    const year = p.issueDate ? new Date(p.issueDate).getFullYear() : null;
    const age = year ? ` — ${thisYear - year} years ago` : '';
    const value = p.jobValue ? `, declared value $${p.jobValue.toLocaleString()}` : '';
    const status = p.status ? `, ${p.status}` : '';
    return `- ${p.issueDate ?? 'date unknown'}${age}: ${p.description}${value}${status}`;
  });

  return (
    '\n\n## Permit records for this category\n\n' +
    `${relevant.length} permit${relevant.length === 1 ? '' : 's'} on record:\n\n` +
    `${lines.join('\n')}\n\n` +
    'These are facts about the house. Do not estimate the age of anything these ' +
    'permits cover. If what you see conflicts with the record, report the conflict.'
  );
}
