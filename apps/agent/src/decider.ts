/**
 * The model decision step (PRD 18.4A "DECIDE").
 *
 * A real Claude call makes the bounded ACCEPT / ABSTAIN choice over the structured
 * observe+analyze inputs. It runs only on mandates that already passed every deterministic
 * guardrail, and its output is constrained to {decision, rationale, route}. The model can
 * never mark an execution successful, choose a payout, alter mandate terms, or pick an
 * unapproved route — those are outside this function entirely.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export interface DecisionInput {
  mandateId: string;
  rewardWei: string;
  executorBondWei: string;
  estSourceGasWei: string;
  netMarginWei: string;
  deadlineMarginBlocks: number;
  approvedRoutes: string[];
  simulation: { ok: boolean; reason: string; observedAmountOut?: string };
  guardrails: { code: string; pass: boolean; detail: string }[];
}

export interface Decision {
  decision: 'ACCEPT' | 'ABSTAIN';
  route: string | null;
  rationale: string;
  model: string;
  raw: string;
}

const SYSTEM = `You are the decision core of an autonomous treasury-execution agent operating on setld.
You are given ONE mandate that has already passed every deterministic safety guardrail.
Decide whether to ACCEPT it (the agent will then bond and execute the source transaction)
or ABSTAIN (skip it). Judge purely on the economics and risk in the input: reward versus
worst-case cost (bond at risk + source gas), the net margin, the deadline margin in blocks,
and whether the simulation is clean. Prefer ABSTAIN when the net margin is thin relative to
the bond at risk or the deadline margin is uncomfortable. If you ACCEPT you must pick a
route from approvedRoutes exactly as written.
Reply with ONLY a JSON object: {"decision":"ACCEPT"|"ABSTAIN","route":<string|null>,"rationale":<one sentence>}`;

async function callClaude(payload: DecisionInput): Promise<{ text: string; model: string }> {
  const prompt = `${SYSTEM}\n\nMANDATE:\n${JSON.stringify(payload, null, 2)}`;
  const { stdout } = await run(
    'claude',
    ['-p', prompt, '--output-format', 'json', '--model', 'claude-sonnet-5'],
    { maxBuffer: 4 * 1024 * 1024, timeout: 120_000 },
  );
  const parsed = JSON.parse(stdout);
  return { text: parsed.result ?? stdout, model: parsed.model ?? 'claude-sonnet-5' };
}

export async function decide(input: DecisionInput): Promise<Decision> {
  const { text, model } = await callClaude(input);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`decider: no JSON in model output: ${text.slice(0, 200)}`);
  const obj = JSON.parse(m[0]) as { decision: string; route: string | null; rationale: string };

  let decision: 'ACCEPT' | 'ABSTAIN' = obj.decision === 'ACCEPT' ? 'ACCEPT' : 'ABSTAIN';
  let route = obj.route;

  // enforce: an ACCEPT must name an approved route; otherwise downgrade
  if (decision === 'ACCEPT' && (!route || !input.approvedRoutes.includes(route))) {
    decision = 'ABSTAIN';
    route = null;
  }

  return {
    decision,
    route: decision === 'ACCEPT' ? route : null,
    rationale: String(obj.rationale ?? '').slice(0, 400),
    model,
    raw: text.slice(0, 2000),
  };
}
