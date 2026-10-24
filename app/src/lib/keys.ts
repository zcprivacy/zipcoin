import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { hexToBytes, keccak256, type Hex } from 'viem';

/**
 * The zip phrase is a 12-word BIP-39 mnemonic derived from a wallet signature over a fixed message.
 * The same wallet always produces the same phrase, so nothing needs to be stored. The phrase alone
 * controls the notes: anyone holding it can spend them, and losing both wallet and phrase loses them.
 */
export function phraseFromSignature(signature: Hex): string {
  const entropy = hexToBytes(keccak256(signature)).slice(0, 16);
  return entropyToMnemonic(entropy, wordlist);
}

export function isValidPhrase(phrase: string): boolean {
  return validateMnemonic(phrase.trim().toLowerCase().split(/\s+/).join(' '), wordlist);
}

export function normalizePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).join(' ');
}
