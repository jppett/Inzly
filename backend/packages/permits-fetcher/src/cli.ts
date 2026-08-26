/**
 * Look up permit history for an address and print it.
 *
 *   pnpm --filter @bones-report/permits-fetcher lookup "407 Turners Xrd N, Golden Valley, MN"
 *
 * Runs against the mock fixture without SHOVELS_API_KEY.
 */
import { permitsForCategory, INSIGHT_CATEGORIES } from '@bones-report/shared';
import { createPermitProvider } from './services/index.js';

async function main(): Promise<void> {
  const address = process.argv.slice(2).join(' ').trim();
  if (!address) {
    console.error('Usage: lookup "<address>"');
    process.exit(1);
  }

  const provider = createPermitProvider();
  const { matchedAddress, geoId, permits } = await provider.getPermits(address);

  if (permits.length === 0) {
    console.log(`\nNo permits found for "${address}".`);
    return;
  }

  console.log(`\n${matchedAddress ?? address}${geoId ? `  (${geoId})` : ''}`);
  console.log(`${permits.length} permits\n`);

  for (const p of permits) {
    const value = p.jobValue ? `$${p.jobValue.toLocaleString()}` : '—';
    console.log(
      `  ${(p.issueDate ?? 'undated').padEnd(11)} ${value.padStart(10)}  ${p.description}`,
    );
    if (p.categories.length) {
      console.log(`${' '.repeat(25)}→ ${p.categories.join(', ')}`);
    }
  }

  console.log('\nWhat each agent would be told:\n');
  for (const category of INSIGHT_CATEGORIES) {
    const relevant = permitsForCategory(permits, category);
    if (relevant.length === 0) continue;
    const newest = relevant[0];
    const age = newest.issueDate
      ? `${new Date().getFullYear() - new Date(newest.issueDate).getFullYear()} years ago`
      : 'date unknown';
    console.log(
      `  ${category.padEnd(15)} ${relevant.length} permit(s), most recent ${newest.issueDate ?? '—'} (${age})`,
    );
  }
}

main().catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});
