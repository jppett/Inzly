import type { PermitRecord } from '@bones-report/shared';

/**
 * Render every permit on record, for the Summary Agent — unlike
 * `agents/permit-context.ts`, which slices permits down to one category so a
 * roof agent doesn't see plumbing history, the Summary Agent is the one place
 * that should see all of it. Cross-category permit reasoning — a roof permit
 * plus a foundation-adjacent grading permit plus what the agents actually saw
 * — is exactly what the category agents can't do and this step exists for.
 */
export function fullPermitContext(permits: PermitRecord[]): string {
  if (permits.length === 0) {
    return '\n\n## Permit records\n\nNo permits on record for this property. Absence proves nothing — plenty of work happens without one — but no corroboration is available either.';
  }

  const thisYear = new Date().getFullYear();
  const lines = permits.map((p) => {
    const year = p.issueDate ? new Date(p.issueDate).getFullYear() : null;
    const age = year ? ` — ${thisYear - year} years ago` : '';
    const value = p.jobValue ? `, declared value $${p.jobValue.toLocaleString()}` : '';
    const cats = p.categories.length ? ` [${p.categories.join(', ')}]` : '';
    return `- ${p.issueDate ?? 'date unknown'}${age}: ${p.description}${value}${cats}`;
  });

  return (
    `\n\n## Full permit history (${permits.length} records)\n\n` +
    `${lines.join('\n')}\n\n` +
    'Use these across categories, not just within one. A roof permit and a ' +
    "landscaping agent's downspout finding both bear on foundation moisture " +
    'risk even though no single category agent saw both.'
  );
}
