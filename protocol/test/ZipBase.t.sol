// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {ERC1967Proxy} from '@oz/proxy/ERC1967/ERC1967Proxy.sol';
import {ERC20} from '@oz/token/ERC20/ERC20.sol';
import {IERC20} from '@oz/token/ERC20/IERC20.sol';
import {Test} from 'forge-std/Test.sol';

import {Entrypoint} from 'contracts/Entrypoint.sol';
import {PrivacyPoolComplex} from 'contracts/implementations/PrivacyPoolComplex.sol';
import {Constants} from 'contracts/lib/Constants.sol';
import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';
import {IVerifier} from 'interfaces/IVerifier.sol';

import {ZipBook} from '../src/ZipBook.sol';
import {ZipDoorstep} from '../src/ZipDoorstep.sol';
import {IZipSpender} from '../src/interfaces/IZipSpender.sol';

/// @dev Groth16 verification is the audited core's job; these tests exercise the spender logic around it.
contract MockVerifier is IVerifier {
  bool public valid = true;

  function setValid(bool _valid) external {
    valid = _valid;
  }

  function verifyProof(
    uint256[2] memory,
    uint256[2][2] memory,
    uint256[2] memory,
    uint256[8] memory
  ) external view returns (bool) {
    return valid;
  }

  function verifyProof(
    uint256[2] memory,
    uint256[2][2] memory,
    uint256[2] memory,
    uint256[4] memory
  ) external view returns (bool) {
    return valid;
  }
}

contract MockZC is ERC20 {
  constructor() ERC20('zipcoin', 'ZC') {}

  function mint(address _to, uint256 _amount) external {
    _mint(_to, _amount);
  }
}

abstract contract ZipBase is Test {
  uint256 internal constant F = Constants.SNARK_SCALAR_FIELD;
  bytes32 internal constant OWNER_ROLE = keccak256('OWNER_ROLE');

  uint256 internal constant MIN_DEPOSIT = 1e18;
  uint256 internal constant VETTING_FEE_BPS = 0;
  uint256 internal constant MAX_RELAY_FEE_BPS = 300;
  uint256 internal constant BOOK_MIN_BURN = 1000e18;
  uint256 internal constant DOOR_MIN_BURN = 100e18;
  uint256 internal constant MAX_TEXT_BYTES = 280;
  uint256 internal constant MAX_SEALED_BYTES = 1024;
  uint256 internal constant DEPOSIT = 50_000e18;

  address internal owner = makeAddr('owner');
  address internal postman = makeAddr('postman');
  address internal alice = makeAddr('alice');
  address internal relayer = makeAddr('relayer');

  MockZC internal zc;
  MockVerifier internal withdrawalVerifier;
  MockVerifier internal ragequitVerifier;
  Entrypoint internal entrypoint;
  PrivacyPoolComplex internal pool;
  ZipBook internal book;
  ZipDoorstep internal doorstep;

  uint256 internal seed;

  function setUp() public virtual {
    zc = new MockZC();
    withdrawalVerifier = new MockVerifier();
    ragequitVerifier = new MockVerifier();

    Entrypoint _impl = new Entrypoint();
    entrypoint = Entrypoint(
      payable(address(new ERC1967Proxy(address(_impl), abi.encodeCall(Entrypoint.initialize, (owner, postman)))))
    );

    pool = new PrivacyPoolComplex(
      address(entrypoint), address(withdrawalVerifier), address(ragequitVerifier), address(zc)
    );

    vm.prank(owner);
    entrypoint.registerPool(IERC20(address(zc)), IPrivacyPool(address(pool)), MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS);

    book = new ZipBook(IPrivacyPool(address(pool)), MAX_RELAY_FEE_BPS, BOOK_MIN_BURN, MAX_TEXT_BYTES);
    doorstep =
      new ZipDoorstep(IPrivacyPool(address(pool)), MAX_RELAY_FEE_BPS, DOOR_MIN_BURN, MAX_TEXT_BYTES, MAX_SEALED_BYTES);

    // The association set provider publishes a root before anyone can withdraw.
    vm.prank(postman);
    entrypoint.updateRoot(_field('asp-root'), 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');

    // Alice deposits so the pool holds funds and the state tree has a root.
    zc.mint(alice, DEPOSIT);
    vm.startPrank(alice);
    zc.approve(address(entrypoint), type(uint256).max);
    entrypoint.deposit(IERC20(address(zc)), DEPOSIT, _field('precommitment'));
    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                              HELPERS
  //////////////////////////////////////////////////////////////*/

  function _field(string memory _label) internal pure returns (uint256) {
    return uint256(keccak256(bytes(_label))) % F;
  }

  function _instruction(address _feeRecipient, uint256 _feeBPS, bytes memory _payload)
    internal
    pure
    returns (IZipSpender.Instruction memory)
  {
    return IZipSpender.Instruction({version: 1, feeRecipient: _feeRecipient, relayFeeBPS: _feeBPS, payload: _payload});
  }

  function _withdrawal(address _spender, IZipSpender.Instruction memory _ix)
    internal
    pure
    returns (IPrivacyPool.Withdrawal memory)
  {
    return IPrivacyPool.Withdrawal({processooor: _spender, data: abi.encode(_ix)});
  }

  /// @dev Builds public signals the pool will accept for `_w`; the mock verifier accepts any proof points.
  function _proof(IPrivacyPool.Withdrawal memory _w, uint256 _value)
    internal
    returns (ProofLib.WithdrawProof memory _p)
  {
    seed++;
    _p.pubSignals[0] = uint256(keccak256(abi.encode('new-commitment', seed))) % F;
    _p.pubSignals[1] = uint256(keccak256(abi.encode('nullifier', seed))) % F;
    _p.pubSignals[2] = _value;
    _p.pubSignals[3] = pool.currentRoot();
    _p.pubSignals[4] = pool.currentTreeDepth();
    _p.pubSignals[5] = entrypoint.latestRoot();
    _p.pubSignals[6] = 1;
    _p.pubSignals[7] = _context(_w);
  }

  function _context(IPrivacyPool.Withdrawal memory _w) internal view returns (uint256) {
    return uint256(keccak256(abi.encode(_w, pool.SCOPE()))) % F;
  }
}
