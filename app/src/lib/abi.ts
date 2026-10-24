import { parseAbi } from 'viem';

export const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

export const entrypointAbi = parseAbi([
  'function deposit(address asset, uint256 value, uint256 precommitment) returns (uint256)',
  'function latestRoot() view returns (uint256)',
]);

export const poolAbi = parseAbi([
  'struct RagequitProof { uint256[2] pA; uint256[2][2] pB; uint256[2] pC; uint256[4] pubSignals; }',
  'function ragequit(RagequitProof proof)',
  'function depositors(uint256 label) view returns (address)',
  'function nullifierHashes(uint256) view returns (bool)',
]);
