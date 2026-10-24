// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {IERC20} from '@oz/token/ERC20/IERC20.sol';
import {SafeERC20} from '@oz/token/ERC20/utils/SafeERC20.sol';

import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

import {ZipSpender} from './ZipSpender.sol';

/**
 * @title ZipDoorstep
 * @notice The Doorstep: leave a message at one address, paid for with a burn, with no sender.
 * @dev Like the Book, but addressed. `text` is readable by everyone. `cipher` is opaque bytes the
 *      sender encrypted off-chain for the door's owner, so a delivery can be private as well as
 *      unattributable. The contract never interprets `cipher`. A delivery must carry at least one
 *      of the two. The burn deters spam; it is sent to the furnace and never moves again.
 */
contract ZipDoorstep is ZipSpender {
  using SafeERC20 for IERC20;

  /**
   * @notice Payload of a Doorstep instruction
   * @param door The address the message is left for
   * @param text Public message, may be empty, at most `MAX_TEXT_BYTES`
   * @param cipher Ciphertext for the door's owner, may be empty, at most `MAX_SEALED_BYTES`
   */
  struct Delivery {
    address door;
    string text;
    bytes cipher;
  }

  /// @notice Burned tokens are sent here and are unrecoverable
  address public constant FURNACE = 0x000000000000000000000000000000000000dEaD;

  /// @notice Minimum amount burned per delivery, after the relay fee
  uint256 public immutable MIN_BURN;
  /// @notice Maximum length of the public text in bytes
  uint256 public immutable MAX_TEXT_BYTES;
  /// @notice Maximum length of the sealed bytes
  uint256 public immutable MAX_SEALED_BYTES;

  /// @notice Number of deliveries so far; ids are 1-based
  uint256 public deliveries;

  /**
   * @notice Emitted for every delivery
   * @param _id The delivery id
   * @param _door The address the message was left for
   * @param _burned The amount burned for this delivery
   * @param _text The public message, possibly empty
   * @param _sealed The ciphertext, possibly empty
   */
  event Delivered(uint256 indexed _id, address indexed _door, uint256 _burned, string _text, bytes _sealed);

  /// @notice Thrown when the burn after fees is below `MIN_BURN`
  error BurnBelowMinimum(uint256 _burned, uint256 _minimum);
  /// @notice Thrown when the text exceeds `MAX_TEXT_BYTES`
  error TextTooLong(uint256 _length, uint256 _maximum);
  /// @notice Thrown when the sealed bytes exceed `MAX_SEALED_BYTES`
  error SealedTooLong(uint256 _length, uint256 _maximum);
  /// @notice Thrown when both text and sealed bytes are empty
  error EmptyDelivery();
  /// @notice Thrown when the door address is zero
  error ZeroDoor();
  /// @notice Thrown when a constructor parameter is zero
  error ZeroParameter();

  /**
   * @param _pool The ZC Privacy Pool
   * @param _maxRelayFeeBPS Maximum relay fee in basis points
   * @param _minBurn Minimum burn per delivery
   * @param _maxTextBytes Maximum public text length in bytes
   * @param _maxSealedBytes Maximum sealed length in bytes
   */
  constructor(
    IPrivacyPool _pool,
    uint256 _maxRelayFeeBPS,
    uint256 _minBurn,
    uint256 _maxTextBytes,
    uint256 _maxSealedBytes
  ) ZipSpender(_pool, _maxRelayFeeBPS) {
    if (_minBurn == 0 || _maxTextBytes == 0 || _maxSealedBytes == 0) revert ZeroParameter();
    MIN_BURN = _minBurn;
    MAX_TEXT_BYTES = _maxTextBytes;
    MAX_SEALED_BYTES = _maxSealedBytes;
  }

  /// @inheritdoc ZipSpender
  function _process(uint256 _amount, bytes memory _payload, ProofLib.WithdrawProof memory) internal override {
    Delivery memory _delivery = abi.decode(_payload, (Delivery));

    if (_delivery.door == address(0)) revert ZeroDoor();
    uint256 _textLength = bytes(_delivery.text).length;
    uint256 _sealedLength = _delivery.cipher.length;
    if (_textLength == 0 && _sealedLength == 0) revert EmptyDelivery();
    if (_textLength > MAX_TEXT_BYTES) revert TextTooLong(_textLength, MAX_TEXT_BYTES);
    if (_sealedLength > MAX_SEALED_BYTES) revert SealedTooLong(_sealedLength, MAX_SEALED_BYTES);
    if (_amount < MIN_BURN) revert BurnBelowMinimum(_amount, MIN_BURN);

    uint256 _id = ++deliveries;
    ASSET.safeTransfer(FURNACE, _amount);

    emit Delivered(_id, _delivery.door, _amount, _delivery.text, _delivery.cipher);
  }
}
