import type { InsightSeverity } from '@bones-report/shared';
import type { ReviewBundle } from './types.js';

/**
 * A reviewer's expectations for a property, recorded photo by photo *before*
 * any run — distinct from a GoldenFile, which records verdicts *on* a run.
 *
 * Expectations are the stronger instrument: they capture what should have been
 * found, including on photographs where the right answer is nothing at all.
 * Verdicts can only judge what an agent happened to produce.
 */
export interface PhotoExpectation {
  photo: number;
  photoId: string;
  label?: string;
  url?: string;
  expected: Array<{
    severity: InsightSeverity;
    category: string;
    expect: string;
  }>;
  silent: boolean;
  suppressedBecause?: string | null;
}

export interface ExpectationsFile {
  label: string;
  property?: string;
  listPrice?: number;
  yearBuilt?: number;
  reviewer?: string;
  source?: string;
  photos: PhotoExpectation[];
}

export interface ExpectationsReport {
  label: string;
  model: string;
  reviewer?: string;

  photos: number;
  /** What the reviewer asked for. */
  expectedFindings: number;
  /** What the run produced, on photos the reviewer covered. */
  producedFindings: number;

  /**
   * The headline number. The reviewer wanted silence on most photographs, so
   * over-reporting is the failure mode that matters most.
   */
  silence: {
    shouldBeSilent: number;
    actuallySilent: number;
    /** Findings produced on photos the reviewer wanted quiet. */
    noiseFindings: number;
    rate: number;
  };

  /** Of the reviewer's expected findings, how many the run produced. */
  recall: {
    matched: number;
    missed: number;
    rate: number;
    missedItems: Array<{ photo: number; category: string; expect: string }>;
  };

  severityAgreement: {
    compared: number;
    agreed: number;
    overstated: number;
    understated: number;
    rate: number;
  };

  /** Findings per photograph, against what the reviewer wanted. */
  volume: {
    perPhoto: number;
    reviewerPerPhoto: number;
    ratio: number;
  };

  /** Photographs carrying more findings than the cap allows. */
  capBreaches: Array<{ photo: number; count: number }>;
}

const SEVERITY_ORDER: InsightSeverity[] = ['good', 'info', 'warning', 'critical'];

/**
 * Score a run against a reviewer's expectations.
 *
 * A produced finding matches an expectation when it sits on the same photograph
 * and in the same category. That is deliberately coarse: judging whether two
 * descriptions of the same countertop "mean the same thing" is a task for a
 * human, and a category-level match is enough to tell whether the agents looked
 * where the reviewer looked.
 */
