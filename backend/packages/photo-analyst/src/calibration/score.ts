import type { InsightSeverity } from '@bones-report/shared';
import type { GoldenFile, ReviewBundle, FindingVerdict } from './types.js';

const SEVERITY_ORDER: InsightSeverity[] = ['good', 'info', 'warning', 'critical'];

export interface CalibrationReport {
  label: string;
  model: string;
  reviewedAgainst: string;

  /** Findings the reviewer judged real and worth reporting. */
  precision: number;
  /** Of those, how many carried the right severity. */
  severityAccuracy: number;

  /**
   * Reported separately on purpose. Overstating is a trust problem;
   * understating is a liability problem. They need different fixes.
   */
  overstated: number;
  understated: number;

  notReal: number;
  notMaterial: number;
  missed: number;

  /** Signed mean severity error: positive means the agents run hot. */
  severityBias: number;

  cost: {
    judged: number;
    aboutRight: number;
    tooHigh: number;
    tooLow: number;
    shouldBeAbsent: number;
    shouldBePresent: number;
  };

  /** Worst offenders first — where to spend brief-editing effort. */
  byCategory: Array<{
    category: string;
    reviewed: number;
    agreed: number;
    overstated: number;
    understated: number;
    notReal: number;
  }>;

  unreviewed: number;
}

export function scoreRun(bundle: ReviewBundle, golden: GoldenFile): CalibrationReport {
  const byId = new Map(golden.verdicts.map((v) => [v.insightId, v]));
  const categoryOf = new Map(bundle.insights.map((i) => [i.id, i.category]));
  const severityOf = new Map(bundle.insights.map((i) => [i.id, i.severity]));

  let real = 0;
  let agreed = 0;
  let overstated = 0;
  let understated = 0;
  let notReal = 0;
  let notMaterial = 0;
  let biasTotal = 0;
  let biasCount = 0;

  const cost = {
    judged: 0,
    aboutRight: 0,
    tooHigh: 0,
    tooLow: 0,
    shouldBeAbsent: 0,
    shouldBePresent: 0,
  };

  const categories = new Map<string, CalibrationReport['byCategory'][number]>();
  const bump = (id: string, field: 'reviewed' | 'agreed' | 'overstated' | 'understated' | 'notReal') => {
    const category = categoryOf.get(id) ?? 'unknown';
    const row =
      categories.get(category) ??
      { category, reviewed: 0, agreed: 0, overstated: 0, understated: 0, notReal: 0 };
    row[field] += 1;
    categories.set(category, row);
  };

  for (const verdict of golden.verdicts) {
    if (!severityOf.has(verdict.insightId)) continue;
    bump(verdict.insightId, 'reviewed');

    if (verdict.verdict === 'not_real') {
      notReal += 1;
      bump(verdict.insightId, 'notReal');
    } else if (verdict.verdict === 'not_material') {
      notMaterial += 1;
    } else {
      real += 1;
      if (verdict.verdict === 'agree') {
        agreed += 1;
        bump(verdict.insightId, 'agreed');
      } else {
        const drift = severityDrift(verdict, severityOf.get(verdict.insightId)!);
        biasTotal += drift;
        biasCount += 1;
        if (drift > 0) {
          overstated += 1;
          bump(verdict.insightId, 'overstated');
        } else if (drift < 0) {
          understated += 1;
          bump(verdict.insightId, 'understated');
        } else {
          agreed += 1;
          bump(verdict.insightId, 'agreed');
        }
      }
    }

    if (verdict.costVerdict) {
      cost.judged += 1;
      if (verdict.costVerdict === 'about_right') cost.aboutRight += 1;
      else if (verdict.costVerdict === 'too_high') cost.tooHigh += 1;
      else if (verdict.costVerdict === 'too_low') cost.tooLow += 1;
      else if (verdict.costVerdict === 'should_be_absent') cost.shouldBeAbsent += 1;
      else if (verdict.costVerdict === 'should_be_present') cost.shouldBePresent += 1;
    }
  }

  const reviewed = golden.verdicts.filter((v) => severityOf.has(v.insightId)).length;

  return {
    label: golden.label,
    model: bundle.model,
    reviewedAgainst: golden.reviewedModel,
    precision: reviewed > 0 ? real / reviewed : 0,
    severityAccuracy: real > 0 ? agreed / real : 0,
    overstated,
    understated,
    notReal,
    notMaterial,
    missed: golden.missed.length,
    severityBias: biasCount > 0 ? biasTotal / biasCount : 0,
    cost,
    byCategory: [...categories.values()].sort(
      (a, b) =>
        b.overstated + b.understated + b.notReal - (a.overstated + a.understated + a.notReal),
    ),
    unreviewed: bundle.insights.length - reviewed,
  };
}

/** Positive when the agent was more severe than the reviewer. */
function severityDrift(verdict: FindingVerdict, agentSeverity: InsightSeverity): number {
  if (!verdict.correctedSeverity) return 0;
  return (
    SEVERITY_ORDER.indexOf(agentSeverity) - SEVERITY_ORDER.indexOf(verdict.correctedSeverity)
  );
}

export function formatReport(report: CalibrationReport): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const lines: string[] = [];

  lines.push(`Calibration — ${report.label}`);
  lines.push(`  run model:      ${report.model}`);
  lines.push(`  verdicts from:  ${report.reviewedAgainst}`);
  lines.push('');
  lines.push(`  precision        ${pct(report.precision)}  (findings judged real and material)`);
  lines.push(`  severity right   ${pct(report.severityAccuracy)}  (of those judged real)`);
  lines.push('');
  lines.push(`  overstated       ${report.overstated}`);
  lines.push(`  understated      ${report.understated}`);
  lines.push(`  not real         ${report.notReal}`);
  lines.push(`  not material     ${report.notMaterial}`);
  lines.push(`  missed entirely  ${report.missed}`);
  lines.push('');

  const bias = report.severityBias;
  const direction =
    Math.abs(bias) < 0.1 ? 'balanced' : bias > 0 ? 'runs hot (overstates)' : 'runs cold (understates)';
  lines.push(`  severity bias    ${bias >= 0 ? '+' : ''}${bias.toFixed(2)}  — ${direction}`);

  if (report.cost.judged > 0) {
    lines.push('');
    lines.push(
      `  cost             ${report.cost.aboutRight}/${report.cost.judged} about right` +
        ` · ${report.cost.tooHigh} too high · ${report.cost.tooLow} too low` +
        ` · ${report.cost.shouldBeAbsent} shouldn't have a number` +
        ` · ${report.cost.shouldBePresent} should have one`,
    );
  }

  if (report.byCategory.length > 0) {
    lines.push('');
    lines.push('  worst categories (most disagreement first):');
    for (const row of report.byCategory.slice(0, 6)) {
      const problems = row.overstated + row.understated + row.notReal;
      if (problems === 0) continue;
      lines.push(
        `    ${row.category.padEnd(15)} ${row.agreed}/${row.reviewed} agreed` +
          ` · ${row.overstated} over · ${row.understated} under · ${row.notReal} not real`,
      );
    }
  }

  if (report.unreviewed > 0) {
    lines.push('');
    lines.push(`  ${report.unreviewed} findings not yet reviewed`);
  }

  return lines.join('\n');
}
