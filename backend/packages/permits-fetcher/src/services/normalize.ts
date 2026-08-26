import { categoriesForTags, type PermitRecord } from '@bones-report/shared';

/** A permit as Shovels returns it. Most `property_*` fields come back null. */
export interface ShovelsPermit {
  id?: string;
  number?: string | null;
  description?: string | null;
  type?: string | null;
  subtype?: string | null;
  status?: string | null;
  jurisdiction?: string | null;
  issue_date?: string | null;
  final_date?: string | null;
  file_date?: string | null;
  job_value?: number | null;
  tags?: string[] | null;
}

/**
 * Shovels reports money in cents. A reroof comes back as 2944900, meaning
 * $29,449 — read as dollars it is off by two orders of magnitude, which would
 * put a routine roof replacement in the millions.
 */
function toCurrency(cents: number | null | undefined): number | null {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return null;
  return Math.round(cents) / 100;
}

export function normalizePermit(raw: ShovelsPermit, index: number): PermitRecord {
  const tags = (raw.tags ?? []).filter((t): t is string => typeof t === 'string');

  return {
    id: raw.id ?? `permit-${index}`,
    number: raw.number ?? null,
    description: raw.description ?? raw.subtype ?? raw.type ?? 'Permit',
    type: raw.type ?? null,
    subtype: raw.subtype ?? null,
    status: raw.status ?? null,
    jurisdiction: raw.jurisdiction ?? null,
    // file_date is the fallback: a minority of records carry no issue_date.
    issueDate: raw.issue_date ?? raw.file_date ?? null,
    finalDate: raw.final_date ?? null,
    jobValue: toCurrency(raw.job_value),
    tags,
    categories: categoriesForTags(tags),
  };
}

export function normalizePermits(raw: ShovelsPermit[]): PermitRecord[] {
  return raw
    .map(normalizePermit)
    // Most recent first — recency is what matters when judging whether a
    // system has been replaced.
    .sort((a, b) => (b.issueDate ?? '').localeCompare(a.issueDate ?? ''));
}
