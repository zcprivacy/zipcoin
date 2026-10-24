import type { CircuitsInterface } from '@0xbow/privacy-pools-core-sdk';

import { ARTIFACTS_URL } from './config';

// The SDK keeps these two types internal; they are reproduced structurally here.
type Artifacts = { wasm: Uint8Array; vkey: Uint8Array; zkey: Uint8Array };
type Binaries = { commitment: Artifacts; withdraw: Artifacts; merkleTree?: Artifacts };
type CircuitNameString = 'commitment' | 'merkleTree' | 'withdraw';

/**
 * Loads the proving artifacts served by this app. Same wasm and zkey bytes as the Privacy Pools
 * trusted setup; fetched once, cached in memory and by the browser.
 */
export class HostedCircuits implements CircuitsInterface {
  private binaries?: Binaries;
  private loading?: Promise<Binaries>;
  onProgress?: (msg: string) => void;

  constructor(private readonly base: string = ARTIFACTS_URL) {}

  async downloadArtifacts(): Promise<Binaries> {
    const fetchBin = async (name: string) => {
      this.onProgress?.(`loading ${name}`);
      const res = await fetch(`${this.base}/${name}`);
      if (!res.ok) throw new Error(`failed to load ${name}`);
      return new Uint8Array(await res.arrayBuffer());
    };
    const [cw, cv, cz, ww, wv, wz] = await Promise.all([
      fetchBin('commitment.wasm'),
      fetchBin('commitment.vkey'),
      fetchBin('commitment.zkey'),
      fetchBin('withdraw.wasm'),
      fetchBin('withdraw.vkey'),
      fetchBin('withdraw.zkey'),
    ]);
    return { commitment: { wasm: cw, vkey: cv, zkey: cz }, withdraw: { wasm: ww, vkey: wv, zkey: wz } };
  }

  async initArtifacts(): Promise<void> {
    await this.ready();
  }

  private ready(): Promise<Binaries> {
    if (this.binaries) return Promise.resolve(this.binaries);
    this.loading ??= this.downloadArtifacts().then((b) => (this.binaries = b));
    return this.loading;
  }

  private async artifact(name: CircuitNameString) {
    const b = await this.ready();
    const a = name === 'commitment' ? b.commitment : name === 'withdraw' ? b.withdraw : b.merkleTree;
    if (!a) throw new Error(`no artifacts for ${name}`);
    return a;
  }

  async getVerificationKey(name: CircuitNameString) {
    return (await this.artifact(name)).vkey;
  }
  async getProvingKey(name: CircuitNameString) {
    return (await this.artifact(name)).zkey;
  }
  async getWasm(name: CircuitNameString) {
    return (await this.artifact(name)).wasm;
  }
}
