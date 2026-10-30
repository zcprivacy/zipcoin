import { Link } from 'react-router-dom';

import { CopyButton } from '../landing/CopyButton';
import { Demo } from '../landing/Demo';

const INDEX = [
  ['overview', '01 Overview'],
  ['thesis', '02 Why'],
  ['how', '03 How it works'],
  ['architecture', '04 Architecture'],
  ['hook', '05 ZipHook'],
  ['policy', '06 Approval policy'],
  ['trust', '07 Trust model'],
  ['roadmap', '08 Roadmap'],
  ['token', '09 Token and treasury'],
  ['commitments', '10 Commitments'],
  ['lineage', '11 Lineage'],
  ['faq', '12 FAQ'],
] as const;

type PhaseStatus = 'live' | 'building' | 'next' | 'later' | 'research';
const PHASES: { n: string; name: string; status: PhaseStatus; lead: string; items: [string, boolean][]; exit: string }[] = [
  { n: 'I', name: 'Genesis', status: 'live', lead: 'Token launched, domain secured, and the reference design documented.', items: [['ZC launched on Ethereum mainnet through a public launchpad', true], ['Fixed supply, no team allocation, no presale', true], ['zipcoin.zip registered and this site published', true], ['Protocol specification and trust model published in the repository', true]], exit: 'Token verified on-chain. Site live. Specification and trust model in the repository.' },
  { n: 'II', name: 'Foundations', status: 'building', lead: 'The governance and disclosure groundwork around the protocol.', items: [['48-hour timelock deployed as the Entrypoint owner', true], ['Public repository under Apache-2.0 with the protocol specification', true], ['Treasury address and spending policy published', false], ['Independent legal review of the non-custodial design', false], ['Incident disclosure policy with a 24-hour clock', true]], exit: 'Timelock verified as the Entrypoint owner. Repository public. Treasury address published. Legal summary linked from this page.' },
  { n: 'III', name: 'The Pool', status: 'live', lead: 'A ZC shielded pool deployed from the audited Privacy Pools core, with its association policy published before the first deposit.', items: [['Entrypoint and ZC pool deployed from the audited core', true], ['Reuse of the core’s audited Groth16 verifiers, no new ceremony', true], ['Association set policy published, every set addressable by content hash', true], ['Full association sets mirrored to IPFS', false], ['Ragequit tested and available from the Pool page', true], ['Browser prover', true], ['Command-line client', false], ['Public indexer that rebuilds from chain', true]], exit: 'Pool verified on-chain and matched to the published source. First association root posted. A deposit, a private withdrawal and a ragequit completed by an independent party.' },
  { n: 'IV', name: 'The Book and the Doorstep', status: 'live', lead: 'Unattributable public messaging, paid for by burning ZC.', items: [['The Book: burn-to-post from inside the pool, fixed minimum burn', true], ['The Doorstep: a line left at one address, with its own minimum', true], ['Sealed Doorstep messages, readable only by the addressee', false], ['Envelopes for longer messages', false], ['Spender source published and verified on Etherscan', true]], exit: 'Contracts verified on-chain and matched to the published source. First hundred entries posted by external users.' },
  { n: 'V', name: 'ZipHook', status: 'building', lead: 'Markets with a door into the shield: an ETH pool as the hub, a Uniswap v4 hook on every market, private swaps for any token.', items: [['The ETH pool, free, registered on the Entrypoint', false], ['The hook: 1% per swap, 0.6% to providers through the pool fee, 0.4% in ETH to the treasury', false], ['Buy into the shield: purchases deposited straight into the token’s private pool', false], ['The swap contract: ETH note to token note and back, with a hashed recovery per note', false], ['The factory: anyone opens a market for any standard ERC-20, no listing fee', false], ['ZC/ETH as the first market, seeded and rehearsed on a mainnet fork', false]], exit: 'Hook, factory and swap contract verified against their published source. A private swap completed by an independent party on a market they opened.' },
  { n: 'VI', name: 'Open relaying', status: 'later', lead: 'Removing the core team from every operational role that touches user funds.', items: [['Relayer specification and reference implementation', false], ['At least three independent relayers live', false], ['ERC-4337 paymaster path for withdrawals with no relayer at all', false], ['Association set provider role documented so others can run one', false], ['Second and third indexers run by other parties', false]], exit: 'A full month in which more than half of withdrawals were relayed by parties other than the team.' },
  { n: 'VII', name: 'The Snowmoon layer', status: 'research', lead: 'Mechanisms described in Snowmoon that have not yet been implemented on Ethereum. Each requires new circuits and a new trusted setup, so this phase is research until a specification is published.', items: [['Private sales tax paid in real time inside the same proof', false], ['Hidden payment amounts, not just hidden payers', false], ['Reputation-collateralised loans where only the nullifier and the amount are public', false], ['Nullifier-gated polls: one voice per note, no identities', false]], exit: 'Each mechanism specified, its trusted setup completed, and a mainnet deployment demonstrated against the chapter that describes it.' },
  { n: 'VIII', name: 'Privacy pad and reach', status: 'later', lead: 'Tokens born with a hooked market and a private pool, lower cost, additional networks, and integration with existing wallets.', items: [['Privacy pad: a token launched with its market and its private pool in one transaction, no creator allocation, creator paid from fees', false], ['Deployment on an Ethereum L2 with the same policy', false], ['Integration with privacy-first wallets', false], ['Agent and MCP toolkit so software can pay privately too', false], ['One-command self-hosting of the entire stack', false]], exit: 'A user completes a private payment from a third-party wallet with no Zipcoin website involved.' },
];

