// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {IERC20} from '@oz/token/ERC20/IERC20.sol';
import {SafeERC20} from '@oz/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@oz/utils/ReentrancyGuard.sol';

import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

import {IZipSpender} from './interfaces/IZipSpender.sol';

/**
 * @title ZipSpender
 * @notice Base for Zipcoin spenders: stateless, ownerless processooors for a Privacy Pools v1 pool.
 * @dev Handles the parts every spender shares and leaves the rest to `_process`:
 *      - checks the withdrawal names this contract and carries a supported instruction;
 *      - pulls the funds out of the pool through the pool's own proof verification;
 *      - pays the relay fee encoded by the user, never a fee chosen by the submitter;
 *      - hands the remainder and the payload to the concrete spender.
 *      There is no owner, no pause and no upgrade path. Parameters are immutable.
 */
abstract contract ZipSpender is IZipSpender, ReentrancyGuard {
  using SafeERC20 for IERC20;
  using ProofLib for ProofLib.WithdrawProof;

  /// @inheritdoc IZipSpender
  uint8 public constant INSTRUCTION_VERSION = 1;

  /// @inheritdoc IZipSpender
  IPrivacyPool public immutable POOL;
  /// @inheritdoc IZipSpender
  IERC20 public immutable ASSET;
  /// @inheritdoc IZipSpender
  uint256 public immutable MAX_RELAY_FEE_BPS;

  /**
   * @param _pool The Privacy Pool to withdraw from
   * @param _maxRelayFeeBPS Maximum relay fee in basis points
   */
  constructor(IPrivacyPool _pool, uint256 _maxRelayFeeBPS) {
    if (address(_pool) == address(0)) revert ZeroAddress();
    if (_maxRelayFeeBPS >= 10_000) revert InvalidFeeBPS();

    POOL = _pool;
    ASSET = IERC20(_pool.ASSET());
    MAX_RELAY_FEE_BPS = _maxRelayFeeBPS;
  }

  /// @inheritdoc IZipSpender
  function execute(
    IPrivacyPool.Withdrawal calldata _withdrawal,
    ProofLib.WithdrawProof calldata _proof
  ) external nonReentrant {
    if (_withdrawal.processooor != address(this)) revert NotProcessooor();

    Instruction memory _instruction = abi.decode(_withdrawal.data, (Instruction));
    if (_instruction.version != INSTRUCTION_VERSION) revert UnsupportedInstructionVersion(_instruction.version);
    if (_instruction.relayFeeBPS > MAX_RELAY_FEE_BPS) {
      revert RelayFeeTooHigh(_instruction.relayFeeBPS, MAX_RELAY_FEE_BPS);
    }

    ProofLib.WithdrawProof memory _p = _proof;
    uint256 _value = _p.withdrawnValue();
    if (_value == 0) revert ZeroWithdrawal();

    // The pool checks msg.sender == processooor, the context binding, the roots and the proof itself.
    uint256 _balanceBefore = ASSET.balanceOf(address(this));
    POOL.withdraw(_withdrawal, _p);
    uint256 _received = ASSET.balanceOf(address(this)) - _balanceBefore;
    if (_received != _value) revert UnexpectedBalance(_value, _received);

    // Relay fee goes to the recipient the user encoded before proving, so submitters cannot redirect it.
    uint256 _fee = (_value * _instruction.relayFeeBPS) / 10_000;
    if (_fee != 0) {
      if (_instruction.feeRecipient == address(0)) revert ZeroAddress();
      ASSET.safeTransfer(_instruction.feeRecipient, _fee);
    }

    _process(_value - _fee, _instruction.payload, _p);

    emit Executed(_p.existingNullifierHash(), _instruction.feeRecipient, _value, _fee);
  }

  /**
   * @notice Spender-specific handling of the withdrawn funds
   * @param _amount The value available after the relay fee
   * @param _payload The spender-specific instruction payload
   * @param _proof The verified withdrawal proof
   */
  function _process(uint256 _amount, bytes memory _payload, ProofLib.WithdrawProof memory _proof) internal virtual;
}
