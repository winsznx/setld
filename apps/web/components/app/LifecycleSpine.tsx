'use client';
import { CC3, SEPOLIA } from '@/lib/chain';

export interface SpineNode {
  label: string;
  state: 'reached' | 'current' | 'future';
  at?: string;
  detail?: string;
  link?: { href: string; text: string };
  tone?: 'affirm' | 'refuse' | 'pending';
}

/** design.md §5.1 — the dated lifecycle spine. */
export function LifecycleSpine({ nodes }: { nodes: SpineNode[] }) {
  return (
    <ol className="spine">
      {nodes.map((n, i) => {
        const glyph = n.state === 'reached' ? '▪' : n.state === 'current' ? '◐' : '▫';
        return (
          <li key={i} className={`spine-node ${n.state}`} data-tone={n.tone}>
            <span className="spine-connector" aria-hidden />
            <span className={`spine-glyph glyph ${n.tone === 'affirm' ? 'pass' : n.tone === 'refuse' ? 'fail' : n.state === 'current' ? 'pending' : ''}`}>
              {glyph}
            </span>
            <span className="spine-body">
              <span className="spine-label">{n.label}</span>
              {n.at && <span className="spine-at caption"> {n.at}</span>}
              {n.detail && <span className="spine-detail mono-sm">{n.detail}</span>}
              {n.link && (
                <a className="spine-link mono-sm" href={n.link.href} target="_blank" rel="noreferrer">
                  {n.link.text} ↗
                </a>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function explorerTx(chain: 'cc3' | 'sepolia', hash: string): string {
  return `${chain === 'cc3' ? CC3.explorer : SEPOLIA.explorer}/tx/${hash}`;
}
