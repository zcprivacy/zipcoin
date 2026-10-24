// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {TimelockController} from '@oz/governance/TimelockController.sol';
import {ERC1967Proxy} from '@oz/proxy/ERC1967/ERC1967Proxy.sol';
import {IERC20} from '@oz/token/ERC20/IERC20.sol';
import {Script} from 'forge-std/Script.sol';
import {VmSafe} from 'forge-std/Vm.sol';
import {console} from 'forge-std/console.sol';

import {Entrypoint} from 'contracts/Entrypoint.sol';
import {PrivacyPoolComplex} from 'contracts/implementations/PrivacyPoolComplex.sol';
import {CommitmentVerifier} from 'contracts/verifiers/CommitmentVerifier.sol';
import {WithdrawalVerifier} from 'contracts/verifiers/WithdrawalVerifier.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

import {ZipBook} from '../src/ZipBook.sol';
import {ZipDoorstep} from '../src/ZipDoorstep.sol';

/**
 * @title Deploy
 * @notice Deploys a complete Zipcoin instance: verifiers, Entrypoint, ZC pool, timelock and spenders.
 *         Every contract is deployed here; nothing references an external deployment.
 * @dev Environment:
 *      ZC_TOKEN            address of the ZC ERC-20 (required)
 *      OWNER               address allowed to propose timelocked owner actions (required)
 *      POSTMAN             address allowed to post association set roots (required)
 *      MIN_DEPOSIT         minimum deposit in wei of ZC            (default 1 ZC)
 *      VETTING_FEE_BPS     deposit fee kept by the Entrypoint      (default 0)
 *      MAX_RELAY_FEE_BPS   cap on relay fees                       (default 300)
 *      TIMELOCK_DELAY      seconds between proposal and execution  (default 48 hours)
 *      BOOK_MIN_BURN       minimum burn per Book post              (default 1,000 ZC)
 *      DOOR_MIN_BURN       minimum burn per Doorstep delivery      (default 100 ZC)
 *      MAX_TEXT_BYTES      maximum message length                  (default 280)
 *      MAX_SEALED_BYTES    maximum sealed payload length           (default 1024)
 *
 *      Run with a keystore account:
 *      forge script script/Deploy.s.sol --rpc-url mainnet --account <name> --broadcast --verify
 */
