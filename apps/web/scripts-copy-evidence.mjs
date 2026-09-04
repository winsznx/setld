import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const R = resolve(import.meta.dirname, '../..');
const D = resolve(import.meta.dirname, 'data');
mkdirSync(D, { recursive: true });
for (const [from, to] of [
  ['evidence/submission-facts.json', 'submission-facts.json'],
  ['evidence/completed-mandates/canonical-correct.json', 'completed-mandates/canonical-correct.json'],
  ['evidence/completed-mandates/canonical-wrong-cap.json', 'completed-mandates/canonical-wrong-cap.json'],
  ['evidence/campaigns/ablations/reporter-compromise.json', 'campaigns/ablations/reporter-compromise.json'],
  ['evidence/agent/decision-log.json', 'agent/decision-log.json'],
]) {
  try { cpSync(resolve(R, from), resolve(D, to)); console.log('copied', to); } catch (e) { console.warn('skip', to, e.message); }
}
