// Static landing sections. Interactive sections (hero, receipt demo, Book preview) live in their own components.
import { CopyButton } from './CopyButton';
import { Redact } from './Redact';

export function Thesis() {
  return (
    <>
      <section className="section" id="thesis">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Thesis</p>
            <h2>Privacy is choosing who knows.</h2>
            <p>Privacy is not secrecy from everyone. It is control over who is party to each payment.</p>
          </div>
          <div className="sec-body">
            <div className="prose">
              <p>Every Ethereum payment today is a public record. Your salary, your rent, your donations and your mistakes sit in one ledger that anyone can read, forever, and cross-reference with everything else you have ever done. That is not transparency. It is a permanent surveillance record.</p>
              <p>Zipcoin takes the other position. A payment should be visible to the people in it, provable to anyone who legitimately needs proof, and invisible to everyone else. The protocol lets you show that your funds came from an approved set of deposits without showing which deposit was yours.</p>
            </div>
            <figure className="quote">
              <blockquote>“Only <Redact label="Reveal redacted name">Gladias</Redact> and the restaurant knew that a <Redact label="Reveal redacted amount">10.5 zipcoin</Redact> order had been made.”</blockquote>
              <figcaption>Snowmoon, chapter 6 · Vitalik Buterin, 2026 · GPL v3</figcaption>
            </figure>
            <ul className="pillars">
              <li><span className="eyebrow">Non-custodial</span><p>The pool holds a commitment, not an account. Only a proof built on your device can move what you deposited.</p></li>
              <li><span className="eyebrow">Vetted at deposit</span><p>Deposits are screened against a published association policy before they enter the approved set. No monitoring of users is required afterwards.</p></li>
              <li><span className="eyebrow">Unconditional exit</span><p>Ragequit returns a deposit to the address that made it, without approval from any operator, including us.</p></li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

export function Architecture() {
  return (
    <>
      <section className="section" id="architecture">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Architecture</p>
            <h2>A small pool, stateless spenders, replaceable operators.</h2>
            <p>The trusted surface is the audited core. Everything else can be swapped out by anyone.</p>
          </div>
          <div className="sec-body">
            <div className="prose">
              <p>Zipcoin keeps the trusted surface small. The pool, its Merkle tree and its verifiers are the open-source Privacy Pools protocol developed by 0xbow and released under Apache-2.0, deployed without modification. Zipcoin is an independent deployment and is not affiliated with 0xbow. Everything Zipcoin adds on-chain is stateless and ownerless. Off-chain services are designed to be replaceable.</p>
            </div>
            <div className="diagram" role="img" aria-label="Diagram of Zipcoin's architecture: your device proves, off-chain relayers, association set provider and indexer are replaceable, and on Ethereum mainnet the Entrypoint, ZC privacy pool and stateless spender contracts hold the trusted surface.">
              <svg viewBox="0 0 960 560" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill="var(--fg-3)"/>
                  </marker>
                  <marker id="arrc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill="var(--frost)"/>
                  </marker>
                </defs>
                <text className="band" x="24" y="34">YOUR DEVICE</text>
                <line className="rule" x1="24" y1="44" x2="936" y2="44"/>
                <text className="band" x="24" y="190">OFF-CHAIN · REPLACEABLE</text>
                <line className="rule" x1="24" y1="200" x2="936" y2="200"/>
                <text className="band" x="24" y="346">ETHEREUM MAINNET · TRUSTED SURFACE</text>
                <line className="rule" x1="24" y1="356" x2="936" y2="356"/>

                <rect className="box" x="60" y="66" width="220" height="92" rx="4"/>
                <text className="lbl" x="76" y="94">Wallet + prover</text>
                <text className="sub" x="76" y="114">Notes derived from your phrase</text>
                <text className="sub" x="76" y="130">Groth16 proof built in-browser</text>
                <text className="sub" x="76" y="146">Reads public events only</text>

                <rect className="box-off" x="60" y="222" width="220" height="92" rx="4"/>
                <text className="lbl" x="76" y="250">Relayers (many)</text>
                <text className="sub" x="76" y="270">Submit your proof for a fee</text>
                <text className="sub" x="76" y="286">Open spec · anyone can run one</text>
                <text className="sub" x="76" y="302">ERC-4337 path planned</text>

                <rect className="box-off" x="370" y="222" width="220" height="92" rx="4"/>
                <text className="lbl" x="386" y="250">Association set provider</text>
                <text className="sub" x="386" y="270">Vets deposits against a policy</text>
                <text className="sub" x="386" y="286">Publishes the full set to IPFS</text>
                <text className="sub" x="386" y="302">Posts roots to the Entrypoint</text>

                <rect className="box-off" x="680" y="222" width="220" height="92" rx="4"/>
                <text className="lbl" x="696" y="250">Indexer</text>
                <text className="sub" x="696" y="270">Mirrors pool events for wallets</text>
                <text className="sub" x="696" y="286">Stateless · rebuildable from chain</text>
                <text className="sub" x="696" y="302">Several, not one</text>

                <rect className="box" x="60" y="378" width="150" height="70" rx="4"/>
                <text className="lbl" x="76" y="406">ZC token</text>
                <text className="sub" x="76" y="426">Fixed supply ERC-20</text>

                <rect className="box-core" x="250" y="378" width="190" height="70" rx="4"/>
                <text className="lbl" x="266" y="406">Entrypoint</text>
                <text className="sub" x="266" y="426">Owner behind 48h timelock</text>
                <text className="sub" x="266" y="440">Registers pools, holds roots</text>

                <rect className="box-core" x="480" y="378" width="230" height="70" rx="4"/>
                <text className="lbl" x="496" y="406">ZC privacy pool</text>
                <text className="sub" x="496" y="426">Commitment tree · nullifiers</text>
                <text className="sub" x="496" y="440">Two Groth16 verifiers · immutable</text>

                <rect className="box" x="60" y="478" width="150" height="54" rx="4"/>
                <text className="lbl" x="76" y="500">The Book</text><text className="sub" x="76" y="518">Burn to post</text>
                <rect className="box" x="226" y="478" width="150" height="54" rx="4"/>
                <text className="lbl" x="242" y="500">The Doorstep</text><text className="sub" x="242" y="518">Burn at an address</text>
                <rect className="box" x="392" y="478" width="150" height="54" rx="4"/>
                <text className="lbl" x="408" y="500">The Tellers</text><text className="sub" x="408" y="518">Pay out in ETH or stables · Phase V</text>
                <rect className="box" x="558" y="478" width="150" height="54" rx="4"/>
                <text className="lbl" x="574" y="500">The Hearth</text><text className="sub" x="574" y="518">Gifts with a burn · Phase V</text>
                <rect className="box" x="724" y="478" width="176" height="54" rx="4"/>
                <text className="lbl" x="740" y="500">The Changer</text><text className="sub" x="740" y="518">Swap inside a withdrawal · Phase V</text>
                <text className="sub" x="750" y="466">stateless · ownerless spenders</text>

                <path className="edge-core" d="M170 158 V222" markerEnd="url(#arrc)"/>
                <path className="edge-core" d="M170 314 V378" markerEnd="url(#arrc)"/>
                <path className="edge-core" d="M440 413 H480" markerEnd="url(#arrc)"/>
                <path className="edge" d="M480 314 V378" markerEnd="url(#arr)"/>
                <path className="edge" d="M790 314 V340 H660 V378" markerEnd="url(#arr)"/>
                <path className="edge" d="M210 413 H250" markerEnd="url(#arr)"/>
                <path className="edge" d="M790 222 V158 H280" markerEnd="url(#arr)"/>
                <path className="edge" d="M595 448 V462 H135 V478" markerEnd="url(#arr)"/>
                <path className="edge" d="M595 448 V462 H301 V478" markerEnd="url(#arr)"/>
                <path className="edge" d="M595 448 V462 H467 V478" markerEnd="url(#arr)"/>
                <path className="edge" d="M595 448 V478" markerEnd="url(#arr)"/>
                <path className="edge" d="M595 448 V462 H812 V478" markerEnd="url(#arr)"/>
                <text className="sub" x="182" y="178">proof</text>
                <text className="sub" x="182" y="336">relay</text>
                <text className="sub" x="488" y="336">roots</text>
                <text className="sub" x="700" y="336">events</text>
                <text className="sub" x="540" y="150">public events</text>
              </svg>
            </div>
            <ul className="legend">
              <li><b>Entrypoint<span className="mono">ERC-1967 proxy</span></b><p>Registers pools, collects the vetting fee, accepts association roots. Owner actions pass through a 48-hour timelock. The owner can close a pool to new deposits but cannot block withdrawals or ragequit, and cannot move pool funds.</p></li>
              <li><b>ZC privacy pool<span className="mono">immutable</span></b><p>A Lean incremental Merkle tree of commitments, a nullifier set and two Groth16 verifiers from the audited Privacy Pools core. Nobody can upgrade it.</p></li>
              <li><b>Spenders<span className="mono">ownerless</span></b><p>The Book and the Doorstep today; the Tellers, the Hearth and the Changer in Phase V. Each decodes a payload bound to your proof and does one thing. None has an owner or a balance that lingers.</p></li>
              <li><b>Association set provider<span className="mono">published policy</span></b><p>Decides which deposits join the approved set and publishes the whole set to IPFS so the policy can be audited, not trusted.</p></li>
              <li><b>Relayers<span className="mono">open spec</span></b><p>Submit proofs so your wallet never signs the withdrawal. Specified so anyone can run one, paid from the withdrawal, never from a token.</p></li>
              <li><b>Prover and indexer<span className="mono">your device</span></b><p>Notes are derived from a phrase and recovered from public events. No account is required.</p></li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

export function Roadmap() {
  return (
    <>
      <section className="section" id="roadmap">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Roadmap</p>
            <h2>Milestones, not deadlines.</h2>
            <p>Each phase is released when its completion criteria are met and independently verifiable. No phase carries a target date.</p>
            <div className="legend-chips" aria-label="Status legend">
              <span className="chip chip-live">Live</span>
              <span className="chip chip-building">Building</span>
              <span className="chip chip-next">Next</span>
              <span className="chip chip-later">Later</span>
              <span className="chip chip-research">Research</span>
            </div>
          </div>
          <div className="sec-body">
            <ol className="phases">

              <li className="phase is-live">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase I</span><span className="chip chip-live">Live</span></div>
                  <h3>Genesis</h3>
                  <p className="lead">Token launched, domain secured, and the reference design documented.</p>
                  <ul className="deliverables">
                    <li className="done">ZC launched on Ethereum mainnet through a public launchpad</li>
                    <li className="done">Fixed supply, no team allocation, no presale</li>
                    <li className="done">zipcoin.zip registered and this site published</li>
                    <li className="done">Full review of the first attempt’s contracts and failure</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>Token verified on-chain. Site live. Protocol specification and trust model published in the repository.</p>
                </div>
              </li>

              <li className="phase is-building">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase II</span><span className="chip chip-building">Building</span></div>
                  <h3>Foundations</h3>
                  <p className="lead">The governance and disclosure groundwork around the protocol.</p>
                  <ul className="deliverables">
                    <li className="done">48-hour timelock deployed as the Entrypoint owner</li>
                    <li className="done">Public repository under Apache-2.0 with the protocol specification</li>
                    <li>Treasury address and spending policy published</li>
                    <li>Independent legal review of the non-custodial design</li>
                    <li className="done">Incident disclosure policy with a 24-hour clock</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>Timelock deployed and verified as the Entrypoint owner. Repository public. Treasury address published. Legal summary linked from this page.</p>
                </div>
              </li>

              <li className="phase is-live">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase III</span><span className="chip chip-live">Live</span></div>
                  <h3>The Pool</h3>
                  <p className="lead">A ZC shielded pool deployed from the audited Privacy Pools core, with its association policy published before the first deposit.</p>
                  <ul className="deliverables">
                    <li className="done">Entrypoint and ZC pool deployed from the audited core</li>
                    <li className="done">Reuse of the core’s audited Groth16 verifiers, no new ceremony</li>
                    <li className="done">Association set policy published, every set addressable by content hash</li>
                    <li>Full association sets mirrored to IPFS</li>
                    <li className="done">Ragequit tested and available from the Pool page</li>
                    <li className="done">Browser prover</li>
                    <li>Command-line client</li>
                    <li className="done">Public indexer that rebuilds from chain</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>Pool verified on-chain and matched to the published source. First association root posted. A deposit, a private withdrawal and a ragequit completed by an independent party.</p>
                </div>
              </li>

              <li className="phase is-live">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase IV</span><span className="chip chip-live">Live</span></div>
                  <h3>The Book and the Doorstep</h3>
                  <p className="lead">Unattributable public messaging, paid for by burning ZC.</p>
                  <ul className="deliverables">
                    <li className="done">The Book: burn-to-post from inside the pool, fixed minimum burn</li>
                    <li className="done">The Doorstep: a line left at one address, with its own minimum</li>
                    <li>Sealed Doorstep messages, readable only by the addressee</li>
                    <li>Envelopes for longer messages</li>
                    <li className="done">Spender source published and verified on Etherscan</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>Contracts verified on-chain and matched to the published source. First hundred entries posted by external users.</p>
                </div>
              </li>

              <li className="phase">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase V</span><span className="chip chip-next">Next</span></div>
                  <h3>Tellers, the Hearth and the Changer</h3>
                  <p className="lead">Withdrawals settled in other assets, and gifting from inside the pool.</p>
                  <ul className="deliverables">
                    <li>Tellers: pay out a withdrawal in ETH or a stablecoin</li>
                    <li>The Hearth: gifts that carry a burn, so generosity has a cost</li>
                    <li>The Changer: swap inside the withdrawal, with a public fee cap</li>
                    <li>Payment links a merchant can issue without knowing the payer</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>Each spender verified against its published source. Fee caps enforced on-chain and unchangeable. A merchant integration operated by a third party.</p>
                </div>
              </li>

              <li className="phase">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase VI</span><span className="chip chip-later">Later</span></div>
                  <h3>Open relaying</h3>
                  <p className="lead">Removing the core team from every operational role that touches user funds.</p>
                  <ul className="deliverables">
                    <li>Relayer specification and reference implementation</li>
                    <li>At least three independent relayers live</li>
                    <li>ERC-4337 paymaster path for withdrawals with no relayer at all</li>
                    <li>Association set provider role documented so others can run one</li>
                    <li>Second and third indexers run by other parties</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>A full month in which more than half of withdrawals were relayed by parties other than the team.</p>
                </div>
              </li>

              <li className="phase">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase VII</span><span className="chip chip-research">Research</span></div>
                  <h3>The Snowmoon layer</h3>
                  <p className="lead">Mechanisms described in Snowmoon that have not yet been implemented on Ethereum. Each requires new circuits and a new trusted setup, so this phase is research until a specification is published.</p>
                  <ul className="deliverables">
                    <li>Private sales tax paid in real time inside the same proof</li>
                    <li>Hidden payment amounts, not just hidden payers</li>
                    <li>Reputation-collateralised loans where only the nullifier and the amount are public</li>
                    <li>Nullifier-gated polls: one voice per note, no identities</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>Each mechanism specified, its trusted setup completed, and a mainnet deployment demonstrated against the chapter that describes it.</p>
                </div>
              </li>

              <li className="phase">
                <span className="node" aria-hidden="true"></span>
                <div>
                  <div className="phase-top"><span className="phase-num">Phase VIII</span><span className="chip chip-later">Later</span></div>
                  <h3>Reach</h3>
                  <p className="lead">Lower cost, additional networks, and integration with existing wallets.</p>
                  <ul className="deliverables">
                    <li>Deployment on an Ethereum L2 with the same policy</li>
                    <li>Integration with privacy-first wallets</li>
                    <li>Agent and MCP toolkit so software can pay privately too</li>
                    <li>One-command self-hosting of the entire stack</li>
                  </ul>
                  <p className="exit"><b>Completion criteria</b>A user completes a private payment from a third-party wallet with no Zipcoin website involved.</p>
                </div>
              </li>
            </ol>

            <div className="always">
              <div><p className="eyebrow">Alongside every phase</p><h3>Always</h3></div>
              <ul>
                <li>Any incident is disclosed within 24 hours, with transaction hashes.</li>
                <li>Every contract is verified and matched to a tagged commit before it is announced.</li>
                <li>This site and the app carry no analytics, trackers or third-party scripts.</li>
                <li>Progress is reported against this list, in public, and nowhere else first.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function Token() {
  return (
    <>
      <section className="section" id="token">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Token and treasury</p>
            <h2>One asset. No insider allocation.</h2>
            <p>ZC is the asset the pool shields and the Book burns. It confers no governance rights and no claim on fees.</p>
          </div>
          <div className="sec-body">
            <dl className="facts">
              <div><dt>Contract</dt><dd className="addr"><code id="addr">0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA</code><CopyButton text="0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA" /><a href="https://etherscan.io/token/0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA" target="_blank" rel="noopener">Etherscan</a></dd></div>
              <div><dt>Trade</dt><dd className="addr"><a className="btn btn-primary btn-sm" href="https://etherstreet.fun/t/0xa2f6441c4839a7fd4ef8536b971ced04c48a1cea" target="_blank" rel="noopener">Buy ZC on etherstreet.fun</a><span className="fine-inline">ZC / ETH launch pool</span></dd></div>
              <div><dt>Network</dt><dd>Ethereum mainnet</dd></div>
              <div><dt>Supply</dt><dd className="num">1,000,000,000 ZC, fixed. No mint function.</dd></div>
              <div><dt>Decimals</dt><dd className="num">18</dd></div>
              <div><dt>Launch</dt><dd>Public fair launch through etherstreet.fun, paired against ETH on Uniswap</dd></div>
              <div><dt>Team allocation</dt><dd>None. No presale, no vesting, no reserved supply.</dd></div>
              <div><dt>Rights</dt><dd>None. ZC carries no governance power and no share of fees.</dd></div>
            </dl>

            <div className="feeflow">
              <div>
                <h3>Treasury funding</h3>
                <p>Every swap on the launch pool pays a 1% fee in ETH. The launchpad splits it.</p>
                <div className="split" aria-label="Fee split: 40 percent to the protocol treasury, 60 percent to the launchpad">
                  <span className="t">40% · protocol treasury</span>
                  <span className="l">60% · launchpad</span>
                </div>
                <p>That share is the only funding source. There is no token sale, no grant and no allocation behind it.</p>
              </div>
              <div>
                <h3>Treasury use</h3>
                <ul>
                  <li>Relayers, indexers and the association set service while the network bootstraps</li>
                  <li>Development of the roadmap phases</li>
                  <li>Running the site and the app</li>
                  <li>No other expenditure without a published roadmap change</li>
                </ul>
                <p style={{marginTop: '.9rem'}}>The treasury address and every outgoing payment will be published with Phase II.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function Commitments() {
  return (
    <>
      <section className="section" id="commitments">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Commitments</p>
            <h2>What we will not do.</h2>
            <p>Each one is a constraint the first attempt operated without.</p>
          </div>
          <div className="sec-body">
            <ul className="commit">
              <li><span className="eyebrow">Custody</span><h3>We will not <s>hold</s> your funds.</h3><p>The pool holds commitments. Only a proof built on your device can spend one. Ragequit works without us.</p></li>
              <li><span className="eyebrow">Upgrades</span><h3>We will not <s>change</s> the pool.</h3><p>Pool contracts are immutable. The Entrypoint owner acts only through a 48-hour timelock, and every proposal is announced when it is queued.</p></li>
              <li><span className="eyebrow">Supply</span><h3>We will not <s>mint</s> more ZC.</h3><p>Supply is fixed at one billion. There is no mint function, no reserved allocation and no mechanism to create more.</p></li>
              <li><span className="eyebrow">Source</span><h3>We will not <s>build</s> in private.</h3><p>Contracts, circuit configuration, relayer and indexer are published under Apache-2.0 and verified on-chain.</p></li>
              <li><span className="eyebrow">Incidents</span><h3>We will not <s>stay quiet</s> after a breach.</h3><p>Public disclosure within 24 hours, with the transaction hashes and what we are doing about it.</p></li>
              <li><span className="eyebrow">Tracking</span><h3>We will not <s>watch</s> you.</h3><p>No analytics, no trackers, no wallet fingerprinting, on this site or in the app. A privacy protocol should not monitor its own users.</p></li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

export function Lineage() {
  return (
    <>
      <section className="section" id="lineage">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">Lineage</p>
            <h2>Same idea. Better engineering.</h2>
            <p>The design comes from a novel. The requirements come from studying the first attempt.</p>
          </div>
          <div className="sec-body">
            <div className="twin">
              <div>
                <span className="eyebrow">Snowmoon</span>
                <p>Vitalik Buterin published <em>Snowmoon</em> on 27 September 2026 under GPL v3. Its zipcoin is a tap-to-pay system where the shop and the buyer are the only parties who learn the amount, sales tax is paid privately in real time, speech on the public wall costs a burn, and reputation can stand in for collateral.</p>
                <p>Zipcoin treats those scenes as a specification. Where the novel is precise, we build what it describes. Where it is silent, we say so in the roadmap.</p>
              </div>
              <div>
                <span className="eyebrow">The first attempt</span>
                <p>A first zipcoin was built by another team hours after the novel was published and shut down 25 days later, after a breach exposed its operational keys. Its failure was operational, not cryptographic: it depended on a single relayer, a single association set provider, a single indexer, and a token that doubled as the treasury.</p>
                <p>Zipcoin is a separate project, built by a new team on the same audited open-source core. The idea survives. The engineering around it is different, starting with a clean token that has no insider allocation.</p>
              </div>
            </div>
            <ul className="changes">
              <li><span className="mono">Changed</span><span>Owner actions pass through a public 48-hour timelock, so nothing changes without notice.</span></li>
              <li><span className="mono">Changed</span><span>An auditable association policy is in place from the start; open relaying is a roadmap phase with completion criteria.</span></li>
              <li><span className="mono">Changed</span><span>Fixed supply, no team allocation, and a treasury funded only by a published launchpad fee share.</span></li>
              <li><span className="mono">Changed</span><span>Contracts and policies are published and verifiable on-chain.</span></li>
              <li><span className="mono kept">Kept</span><span>The 0xbow Privacy Pools core, its audited verifiers, and the stateless spender pattern that made the Book possible.</span></li>
            </ul>
            <p className="disclaimer">Zipcoin is an independent project run by a new team. It is not affiliated with Vitalik Buterin, the Ethereum Foundation, 0xbow or the earlier zipcoin project. <em>Snowmoon</em> is quoted under its GPL v3 licence.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function Faq() {
  return (
    <>
      <section className="section" id="faq">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">FAQ</p>
            <h2>Frequently asked questions.</h2>
            <p>If a question is missing, it will be added here before it is answered anywhere else.</p>
          </div>
          <div className="sec-body">
            <div className="faq">
              <details>
                <summary>How does this relate to the ZC token launched in September?</summary>
                <div className="a"><p>That project was built by a different team and shut down after 25 days following a security breach. Zipcoin is a separate project with its own team, token and contracts. We share the name and the idea from Snowmoon, build on the same audited open-source core, and engineer around the operational weaknesses that ended the first attempt.</p><p>There is no connection to the earlier contracts and no migration from them. The only ZC contract associated with this project is the one listed on this page.</p></div>
              </details>
              <details>
                <summary>Is the shielded pool live?</summary>
                <div className="a"><p>Yes. The ZC pool is live on Ethereum mainnet. The <a href="https://etherscan.io/address/0x7959a703F49B2d0baa29978c2A126076a0150190#code" target="_blank" rel="noopener">Entrypoint</a> and the <a href="https://etherscan.io/address/0x316E560405D221a01107392A7C1650916dd38F39#code" target="_blank" rel="noopener">pool</a> are verified on Etherscan, and the Pool page of this app is the only place to deposit. Any other pool presented as Zipcoin is not affiliated with this project.</p></div>
              </details>
              <details>
                <summary>Has the code been audited?</summary>
                <div className="a"><p>The Privacy Pools core by 0xbow that we build on has published audits of its circuits and contracts, and we deploy it without modification. Zipcoin’s own spender contracts are small, open source and verified on Etherscan. They hold no funds between transactions, so a defect in one could affect a single withdrawal but never the pool.</p></div>
              </details>
              <details>
                <summary>Is Zipcoin part of Privacy Pools or 0xbow?</summary>
                <div className="a"><p>No. Zipcoin deploys the open-source Privacy Pools contracts under their Apache-2.0 licence as an independent instance, with its own association policy and its own spender contracts. 0xbow does not operate, endorse or have any role in Zipcoin.</p></div>
              </details>
              <details>
                <summary>Is this legal?</summary>
                <div className="a"><p>Zipcoin is non-custodial software. The pool cannot be paused or drained by anyone, deposits are vetted against a published association policy, and ragequit lets anyone leave with their own funds. We operate nothing that takes custody.</p><p>We are not lawyers. An independent review is part of Phase II and its public summary will be linked here.</p></div>
              </details>
              <details>
                <summary>Why a token at all?</summary>
                <div className="a"><p>The pool needs an asset to shield and the Book needs something to burn. ZC is that asset. It is not a governance token, it does not earn fees, and holding it gives you no say over the protocol.</p></div>
              </details>
              <details>
                <summary>Where does the money come from?</summary>
                <div className="a"><p>Only from the 40% creator share of the 1% swap fee on the launch pool, paid in ETH. There is no other source. The treasury address and its spending are published with Phase II.</p></div>
              </details>
              <details>
                <summary>Can I run a relayer or the association set provider?</summary>
                <div className="a"><p>Yes. That is what Phase VI is for. The specifications and reference implementations will be published, and the phase does not close until most withdrawals are relayed by independent operators.</p></div>
              </details>
              <details>
                <summary>How do I know an announcement is really from Zipcoin?</summary>
                <div className="a"><p>Official channels will be listed in the footer of this site and nowhere else. Until they appear there, treat any account, group or token claiming to be Zipcoin as unverified.</p></div>
              </details>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function SiteFooter() {
  return (
    <>
      <footer>
        <div className="wrap">
          <div>
            <a className="brand" href="#top" aria-label="Zipcoin home">
              <img className="brand-mark" src="/assets/zc-logo-128.png" width="34" height="34" alt="" decoding="async" />
              <span className="brand-name">Zipcoin</span>
            </a>
            <p>Private money for a public chain. A shielded pool for ZC on Ethereum, built in the open from the ideas in Snowmoon.</p>
          </div>
          <div>
            <h4>On-chain</h4>
            <ul>
              <li><a href="https://etherscan.io/token/0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA" target="_blank" rel="noopener">ZC on Etherscan</a></li>
              <li><a href="https://etherstreet.fun/t/0xa2f6441c4839a7fd4ef8536b971ced04c48a1cea" target="_blank" rel="noopener">Buy ZC on etherstreet.fun</a></li>
              <li><a href="https://etherscan.io/address/0x7959a703F49B2d0baa29978c2A126076a0150190#code" target="_blank" rel="noopener">Entrypoint</a></li>
              <li><a href="https://etherscan.io/address/0x316E560405D221a01107392A7C1650916dd38F39#code" target="_blank" rel="noopener">ZC pool</a></li>
              <li><a href="https://etherscan.io/address/0xfFa010d4106f20e58058909b612f75668Ae3764e#code" target="_blank" rel="noopener">The Book</a></li>
              <li><a href="https://etherscan.io/address/0x8b72E65392ac44E30E50f7799EC8fe0585F3fD72#code" target="_blank" rel="noopener">The Doorstep</a></li>
              <li className="muted">Treasury: Phase II</li>
            </ul>
          </div>
          <div>
            <h4>Channels</h4>
            <ul>
              <li><a href="https://github.com/zcprivacy/zipcoin" target="_blank" rel="noopener">GitHub: zcprivacy/zipcoin</a></li>
              <li><a href="https://x.com/zcprivacy" target="_blank" rel="noopener">X: @zcprivacy</a></li>
              <li className="muted">Announcements: listed here first</li>
              <li className="muted">Channels not listed here are not affiliated with Zipcoin.</li>
            </ul>
          </div>
          <div className="smallprint">
            <span>Zipcoin · zipcoin.zip · An independent project. Not affiliated with Vitalik Buterin, the Ethereum Foundation, 0xbow or the earlier zipcoin project.</span>
            <span>No analytics. No trackers. Snowmoon © Vitalik Buterin, GPL v3.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export function HowSteps() {
  return (
    <>
      <section className="section" id="how">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">How it works</p>
            <h2>Deposit. Prove. Spend.</h2>
            <p>Three steps. Proof generation happens entirely on your device.</p>
          </div>
          <div className="sec-body">
            <ol className="steps">
              <li>
                <div className="step-n">1</div>
                <h3>Deposit</h3>
                <p>Deposit ZC from any wallet. The pool records a commitment, a hash of your note that reveals nothing about you. The association set provider checks the deposit’s source against its published policy and adds it to the approved set.</p>
              </li>
              <li>
                <div className="step-n">2</div>
                <h3>Prove</h3>
                <p>In your browser, build a zero-knowledge proof that you own an unspent note inside the approved set. The proof is 256 bytes. It names no deposit, no address and no history.</p>
              </li>
              <li>
                <div className="step-n">3</div>
                <h3>Spend</h3>
                <p>A relayer submits the proof. The pool pays the Book, the Doorstep or any address you choose, and records a nullifier so the note cannot be spent twice. Change returns to you as a fresh commitment.</p>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