export function scoreAgainstExpectations(
  bundle: ReviewBundle,
  expectations: ExpectationsFile,
  maxPerPhoto = 3,
): ExpectationsReport {
  // Index produced findings by photo.
  const byPhoto = new Map<string, typeof bundle.insights>();
  for (const insight of bundle.insights) {
    for (const photoId of new Set(insight.evidence.map((e) => e.photoId))) {
      if (!byPhoto.has(photoId)) byPhoto.set(photoId, []);
      byPhoto.get(photoId)!.push(insight);
    }
  }

  let shouldBeSilent = 0;
  let actuallySilent = 0;
  let noiseFindings = 0;
  let matched = 0;
  let missed = 0;
  let compared = 0;
  let agreed = 0;
  let overstated = 0;
  let understated = 0;
  let producedFindings = 0;

  const missedItems: ExpectationsReport['recall']['missedItems'] = [];
  const capBreaches: ExpectationsReport['capBreaches'] = [];

  for (const photo of expectations.photos) {
    const produced = byPhoto.get(photo.photoId) ?? [];
    producedFindings += produced.length;

    if (produced.length > maxPerPhoto) {
      capBreaches.push({ photo: photo.photo, count: produced.length });
    }

    if (photo.silent) {
      shouldBeSilent += 1;
      if (produced.length === 0) actuallySilent += 1;
      else noiseFindings += produced.length;
      continue;
    }

    // Match each expectation to a produced finding in the same category.
    const unclaimed = [...produced];
    for (const expectation of photo.expected) {
      const hit = unclaimed.findIndex((i) => i.category === expectation.category);
      if (hit === -1) {
        missed += 1;
        missedItems.push({
          photo: photo.photo,
          category: expectation.category,
          expect: expectation.expect,
        });
        continue;
      }

      matched += 1;
      const insight = unclaimed.splice(hit, 1)[0];
      compared += 1;
      const drift =
        SEVERITY_ORDER.indexOf(insight.severity) - SEVERITY_ORDER.indexOf(expectation.severity);
      if (drift === 0) agreed += 1;
      else if (drift > 0) overstated += 1;
      else understated += 1;
    }
  }

  const expectedFindings = expectations.photos.reduce((n, p) => n + p.expected.length, 0);
  const photos = expectations.photos.length;

  const reviewerPerPhoto = expectedFindings / photos;
  const perPhoto = producedFindings / photos;

  return {
    label: expectations.label,
    model: bundle.model,
    reviewer: expectations.reviewer,
    photos,
    expectedFindings,
    producedFindings,
    silence: {
      shouldBeSilent,
      actuallySilent,
      noiseFindings,
      rate: shouldBeSilent > 0 ? actuallySilent / shouldBeSilent : 1,
    },
    recall: {
      matched,
      missed,
      rate: expectedFindings > 0 ? matched / expectedFindings : 1,
      missedItems,
    },
    severityAgreement: {
      compared,
      agreed,
      overstated,
      understated,
      rate: compared > 0 ? agreed / compared : 1,
    },
    volume: {
      perPhoto,
      reviewerPerPhoto,
      ratio: reviewerPerPhoto > 0 ? perPhoto / reviewerPerPhoto : 0,
    },
    capBreaches,
  };
}

export function formatExpectationsReport(r: ExpectationsReport): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const out: string[] = [];

  out.push(`Against ${r.reviewer ?? 'reviewer'}'s notes — ${r.label}`);
  out.push(`  run model: ${r.model}`);
  out.push('');
  out.push(
    `  volume           ${r.producedFindings} findings vs ${r.expectedFindings} wanted ` +
      `(${r.volume.perPhoto.toFixed(2)}/photo vs ${r.volume.reviewerPerPhoto.toFixed(2)})`,
  );

  const ratio = r.volume.ratio;
  const verdict =
    ratio > 1.5 ? `${ratio.toFixed(1)}× too talkative` : ratio < 0.6 ? `${ratio.toFixed(1)}× too quiet` : 'about right';
  out.push(`                   ${verdict}`);
  out.push('');
  out.push(
    `  silence          ${r.silence.actuallySilent}/${r.silence.shouldBeSilent} photos kept quiet ` +
      `(${pct(r.silence.rate)})`,
  );
  if (r.silence.noiseFindings > 0) {
    out.push(`                   ${r.silence.noiseFindings} findings on photos that should say nothing`);
  }
  out.push('');
  out.push(
    `  recall           ${r.recall.matched}/${r.expectedFindings} of what he wanted found ` +
      `(${pct(r.recall.rate)})`,
  );
  out.push(
    `  severity         ${r.severityAgreement.agreed}/${r.severityAgreement.compared} agreed ` +
      `(${pct(r.severityAgreement.rate)}) · ${r.severityAgreement.overstated} over · ` +
      `${r.severityAgreement.understated} under`,
  );

  if (r.capBreaches.length > 0) {
    out.push('');
    out.push(`  cap breaches     ${r.capBreaches.length} photos over the limit:`);
    for (const b of r.capBreaches.slice(0, 5)) {
      out.push(`                     photo ${b.photo}: ${b.count} findings`);
    }
  }

  if (r.recall.missedItems.length > 0) {
    out.push('');
    out.push('  missed:');
    for (const m of r.recall.missedItems.slice(0, 10)) {
      out.push(`    photo ${String(m.photo).padStart(2)}  ${m.category.padEnd(14)} ${m.expect.slice(0, 62)}`);
    }
    if (r.recall.missedItems.length > 10) {
      out.push(`    … and ${r.recall.missedItems.length - 10} more`);
    }
  }

  return out.join('\n');
}
