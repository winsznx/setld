'use client';
import facts from '../data/submission-facts.json';

const BASE = (facts as { attestcoin: { proofBuilder: string } }).attestcoin.proofBuilder;

export interface RawProof {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txHash: string;
  txBytes: string;
  merkleProof: { root: string; siblings: { hash: string; isLeft: boolean }[] };
  continuityProof: { lowerEndpointDigest: string; roots: string[] };
}

export async function attestedHeight(chainKey = 1): Promise<number> {
  const r = await fetch(`${BASE}/api/v1/attested-height/${chainKey}`);
  if (!r.ok) throw new Error(`attested-height ${r.status}`);
  const j = await r.json();
  return Number(j.height ?? j.attestedHeight ?? j);
}

export async function proofByTx(txHash: string, chainKey = 1): Promise<RawProof> {
  const r = await fetch(`${BASE}/api/v1/proof-by-tx/${chainKey}/${txHash}`);
  if (!r.ok) throw new Error(`proof-by-tx ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}