contract Deploy is Script {
  bytes32 internal constant _OWNER_ROLE = keccak256('OWNER_ROLE');

  struct Config {
    address zc;
    address owner;
    address postman;
    uint256 minDeposit;
    uint256 vettingFeeBPS;
    uint256 maxRelayFeeBPS;
    uint256 timelockDelay;
    uint256 bookMinBurn;
    uint256 doorMinBurn;
    uint256 maxTextBytes;
    uint256 maxSealedBytes;
  }

  struct Addresses {
    address withdrawalVerifier;
    address ragequitVerifier;
    address entrypointImplementation;
    address entrypoint;
    address pool;
    address timelock;
    address book;
    address doorstep;
  }

  function run() external returns (Addresses memory _a) {
    Config memory _c = _config();

    vm.startBroadcast();
    (, address _deployer,) = vm.readCallers();
    _a = _deployCore(_c, _deployer);
    _deploySpenders(_c, _a);
    vm.stopBroadcast();

    uint256 _scope = IPrivacyPool(_a.pool).SCOPE();
    _log(_a, _scope);
    if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) _save(_a, _scope);
  }

  function _config() internal view returns (Config memory _c) {
    _c.zc = vm.envAddress('ZC_TOKEN');
    _c.owner = vm.envAddress('OWNER');
    _c.postman = vm.envAddress('POSTMAN');
    _c.minDeposit = vm.envOr('MIN_DEPOSIT', uint256(1e18));
    _c.vettingFeeBPS = vm.envOr('VETTING_FEE_BPS', uint256(0));
    _c.maxRelayFeeBPS = vm.envOr('MAX_RELAY_FEE_BPS', uint256(300));
    _c.timelockDelay = vm.envOr('TIMELOCK_DELAY', uint256(48 hours));
    _c.bookMinBurn = vm.envOr('BOOK_MIN_BURN', uint256(1000e18));
    _c.doorMinBurn = vm.envOr('DOOR_MIN_BURN', uint256(100e18));
    _c.maxTextBytes = vm.envOr('MAX_TEXT_BYTES', uint256(280));
    _c.maxSealedBytes = vm.envOr('MAX_SEALED_BYTES', uint256(1024));
  }

  function _deployCore(Config memory _c, address _deployer) internal returns (Addresses memory _a) {
    // 1. Groth16 verifiers from the audited core (same verifying keys as the public trusted setup).
    _a.withdrawalVerifier = address(new WithdrawalVerifier());
    _a.ragequitVerifier = address(new CommitmentVerifier());

    // 2. Entrypoint implementation and proxy. The deployer holds the owner role only while wiring up.
    _a.entrypointImplementation = address(new Entrypoint());
    bytes memory _init = abi.encodeCall(Entrypoint.initialize, (_deployer, _c.postman));
    _a.entrypoint = address(new ERC1967Proxy(_a.entrypointImplementation, _init));
    Entrypoint _entrypoint = Entrypoint(payable(_a.entrypoint));

    // 3. The ZC pool, immutable, bound to this deployment's Entrypoint and verifiers.
    _a.pool = address(new PrivacyPoolComplex(_a.entrypoint, _a.withdrawalVerifier, _a.ragequitVerifier, _c.zc));
    _entrypoint.registerPool(
      IERC20(_c.zc), IPrivacyPool(_a.pool), _c.minDeposit, _c.vettingFeeBPS, _c.maxRelayFeeBPS
    );

    // 4. Timelock: OWNER proposes, anyone executes after the delay, no separate admin.
    address[] memory _proposers = new address[](1);
    _proposers[0] = _c.owner;
    address[] memory _executors = new address[](1);
    _executors[0] = address(0);
    _a.timelock = address(new TimelockController(_c.timelockDelay, _proposers, _executors, address(0)));

    // 5. Hand the Entrypoint owner role to the timelock and drop it from the deployer.
    _entrypoint.grantRole(_OWNER_ROLE, _a.timelock);
    _entrypoint.renounceRole(_OWNER_ROLE, _deployer);
  }

  function _deploySpenders(Config memory _c, Addresses memory _a) internal {
    // 6. Spenders: stateless and ownerless.
    _a.book = address(new ZipBook(IPrivacyPool(_a.pool), _c.maxRelayFeeBPS, _c.bookMinBurn, _c.maxTextBytes));
    _a.doorstep = address(
      new ZipDoorstep(IPrivacyPool(_a.pool), _c.maxRelayFeeBPS, _c.doorMinBurn, _c.maxTextBytes, _c.maxSealedBytes)
    );
  }

  function _log(Addresses memory _a, uint256 _scope) internal pure {
    console.log('WithdrawalVerifier       %s', _a.withdrawalVerifier);
    console.log('CommitmentVerifier       %s', _a.ragequitVerifier);
    console.log('Entrypoint (impl)        %s', _a.entrypointImplementation);
    console.log('Entrypoint (proxy)       %s', _a.entrypoint);
    console.log('ZC PrivacyPoolComplex    %s', _a.pool);
    console.log('  scope                  %s', _scope);
    console.log('TimelockController       %s', _a.timelock);
    console.log('ZipBook                  %s', _a.book);
    console.log('ZipDoorstep              %s', _a.doorstep);
  }

  function _save(Addresses memory _a, uint256 _scope) internal {
    string memory _json = 'deployment';
    vm.serializeUint(_json, 'chainId', block.chainid);
    vm.serializeAddress(_json, 'withdrawalVerifier', _a.withdrawalVerifier);
    vm.serializeAddress(_json, 'ragequitVerifier', _a.ragequitVerifier);
    vm.serializeAddress(_json, 'entrypointImplementation', _a.entrypointImplementation);
    vm.serializeAddress(_json, 'entrypoint', _a.entrypoint);
    vm.serializeAddress(_json, 'pool', _a.pool);
    vm.serializeUint(_json, 'scope', _scope);
    vm.serializeAddress(_json, 'timelock', _a.timelock);
    vm.serializeAddress(_json, 'book', _a.book);
    string memory _out = vm.serializeAddress(_json, 'doorstep', _a.doorstep);
    string memory _path = string.concat('deployments/', vm.toString(block.chainid), '.json');
    vm.writeJson(_out, _path);
    console.log('Saved %s', _path);
  }
}
