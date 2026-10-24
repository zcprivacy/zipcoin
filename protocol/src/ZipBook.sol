// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {IERC20} from '@oz/token/ERC20/IERC20.sol';
import {SafeERC20} from '@oz/token/ERC20/utils/SafeERC20.sol';

import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

import {ZipSpender} from './ZipSpender.sol';

/**
 * @title ZipBook
 * @notice The Book: a public record where posting costs a burn and authorship cannot be proven.
 * @dev The post is the payload of a Privacy Pools withdrawal, so the proof binds its text and the
 *      pool reveals nothing about which deposit paid for it. The burned amount is sent to the
 *      furnace address and can never move again. Posts live in events; the contract keeps only a
 *      counter so replies can be checked against existing ids.
 */
contract ZipBook is ZipSpender {
  using SafeERC20 for IERC20;

  /**
   * @notice Payload of a Book instruction
   * @param replyTo Id of the post being answered, or 0 for a top-level post
   * @param text The message, at most `MAX_TEXT_BYTES` bytes
   */
  struct Post {
    uint256 replyTo;
    string text;
  }

  /// @notice Burned tokens are sent here and are unrecoverable
  address public constant FURNACE = 0x000000000000000000000000000000000000dEaD;

  /// @notice Minimum amount burned per post, after the relay fee
  uint256 public immutable MIN_BURN;
  /// @notice Maximum length of a post in bytes
  uint256 public immutable MAX_TEXT_BYTES;

  /// @notice Number of posts so far; ids are 1-based
  uint256 public posts;

  /**
   * @notice Emitted for every post
   * @param _id The post id
   * @param _replyTo The id answered, or 0
   * @param _burned The amount burned for this post
   * @param _text The message
   */
  event Spoken(uint256 indexed _id, uint256 indexed _replyTo, uint256 _burned, string _text);

  /// @notice Thrown when the burn after fees is below `MIN_BURN`
  error BurnBelowMinimum(uint256 _burned, uint256 _minimum);
  /// @notice Thrown when the text exceeds `MAX_TEXT_BYTES`
  error TextTooLong(uint256 _length, uint256 _maximum);
  /// @notice Thrown when the text is empty
  error EmptyText();
  /// @notice Thrown when replying to a post that does not exist
  error UnknownPost(uint256 _id);
  /// @notice Thrown when a constructor parameter is zero
  error ZeroParameter();

  /**
   * @param _pool The ZC Privacy Pool
   * @param _maxRelayFeeBPS Maximum relay fee in basis points
   * @param _minBurn Minimum burn per post
   * @param _maxTextBytes Maximum post length in bytes
   */
  constructor(
    IPrivacyPool _pool,
    uint256 _maxRelayFeeBPS,
    uint256 _minBurn,
    uint256 _maxTextBytes
  ) ZipSpender(_pool, _maxRelayFeeBPS) {
    if (_minBurn == 0 || _maxTextBytes == 0) revert ZeroParameter();
    MIN_BURN = _minBurn;
    MAX_TEXT_BYTES = _maxTextBytes;
  }

  /// @inheritdoc ZipSpender
  function _process(uint256 _amount, bytes memory _payload, ProofLib.WithdrawProof memory) internal override {
    Post memory _post = abi.decode(_payload, (Post));

    uint256 _length = bytes(_post.text).length;
    if (_length == 0) revert EmptyText();
    if (_length > MAX_TEXT_BYTES) revert TextTooLong(_length, MAX_TEXT_BYTES);
    if (_amount < MIN_BURN) revert BurnBelowMinimum(_amount, MIN_BURN);
    if (_post.replyTo > posts) revert UnknownPost(_post.replyTo);

    uint256 _id = ++posts;
    ASSET.safeTransfer(FURNACE, _amount);

    emit Spoken(_id, _post.replyTo, _amount, _post.text);
  }
}
