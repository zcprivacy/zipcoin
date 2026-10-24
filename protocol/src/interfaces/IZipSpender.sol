// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {IERC20} from '@oz/token/ERC20/IERC20.sol';

import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

/**
 * @title IZipSpender
 * @notice Common interface for Zipcoin spender contracts.
 * @dev A spender is the `processooor` of a Privacy Pools v1 withdrawal. The user chooses the spender
 *      and encodes an `Instruction` into `Withdrawal.data` before proving, so the proof's `context`
 *      signal binds the spender address and every byte of the instruction. Anyone may submit the
 *      transaction; nothing in it can be altered without invalidating the proof.
 */
interface IZipSpender {
  /*///////////////////////////////////////////////////////////////
                              STRUCTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Header shared by every spender, followed by a spender-specific payload
   * @param version Instruction format version, see `INSTRUCTION_VERSION`
   * @param feeRecipient Address paid the relay fee, usually the relayer that submits the transaction
   * @param relayFeeBPS Relay fee in basis points of the withdrawn value, at most `MAX_RELAY_FEE_BPS`
   * @param payload ABI-encoded, spender-specific instruction
   */
  struct Instruction {
    uint8 version;
    address feeRecipient;
    uint256 relayFeeBPS;
    bytes payload;
  }

  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted after a withdrawal has been processed by this spender
   * @param _nullifierHash The nullifier hash spent by the withdrawal
   * @param _feeRecipient The address that received the relay fee
   * @param _value The value withdrawn from the pool
   * @param _fee The relay fee paid out of `_value`
   */
  event Executed(uint256 indexed _nullifierHash, address indexed _feeRecipient, uint256 _value, uint256 _fee);

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the withdrawal names a different processooor than this spender
  error NotProcessooor();
  /// @notice Thrown when the instruction version is not supported
  error UnsupportedInstructionVersion(uint8 _version);
  /// @notice Thrown when the relay fee exceeds the spender's maximum
  error RelayFeeTooHigh(uint256 _feeBPS, uint256 _maxFeeBPS);
  /// @notice Thrown when the pool paid a different amount than the proof declares
  error UnexpectedBalance(uint256 _expected, uint256 _actual);
  /// @notice Thrown when the proof withdraws nothing
  error ZeroWithdrawal();
  /// @notice Thrown when an address parameter is zero
  error ZeroAddress();
  /// @notice Thrown when a fee in basis points is not below 100%
  error InvalidFeeBPS();

  /*///////////////////////////////////////////////////////////////
                              VIEWS
  //////////////////////////////////////////////////////////////*/

  /// @notice The Privacy Pool this spender withdraws from
  function POOL() external view returns (IPrivacyPool _pool);
  /// @notice The pool's asset
  function ASSET() external view returns (IERC20 _asset);
  /// @notice Maximum relay fee in basis points
  function MAX_RELAY_FEE_BPS() external view returns (uint256 _maxRelayFeeBPS);
  /// @notice Instruction format version this spender accepts
  function INSTRUCTION_VERSION() external view returns (uint8 _version);

  /*///////////////////////////////////////////////////////////////
                              LOGIC
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Process a withdrawal whose instruction names this spender
   * @param _withdrawal The `Withdrawal` with `processooor == address(this)` and an encoded `Instruction`
   * @param _proof The Groth16 withdrawal proof bound to `_withdrawal`
   */
  function execute(IPrivacyPool.Withdrawal calldata _withdrawal, ProofLib.WithdrawProof calldata _proof) external;
}
