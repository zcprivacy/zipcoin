// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {TimelockController} from '@oz/governance/TimelockController.sol';
import {ERC20} from '@oz/token/ERC20/ERC20.sol';
import {IERC20} from '@oz/token/ERC20/IERC20.sol';
import {Test} from 'forge-std/Test.sol';

import {Entrypoint} from 'contracts/Entrypoint.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

import {Deploy} from '../script/Deploy.s.sol';
import {ZipBook} from '../src/ZipBook.sol';
import {ZipDoorstep} from '../src/ZipDoorstep.sol';

contract DeployToken is ERC20 {
  constructor() ERC20('zipcoin', 'ZC') {
    _mint(msg.sender, 1_000_000_000e18);
  }
}

contract DeployTest is Test {
  bytes32 internal constant OWNER_ROLE = keccak256('OWNER_ROLE');
  bytes32 internal constant ASP_POSTMAN = keccak256('ASP_POSTMAN');

  address internal ownerEOA = makeAddr('ownerEOA');
  address internal postman = makeAddr('postman');

  function test_DeployWiresEverythingAndHandsOwnershipToTimelock() public {
    DeployToken _zc = new DeployToken();

    vm.setEnv('ZC_TOKEN', vm.toString(address(_zc)));
    vm.setEnv('OWNER', vm.toString(ownerEOA));
    vm.setEnv('POSTMAN', vm.toString(postman));

    Deploy _deploy = new Deploy();
    Deploy.Addresses memory _a = _deploy.run();

    Entrypoint _entrypoint = Entrypoint(payable(_a.entrypoint));
    IPrivacyPool _pool = IPrivacyPool(_a.pool);
    TimelockController _timelock = TimelockController(payable(_a.timelock));

    // Pool is registered with the defaults and bound to the contracts deployed by the script.
    (IPrivacyPool _registered, uint256 _minDeposit, uint256 _vettingFee, uint256 _maxRelay) =
      _entrypoint.assetConfig(IERC20(address(_zc)));
    assertEq(address(_registered), _a.pool, 'pool registered');
    assertEq(_minDeposit, 1e18, 'default minimum deposit');
    assertEq(_vettingFee, 0, 'no protocol fee on deposits');
    assertEq(_maxRelay, 300, 'default relay fee cap');
    assertEq(address(_pool.ENTRYPOINT()), _a.entrypoint, 'pool bound to the deployed entrypoint');
    assertEq(address(_pool.WITHDRAWAL_VERIFIER()), _a.withdrawalVerifier, 'deployed withdrawal verifier');
    assertEq(address(_pool.RAGEQUIT_VERIFIER()), _a.ragequitVerifier, 'deployed ragequit verifier');
    assertEq(_pool.ASSET(), address(_zc), 'pool asset is ZC');
    assertFalse(_pool.dead(), 'pool accepts deposits');

    // Owner role lives only with the timelock; the postman is the configured address.
    assertTrue(_entrypoint.hasRole(OWNER_ROLE, _a.timelock), 'timelock owns the entrypoint');
    assertFalse(_entrypoint.hasRole(OWNER_ROLE, address(this)), 'test contract holds no owner role');
    assertFalse(_entrypoint.hasRole(OWNER_ROLE, ownerEOA), 'EOA holds no direct owner role');
    assertTrue(_entrypoint.hasRole(ASP_POSTMAN, postman), 'postman set');

    // Timelock: 48h, EOA proposes, anyone executes, self-administered.
    assertEq(_timelock.getMinDelay(), 48 hours, 'delay');
    assertTrue(_timelock.hasRole(_timelock.PROPOSER_ROLE(), ownerEOA), 'EOA proposes');
    assertTrue(_timelock.hasRole(_timelock.EXECUTOR_ROLE(), address(0)), 'open execution');
    assertFalse(_timelock.hasRole(_timelock.DEFAULT_ADMIN_ROLE(), ownerEOA), 'no separate admin');

    // Spenders point at the pool with the default parameters.
    ZipBook _book = ZipBook(_a.book);
    ZipDoorstep _door = ZipDoorstep(_a.doorstep);
    assertEq(address(_book.POOL()), _a.pool);
    assertEq(_book.MIN_BURN(), 1000e18);
    assertEq(_book.MAX_TEXT_BYTES(), 280);
    assertEq(address(_door.POOL()), _a.pool);
    assertEq(_door.MIN_BURN(), 100e18);
    assertEq(_door.MAX_SEALED_BYTES(), 1024);
  }
}
