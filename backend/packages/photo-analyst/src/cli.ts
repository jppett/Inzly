/**
 * Run the expert agents against a set of photo URLs and print the report.
 *
 *   pnpm --filter @bones-report/photo-analyst analyse <url> [url...]
 *   pnpm --filter @bones-report/photo-analyst analyse --category roof <url>
 *
 * Needs no Redis, Kafka or running stack — useful for tuning agent briefs
 * against real listings and seeing what changes.
 */
import { randomUUID } from 'node:crypto';
import { PhotoAnalyst } from './services/analyst.js';
import { createVisionProvider } from './providers/index.js';
import { loadPermits } from './services/permits.js';
import { EXPERT_AGENTS } from './agents/definitions.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const categories: string[] = [];
  const urls: string[] = [];
  let address: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--category' || args[i] === '-c') {
      categories.push(args[++i]);
    } else if (args[i] === '--address' || args[i] === '-a') {
      address = args[++i];
    } else if (args[i] === '--list') {
      console.log(EXPERT_AGENTS.map((a) => `${a.category.padEnd(16)} ${a.label}`).join('\n'));
      return;
    } else {
      urls.push(args[i]);
    }
  }

  if (urls.length === 0) {
    console.error(
      'Usage: analyse [--address "<address>"] [--category <name>]... <photo-url> [photo-url...]\n' +
        '       analyse --list    (show available agents)\n\n' +
        'Passing --address pulls permit history so the agents can corroborate what they see.',
    );
    process.exit(1);
  }

  const permits = await loadPermits(address);
  const provider = createVisionProvider();
  const analyst = new PhotoAnalyst(provider);

  console.log(
    `\nAnalysing ${urls.length} photo(s) with ${provider.model}` +
      (permits.length ? ` and ${permits.length} permits on record` : '') +
      '...\n',
  );
  const started = Date.now();

  const { result, usage, failures } = await analyst.analyse(randomUUID(), urls, {
    categories: categories.length ? categories : undefined,
    permits,
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`${result.summary.headline}`);
  console.log(`Overall: ${result.summary.overallCondition}`);
  console.log(
    `Findings: ${result.summary.counts.critical} critical, ` +
      `${result.summary.counts.warning} warning, ` +
      `${result.summary.counts.info} info, ` +
      `${result.summary.counts.good} good`,
  );
  if (result.summary.estimatedCostRange) {
    const { low, high } = result.summary.estimatedCostRange;
    console.log(`Estimated spend: $${low.toLocaleString()}–$${high.toLocaleString()}`);
  }
  console.log();

  for (const category of result.categories) {
    const found = result.insights.filter((i) => i.category === category.category);
    console.log(
      `── ${category.category} — ${category.rating} (confidence: ${category.confidence}` +
        `${category.provenance && category.provenance.runs > 1 ? `, ${Math.round(category.provenance.agreement * 100)}% run agreement` : ''})`,
    );
    if (category.rating === 'not_visible') {
      console.log('   not visible in these photographs\n');
      continue;
    }
    console.log(`   ${category.summary}`);
    for (const insight of found) {
      const cost = insight.costEstimate
        ? ` [$${insight.costEstimate.low.toLocaleString()}–$${insight.costEstimate.high.toLocaleString()}]`
        : '';
      console.log(`   • [${insight.severity}] ${insight.title}${cost}`);
      for (const e of insight.evidence) {
        console.log(`       saw: ${e.observed}`);
        if (e.inference) console.log(`       so:  ${e.inference}`);
      }
    }
    console.log();
  }

  if (failures.length) {
    console.log(`Failed categories: ${failures.map((f) => f.category).join(', ')}\n`);
  }

  const cached = usage.cacheReadTokens;
  const total = cached + usage.inputTokens;
  console.log(
    `${elapsed}s · input ${usage.inputTokens.toLocaleString()} · output ${usage.outputTokens.toLocaleString()} · ` +
      `cached ${cached.toLocaleString()}${total > 0 ? ` (${Math.round((cached / total) * 100)}% of input)` : ''}`,
  );
}

main().catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});
