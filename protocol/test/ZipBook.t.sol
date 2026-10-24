// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';
import {IState} from 'interfaces/IState.sol';

import {ZipBook} from '../src/ZipBook.sol';
import {IZipSpender} from '../src/interfaces/IZipSpender.sol';
import {ZipBase} from './ZipBase.t.sol';

contract ZipBookTest is ZipBase {
  string internal constant TEXT = 'The lantern is lit on the north bridge until the snow stops.';

  function _post(uint256 _replyTo, string memory _text) internal pure returns (bytes memory) {
    return abi.encode(ZipBook.Post({replyTo: _replyTo, text: _text}));
  }

  function test_SpeakBurnsAndPaysRelayer() public {
    uint256 _value = 2000e18;
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(relayer, 100, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, _value);

    uint256 _fee = _value / 100;
    uint256 _poolBefore = zc.balanceOf(address(pool));

    vm.expectEmit(address(book));
    emit ZipBook.Spoken(1, 0, _value - _fee, TEXT);
    vm.expectEmit(address(book));
    emit IZipSpender.Executed(_p.pubSignals[1], relayer, _value, _fee);

    vm.prank(relayer);
    book.execute(_w, _p);

    assertEq(book.posts(), 1, 'post counted');
    assertEq(zc.balanceOf(book.FURNACE()), _value - _fee, 'burned to furnace');
    assertEq(zc.balanceOf(relayer), _fee, 'relayer paid');
    assertEq(zc.balanceOf(address(book)), 0, 'spender keeps nothing');
    assertEq(zc.balanceOf(address(pool)), _poolBefore - _value, 'pool paid out exactly the proof value');
    assertTrue(pool.nullifierHashes(_p.pubSignals[1]), 'nullifier spent');
  }

  function test_SpeakWithoutRelayFee() public {
    uint256 _value = BOOK_MIN_BURN;
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 0, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, _value);

    book.execute(_w, _p);

    assertEq(zc.balanceOf(book.FURNACE()), _value);
  }

  function test_AnyoneCanSubmitButFeeGoesToEncodedRecipient() public {
    uint256 _value = 2000e18;
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(relayer, 300, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, _value);

    address _frontrunner = makeAddr('frontrunner');
    vm.prank(_frontrunner);
    book.execute(_w, _p);

    assertEq(zc.balanceOf(relayer), _value * 300 / 10_000, 'encoded recipient paid');
    assertEq(zc.balanceOf(_frontrunner), 0, 'submitter earns nothing');
  }

  function test_ReplyToExistingPost() public {
    IPrivacyPool.Withdrawal memory _w1 = _withdrawal(address(book), _instruction(address(0), 0, _post(0, TEXT)));
    book.execute(_w1, _proof(_w1, BOOK_MIN_BURN));

    IPrivacyPool.Withdrawal memory _w2 = _withdrawal(address(book), _instruction(address(0), 0, _post(1, 'Noted.')));
    ProofLib.WithdrawProof memory _p2 = _proof(_w2, BOOK_MIN_BURN);

    vm.expectEmit(address(book));
    emit ZipBook.Spoken(2, 1, BOOK_MIN_BURN, 'Noted.');
    book.execute(_w2, _p2);

    assertEq(book.posts(), 2);
  }

  function test_RevertWhen_ReplyToUnknownPost() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 0, _post(7, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, BOOK_MIN_BURN);

    vm.expectRevert(abi.encodeWithSelector(ZipBook.UnknownPost.selector, 7));
    book.execute(_w, _p);
  }

  function test_RevertWhen_BurnBelowMinimumAfterFee() public {
    // Exactly the minimum before the fee is not enough once the fee is taken.
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(relayer, 100, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, BOOK_MIN_BURN);

    vm.expectRevert(
      abi.encodeWithSelector(ZipBook.BurnBelowMinimum.selector, BOOK_MIN_BURN - BOOK_MIN_BURN / 100, BOOK_MIN_BURN)
    );
    book.execute(_w, _p);
  }

  function test_RevertWhen_TextTooLong() public {
    bytes memory _long = new bytes(MAX_TEXT_BYTES + 1);
    for (uint256 i; i < _long.length; i++) {
      _long[i] = 'a';
    }
    IPrivacyPool.Withdrawal memory _w =
      _withdrawal(address(book), _instruction(address(0), 0, _post(0, string(_long))));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(abi.encodeWithSelector(ZipBook.TextTooLong.selector, MAX_TEXT_BYTES + 1, MAX_TEXT_BYTES));
    book.execute(_w, _p);
  }

  function test_RevertWhen_TextEmpty() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 0, _post(0, '')));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(ZipBook.EmptyText.selector);
    book.execute(_w, _p);
  }

  function test_RevertWhen_RelayFeeAboveMax() public {
    IPrivacyPool.Withdrawal memory _w =
      _withdrawal(address(book), _instruction(relayer, MAX_RELAY_FEE_BPS + 1, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(
      abi.encodeWithSelector(IZipSpender.RelayFeeTooHigh.selector, MAX_RELAY_FEE_BPS + 1, MAX_RELAY_FEE_BPS)
    );
    book.execute(_w, _p);
  }

  function test_RevertWhen_WrongInstructionVersion() public {
    IZipSpender.Instruction memory _ix = _instruction(address(0), 0, _post(0, TEXT));
    _ix.version = 2;
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _ix);
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(abi.encodeWithSelector(IZipSpender.UnsupportedInstructionVersion.selector, 2));
    book.execute(_w, _p);
  }

  function test_RevertWhen_WithdrawalNamesAnotherProcessooor() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(doorstep), _instruction(address(0), 0, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(IZipSpender.NotProcessooor.selector);
    book.execute(_w, _p);
  }

  function test_RevertWhen_InstructionTamperedAfterProving() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(relayer, 100, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    // A submitter rewrites the fee recipient; the context no longer matches the proof.
    IPrivacyPool.Withdrawal memory _tampered =
      _withdrawal(address(book), _instruction(makeAddr('thief'), 100, _post(0, TEXT)));

    vm.expectRevert(IPrivacyPool.ContextMismatch.selector);
    book.execute(_tampered, _p);
  }

  function test_RevertWhen_ProofReplayed() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 0, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);
    book.execute(_w, _p);

    vm.expectRevert(IState.NullifierAlreadySpent.selector);
    book.execute(_w, _p);
  }

  function test_RevertWhen_ProofInvalid() public {
    withdrawalVerifier.setValid(false);
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 0, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(IPrivacyPool.InvalidProof.selector);
    book.execute(_w, _p);
  }

  function test_RevertWhen_ZeroWithdrawal() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 0, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 0);

    vm.expectRevert(IZipSpender.ZeroWithdrawal.selector);
    book.execute(_w, _p);
  }

  function test_RevertWhen_FeeWithoutRecipient() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(book), _instruction(address(0), 100, _post(0, TEXT)));
    ProofLib.WithdrawProof memory _p = _proof(_w, 2000e18);

    vm.expectRevert(IZipSpender.ZeroAddress.selector);
    book.execute(_w, _p);
  }

  function test_ImmutableConfiguration() public view {
    assertEq(address(book.POOL()), address(pool));
    assertEq(address(book.ASSET()), address(zc));
    assertEq(book.MAX_RELAY_FEE_BPS(), MAX_RELAY_FEE_BPS);
    assertEq(book.MIN_BURN(), BOOK_MIN_BURN);
    assertEq(book.MAX_TEXT_BYTES(), MAX_TEXT_BYTES);
    assertEq(book.INSTRUCTION_VERSION(), 1);
  }
}