const STATUS_CLASS: Record<PhaseStatus, string> = { live: 'chip-live', building: 'chip-building', next: 'chip-building', later: 'chip-later', research: 'chip-later' };

export default function Docs() {
  return (
    <main>
      <div className="docs">
        <nav className="docs-index" aria-label="Contents">
          <span className="h">Contents</span>
          {INDEX.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
          <a href="https://github.com/zcprivacy/zipcoin/tree/main/docs" target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>Full specification, on GitHub</a>
        </nav>

        <div className="docs-body">
          <section className="doc" id="overview">
            <span className="eyebrow">01 · Overview</span>
            <h1 className="h1" style={{ fontSize: 'clamp(36px,4.4vw,60px)' }}>Everything about Zipcoin, in one place.</h1>
            <p>Zipcoin is a shielded pool for ETH and any token on Ethereum mainnet, built from the audited Privacy Pools v1 core and the ideas in Vitalik Buterin's novel Snowmoon. It is an independent project. These pages explain the design, the policy that screens deposits, what every key can and cannot do, and where the roadmap stands. The authoritative versions, with every public signal and parameter, live in the <a href="https://github.com/zcprivacy/zipcoin/tree/main/docs" target="_blank" rel="noopener">repository</a>.</p>
          </section>

          <section className="doc" id="thesis">
            <span className="eyebrow">02 · Why</span>
            <h2 className="h2">Privacy is choosing who knows.</h2>
            <p>Every Ethereum payment today is a public record. Your salary, your rent, your donations and your mistakes sit in one ledger that anyone can read, forever, and cross-reference with everything else you have ever done. That is not transparency. It is a permanent surveillance record.</p>
            <p>Zipcoin takes the other position. A payment should be visible to the people in it, provable to anyone who legitimately needs proof, and invisible to everyone else. The protocol lets you show that your funds came from an approved set of deposits without showing which deposit was yours.</p>
            <div className="receipt boxed" style={{ maxWidth: 620 }}>
              <div><span>Snowmoon, chapter 6</span><span>GPL v3</span></div>
              <div style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 17, fontWeight: 300, borderBottom: 0 }}>“Only Gladias and the restaurant knew that a 10.5 zipcoin order had been made.”</div>
            </div>
            <ul className="dots">
              <li><b>Non-custodial.</b> The pool holds a commitment, not an account. Only a proof built on your device can move what you deposited.</li>
              <li><b>Vetted at deposit.</b> Deposits are screened against a published association policy before they enter the approved set. No monitoring of users is required afterwards.</li>
              <li><b>Unconditional exit.</b> Ragequit returns a deposit to the address that made it, without approval from any operator, including us.</li>
            </ul>
          </section>

          <section className="doc" id="how">
            <span className="eyebrow">03 · How it works</span>
            <h2 className="h2">Deposit. Prove. Spend.</h2>
            <ol className="nums">
              <li><b>Deposit.</b> Deposit from any wallet. The pool records a commitment, a hash of your note that reveals nothing about you. The association set provider checks the deposit's source against its published policy and adds it to the approved set.</li>
              <li><b>Prove.</b> In your browser, build a zero-knowledge proof that you own an unspent note inside the approved set. It names no deposit, no address and no history, and it binds exactly what you want done.</li>
              <li><b>Spend.</b> A relayer submits the proof. The pool pays the Book, the Doorstep, a ZipHook market or any address you choose, and records a nullifier so the note cannot be spent twice. Change returns to you as a fresh commitment.</li>
            </ol>
            <h3 style={{ fontSize: 22 }}>The receipt, two ways</h3>
            <Demo />
          </section>

          <section className="doc" id="architecture">
            <span className="eyebrow">04 · Architecture</span>
            <h2 className="h2">A small pool, stateless spenders, replaceable operators.</h2>
            <p>The trusted surface is the audited core. The pool, its Merkle tree and its verifiers are the open-source Privacy Pools protocol developed by 0xbow and released under Apache-2.0, deployed without modification. Everything Zipcoin adds on chain is stateless and ownerless. Off-chain services are designed to be replaceable.</p>
            <div className="ledger" style={{ '--cols': '200px 1fr' } as React.CSSProperties}>
              <div className="ledger-row" style={{ padding: '12px 0' }}><span className="cost"><b>Entrypoint</b></span><span className="cost">ERC-1967 proxy. Registers pools, accepts association roots, routes relayed withdrawals. Its owner is a 48-hour timelock that can close a pool to new deposits but cannot block withdrawals or ragequit, and cannot move pool funds.</span></div>
              <div className="ledger-row" style={{ padding: '12px 0' }}><span className="cost"><b>ZC pool</b></span><span className="cost">Immutable. A Lean incremental Merkle tree of commitments, a nullifier set and two Groth16 verifiers from the audited core. Nobody can upgrade it.</span></div>
              <div className="ledger-row" style={{ padding: '12px 0' }}><span className="cost"><b>Spenders</b></span><span className="cost">The Book and the Doorstep today, the ZipHook swap contract next. Each decodes a payload bound to your proof and does one thing. None has an owner or a balance that lingers.</span></div>
              <div className="ledger-row" style={{ padding: '12px 0' }}><span className="cost"><b>Association set provider</b></span><span className="cost">Decides which deposits join the approved set and publishes the whole set, content-addressed, so the policy can be audited rather than trusted.</span></div>
              <div className="ledger-row" style={{ padding: '12px 0' }}><span className="cost"><b>Relayers</b></span><span className="cost">Submit proofs so your wallet never signs the withdrawal. Specified so anyone can run one, paid from the withdrawal, never from a token.</span></div>
              <div className="ledger-row" style={{ padding: '12px 0', borderBottom: 0 }}><span className="cost"><b>Prover and indexer</b></span><span className="cost">Your device. Notes are derived from a phrase and recovered from public events. No account is required.</span></div>
            </div>
          </section>

          <section className="doc" id="hook">
            <span className="eyebrow blue">05 · ZipHook</span>
            <h2 className="h2">A market with a door into the shield.</h2>
            <p>A ZipHook market is a Uniswap v4 pool with one hook attached. The hook sets the pool's fee to 0.6% for liquidity providers, paid by Uniswap's own accounting; takes 0.4% of every swap in ETH for the treasury; and, when a buyer attaches a precommitment, deposits the purchase straight into the token's private pool as a note. From an ETH note, a swap contract spends into any market and the output lands as a token note; selling runs the same way back. No wallet appears at any step.</p>
            <p>The ETH pool is the hub. Privacy on the input side is the crowd of everyone who holds an ETH note, shared across every market. Anyone can open a market for any standard ERC-20 with no listing fee; the factory creates the hooked pool and the token's private pool together. Deposits, holding and withdrawals in every private pool stay free; the market is what pays.</p>
            <p><Link to="/hook">Markets</Link> · <Link to="/hook/new">Open a market</Link></p>
          </section>

          <section className="doc" id="policy">
            <span className="eyebrow">06 · Approval policy, version 1</span>
            <h2 className="h2">Who gets into the approved set.</h2>
            <ol className="nums">
              <li>If the depositing address is on the blocklist, reject.</li>
              <li>If the Chainalysis sanctions oracle on Ethereum mainnet returns true for the depositing address, reject.</li>
              <li>If the deposit is younger than the delay, 30 seconds on mainnet, wait.</li>
              <li>Otherwise, approve.</li>
            </ol>
            <p>The blocklist is empty at launch. The approved set is a Merkle tree of deposit labels; each new root is posted on chain with a content hash of the full set, which the node serves. Anyone can fetch the set, rebuild the tree and compare its root to the chain, and anyone can rerun the rule over the public deposits. A rejected deposit is never stuck: ragequit returns it. The poster key can post roots and nothing else.</p>
          </section>

          <section className="doc" id="trust">
            <span className="eyebrow">07 · Trust model</span>
            <h2 className="h2">What no key can do.</h2>
            <ul className="dots">
              <li>Move ZC or ETH inside a pool. The pool pays only against a valid proof made with the note's secrets.</li>
              <li>Prevent a depositor from leaving. Ragequit needs the depositor's wallet and nothing else.</li>
              <li>Link a spend to a deposit. The proof reveals a nullifier and an amount, not an origin.</li>
              <li>Take a cut of private flows. The vetting fee is 0 and the only fee is the one the user fixes for the relayer.</li>
              <li>Change anything without notice. The one administrative role is a timelock with a 48-hour delay.</li>
            </ul>
            <p>The relayer key pays gas and receives fees. The poster key publishes approved sets. The owner key proposes to the timelock. The deployer renounced its role in the deployment transaction. Every key, what it holds and what happens when it is lost is in the <a href="https://github.com/zcprivacy/zipcoin/blob/main/docs/trust-model.md" target="_blank" rel="noopener">trust model</a>.</p>
          </section>

          <section className="doc" id="roadmap" style={{ maxWidth: 'none' }}>
            <span className="eyebrow">08 · Roadmap</span>
            <h2 className="h2">Milestones, not deadlines.</h2>
            <p>Each phase is released when its completion criteria are met and independently verifiable. No phase carries a target date.</p>
            <div className="ledger" style={{ '--cols': '90px 1fr 120px', maxWidth: 900 } as React.CSSProperties}>
              <div className="ledger-head"><span>Phase</span><span>Deliverables</span><span className="right">Status</span></div>
              {PHASES.map((p) => (
                <div className="ledger-row" key={p.n} style={{ alignItems: 'start' }}>
                  <span className="cost"><b>{p.n}</b></span>
                  <div className="stack" style={{ gap: 8 }}>
                    <b style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{p.name}</b>
                    <span className="light" style={{ fontSize: 15 }}>{p.lead}</span>
                    <ul className="mono" style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {p.items.map(([text, done]) => (
                        <li key={text} style={{ color: done ? 'var(--ink)' : 'var(--mute)' }}>{done ? '✓' : '·'} {text}</li>
                      ))}
                    </ul>
                    <span className="fine"><b>Completion criteria</b> · {p.exit}</span>
                  </div>
                  <span className={`status ${STATUS_CLASS[p.status]}`}>{p.status}</span>
                </div>
              ))}
            </div>
            <p className="fine">Always: any incident is disclosed within 24 hours with transaction hashes; every contract is verified and matched to a tagged commit before it is announced; the site and the app carry no analytics, trackers or third-party scripts; progress is reported against this list, in public, and nowhere else first.</p>
          </section>

          <section className="doc" id="token">
            <span className="eyebrow">09 · Token and treasury</span>
            <h2 className="h2">One asset. No insider allocation.</h2>
            <div className="receipt boxed" style={{ maxWidth: 720 }}>
              <div><span>contract</span><span className="row" style={{ gap: 8 }}><code style={{ fontSize: 12 }}>0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA</code><CopyButton text="0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA" /></span></div>
              <div><span>trade</span><span><a href="https://etherstreet.fun/t/0xa2f6441c4839a7fd4ef8536b971ced04c48a1cea" target="_blank" rel="noopener">etherstreet.fun</a> · ZC / ETH launch pool</span></div>
              <div><span>network</span><span>Ethereum mainnet</span></div>
              <div><span>supply</span><span>1,000,000,000 ZC, fixed. No mint function.</span></div>
              <div><span>team allocation</span><span>None. No presale, no vesting, no reserved supply.</span></div>
              <div><span>rights</span><span>None. No governance power, no share of fees.</span></div>
            </div>
            <p>The treasury's income is the creator share of the launch pool's 1% swap fee, paid in ETH, and, once ZipHook markets are live, the hook's 0.4% on every swap. It pays for the relayer, the indexer and the association set service while the network bootstraps, for development of the roadmap phases, and for running the site. Nothing else without a published roadmap change. The protocol takes nothing from deposits or withdrawals.</p>
          </section>

          <section className="doc" id="commitments">
            <span className="eyebrow">10 · Commitments</span>
            <h2 className="h2">What we will not do.</h2>
            <div className="grid2">
              <div><b>We will not hold your funds.</b><span>The pool holds commitments. Only a proof built on your device can spend one. Ragequit works without us.</span></div>
              <div><b>We will not change the pool.</b><span>Pool contracts are immutable. The Entrypoint owner acts only through a 48-hour timelock, and every proposal is announced when it is queued.</span></div>
              <div><b>We will not mint more ZC.</b><span>Supply is fixed at one billion. There is no mint function, no reserved allocation and no mechanism to create more.</span></div>
              <div><b>We will not build in private.</b><span>Contracts, policy, relayer and indexer are published under Apache-2.0 and verified on chain.</span></div>
              <div><b>We will not stay quiet after a breach.</b><span>Public disclosure within 24 hours, with the transaction hashes and what we are doing about it.</span></div>
              <div><b>We will not watch you.</b><span>No analytics, no trackers, no wallet fingerprinting, on this site or in the app. The fonts are served from this site.</span></div>
            </div>
          </section>

          <section className="doc" id="lineage">
            <span className="eyebrow">11 · Lineage</span>
            <h2 className="h2">Same idea. Better engineering.</h2>
            <p>Vitalik Buterin published <em>Snowmoon</em> in September 2026 under GPL v3. Its zipcoin is a tap-to-pay system where the shop and the buyer are the only parties who learn the amount, sales tax is paid privately in real time, speech on the public wall costs a burn, and reputation can stand in for collateral. Zipcoin treats those scenes as a specification. Where the novel is precise, we build what it describes. Where it is silent, we say so.</p>
            <p>A first zipcoin was built by another team hours after the novel was published and shut down 25 days later, after a breach exposed its operational keys. Its failure was operational, not cryptographic: it depended on a single relayer, a single association set provider, a single indexer, and a token that doubled as the treasury. Zipcoin is a separate project, built by a new team on the same audited open-source core, with a timelock in front of every owner action, an auditable policy from the start, a fixed supply with no team allocation, and everything published and verifiable on chain.</p>
            <p className="fine">Zipcoin is not affiliated with Vitalik Buterin, the Ethereum Foundation, 0xbow or the earlier zipcoin project. <em>Snowmoon</em> is quoted under its GPL v3 licence.</p>
          </section>

          <section className="doc" id="faq">
            <span className="eyebrow">12 · FAQ</span>
            <h2 className="h2">Frequently asked questions.</h2>
            <details><summary>Is this a mixer?</summary><p>No. Deposits are public and screened against a published policy; only approved deposits join the association set. A mixer hid everyone. This hides the honest and leaves the rest outside.</p></details>
            <details><summary>How does this relate to the ZC token launched in September?</summary><p>That project was built by a different team and shut down after 25 days following a security breach. Zipcoin is a separate project with its own team, token and contracts. There is no connection to the earlier contracts and no migration from them. The only ZC contract associated with this project is the one listed on this page.</p></details>
            <details><summary>Is the shielded pool live?</summary><p>Yes. The ZC pool is live on Ethereum mainnet; the Entrypoint and the pool are verified on Etherscan, and the Pool page of this app is the only place to deposit. Any other pool presented as Zipcoin is not affiliated with this project.</p></details>
            <details><summary>Has the code been audited?</summary><p>The Privacy Pools core by 0xbow that we build on has published audits of its circuits and contracts, and we deploy it without modification. Zipcoin's own spender contracts are small, open source and verified on Etherscan. They hold no funds between transactions, so a defect in one could affect a single withdrawal but never the pool.</p></details>
            <details><summary>Is Zipcoin part of Privacy Pools or 0xbow?</summary><p>No. Zipcoin deploys the open-source Privacy Pools contracts under their Apache-2.0 licence as an independent instance, with its own association policy and its own spender contracts. 0xbow does not operate, endorse or have any role in Zipcoin.</p></details>
            <details><summary>Is this legal?</summary><p>Zipcoin is non-custodial software. The pool cannot be paused or drained by anyone, deposits are vetted against a published association policy, and ragequit lets anyone leave with their own funds. We operate nothing that takes custody. We are not lawyers; an independent review is part of Phase II and its public summary will be linked here.</p></details>
            <details><summary>Why a token at all?</summary><p>The pool needs an asset to shield and the Book needs something to burn. ZC is that asset. It is not a governance token, it does not earn fees, and holding it gives you no say over the protocol.</p></details>
            <details><summary>Where does the money come from?</summary><p>The creator share of the launch pool's swap fee, paid in ETH, and the hook's 0.4% on ZipHook markets once they are live. The protocol takes nothing from deposits or withdrawals.</p></details>
            <details><summary>Can I run a relayer or the association set provider?</summary><p>Yes. The node and the relayer are open source at github.com/zcprivacy/zipcoin and run against the same mainnet contracts. Phase VI opens the poster role as well, and does not close until most withdrawals are relayed by independent operators.</p></details>
            <details><summary>How do I know an announcement is really from Zipcoin?</summary><p>Official channels are listed in the footer of this site and nowhere else. Treat any account, group or token not listed there as unverified.</p></details>
          </section>
        </div>
      </div>
    </main>
  );
}
