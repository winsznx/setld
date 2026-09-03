import abis from './abis.json' with { type: 'json' };
export const ABIS = abis as Record<string, unknown[]>;
export { default as deployments } from '../../../evidence/deployments/addresses.json' with { type: 'json' };
