# Trust model

Who holds what, what each key can do, and what happens when one is lost or stolen.

## Keys and roles

| Key or role | Where it lives | Can | Cannot |
|---|---|---|---|
| **Zip key** (user) | Derived in the user's browser from a wallet signature; never stored | Spend the notes it controls; ragequit through the depositing wallet | Affect anyone else's notes |
| **Relayer key** | On the relayer's server | Submit users' proofs, pay gas, receive the fee the user fixed in the proof | Change a recipient, amount, fee or payload; spend a note; refuse a ragequit |
| **Poster key** (`ASP_POSTMAN`) | On the poster's server | Post association roots | Move funds; block a ragequit; see who spends; change parameters |
| **Owner key** | Offline; proposer of the timelock | Schedule owner actions that execute after 48 hours | Act immediately; move pool funds; block withdrawals or ragequits |
| **Timelock** (`OWNER_ROLE`) | Contract, 48 h minimum delay, self-administered | Register pools, set minimum deposit, vetting fee and maximum relay fee, replace the poster, upgrade the Entrypoint, stop new deposits | Move pool funds; invalidate proofs; alter spenders |
| **Deployer** | Offline, no remaining role | Nothing | Everything; it renounced its role in the deployment transaction |

The pool, the verifiers and the spenders have no owner and no upgrade path.

## What no key can do

- Move ZC inside the pool. The pool pays only against a valid proof made with the note's secrets.
- Prevent a depositor from leaving. Ragequit needs the depositor's wallet and nothing else.
- Link a spend to a deposit. The proof reveals a nullifier and an amount, not an origin.
- Take a cut of private flows. The vetting fee is 0 and the only fee is the one the user fixes for the relayer.

## Failure scenarios

| Event | Worst case | Recovery |
|---|---|---|
| Relayer key stolen | The relayer's gas balance and accrued fees are lost | Rotate the key; users' notes are unaffected; any other relayer, or the user's own transaction, can submit proofs |
| Relayer offline | Private withdrawals wait | Any other relayer; ragequit needs none |
| Poster key stolen | A bad root is posted: honest deposits cannot be spent privately until it is replaced, or a deposit the policy would reject is approved | The timelock replaces the poster after 48 hours; ragequit works throughout; the policy and sets are public so the bad root is visible |
| Poster offline | New deposits stay pending | Replace the poster; existing approvals and ragequit are unaffected |
| Owner key stolen | After 48 hours of public notice: new deposits stopped, parameters changed within their caps, the Entrypoint upgraded | Users withdraw or ragequit during the delay; the Entrypoint holds no funds, and the pool's proof checks are not upgradeable |
| Operator servers compromised | The two server keys above, together | The two rows above, together; no path to user funds |
| User's zip phrase leaked | The holder can spend that user's notes | Spend or ragequit the notes first; the phrase cannot be rotated without a new wallet signature message |
| User's wallet compromised | The attacker can re-derive the zip phrase by signing | As above |

## Why the delay is the control

The timelock does not make the owner trustworthy. It makes every owner action visible for two days
before it can take effect, which is long enough for any user to leave with their funds. Zipcoin's
safety does not rest on the owner behaving; it rests on the pool's proofs and on ragequit, neither of
which any key can switch off.
