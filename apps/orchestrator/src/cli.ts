import { run, type LifecycleParams } from './lifecycle.js';

const PRESETS: Record<string, LifecycleParams> = {
  'canonical-correct': {
    label: 'canonical-correct',
    rewardAmount: 10n * 10n ** 18n,
    executorBond: 5n * 10n ** 18n,
    creatorBond: 2n * 10n ** 18n,
    relayerBudget: 1n * 10n ** 18n,
    maxAmountIn: 10_000n * 10n ** 18n,
    minAmountOut: 9_000n * 10n ** 18n,
    execAmountIn: 5_000n * 10n ** 18n,
    execMinOut: 9_000n * 10n ** 18n,
    expectTerminal: 'FULFILLED',
  },
  'canonical-wrong-cap': {
    label: 'canonical-wrong-cap',
    rewardAmount: 10n * 10n ** 18n,
    executorBond: 5n * 10n ** 18n,
    creatorBond: 2n * 10n ** 18n,
    relayerBudget: 1n * 10n ** 18n,
    maxAmountIn: 10_000n * 10n ** 18n,
    minAmountOut: 9_000n * 10n ** 18n,
    // executor puts in MORE than the committed cap; the Sepolia tx still succeeds
    execAmountIn: 25_000n * 10n ** 18n,
    execMinOut: 9_000n * 10n ** 18n,
    expectTerminal: 'INVALID_ATTEMPT',
  },
};

const which = process.argv[2];
if (!which || !PRESETS[which]) {
  console.error(`usage: setld-lifecycle <${Object.keys(PRESETS).join('|')}>`);
  process.exit(1);
}
run(PRESETS[which]!)
  .then((e) => process.exit(e.match === 'PASS' || e.match === 'replay-rejected-as-expected' ? 0 : 1))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
