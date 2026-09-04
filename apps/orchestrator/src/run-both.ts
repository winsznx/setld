import { run } from './lifecycle.js';

const common = { executorBond: 5n * 10n ** 18n, creatorBond: 2n * 10n ** 18n, relayerBudget: 1n * 10n ** 18n, rewardAmount: 10n * 10n ** 18n, maxAmountIn: 10_000n * 10n ** 18n, minAmountOut: 9_000n * 10n ** 18n, execMinOut: 9_000n * 10n ** 18n };
const runs = [
  { ...common, label: 'canonical-correct', execAmountIn: 5_000n * 10n ** 18n, expectTerminal: 'FULFILLED' as const },
  { ...common, label: 'canonical-wrong-cap', execAmountIn: 25_000n * 10n ** 18n, expectTerminal: 'INVALID_ATTEMPT' as const },
];
for (const r of runs) {
  const e = await run(r);
  console.log(`\n### ${r.label}: ${e.match}\n`);
}
