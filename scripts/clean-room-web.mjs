/** Wallet-free judge-path check against the live deployment (PRD 11.14 verifier test). */
const BASE = process.env.SETLD_URL || 'https://setld.pages.dev';
const checks = [
  ['/', ['The agent did not report completion. The receipt did.', 'View the live proof']],
  ['/proof/', ['Attestcoin verifier proved both', 'invalid reward leaked', 'How could this result be misleading']],
  ['/verify/', ['Verify a mandate', 'BlockProver precompile']],
  ['/mandates/0x2e69eac5b98a7192868083b62ad5d756aa917a019ac0c0a701b117e3a43094c7/', ['Mandate record', 'reward was released']],
  ['/mandates/0x507b1d27d27cc9121a7f1af24bb364efbde7c49d6856ec0fef91f354b6f9950d/', ['Mandate record', 'violated a committed condition']],
];
let fail = 0;
const results = [];
for (const [path, needles] of checks) {
  const r = await fetch(BASE + path);
  const body = await r.text();
  const missing = needles.filter((n) => !body.includes(n));
  const ok = r.status === 200 && missing.length === 0;
  if (!ok) fail++;
  results.push({ path, status: r.status, ok, missing });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path} (${r.status})${missing.length ? ' missing: ' + missing.join(' | ') : ''}`);
}
const out = { checkedAt: new Date().toISOString(), base: BASE, allPass: fail === 0, results,
  note: 'Wallet-free judge surface. A fresh visitor reaches the proof diptych, the ablation, and browser-side verification with no wallet, no login, no repo. The wallet-based creator/executor onboarding UI is not built (Gate S12 PARTIAL).' };
import('node:fs').then(fs => fs.writeFileSync('evidence/fresh-user/clean-room-web.json', JSON.stringify(out, null, 2) + '\n'));
process.exit(fail === 0 ? 0 : 1);
