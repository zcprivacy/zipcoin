// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {ProofLib} from 'contracts/lib/ProofLib.sol';
import {IPrivacyPool} from 'interfaces/IPrivacyPool.sol';

import {ZipDoorstep} from '../src/ZipDoorstep.sol';
import {ZipBase} from './ZipBase.t.sol';

contract ZipDoorstepTest is ZipBase {
  address internal door = makeAddr('door');

  function _delivery(address _door, string memory _text, bytes memory _sealed) internal pure returns (bytes memory) {
    return abi.encode(ZipDoorstep.Delivery({door: _door, text: _text, cipher: _sealed}));
  }

  function test_DeliverPublicText() public {
    uint256 _value = 500e18;
    IPrivacyPool.Withdrawal memory _w =
      _withdrawal(address(doorstep), _instruction(relayer, 200, _delivery(door, 'Your lantern is on the step.', '')));
    ProofLib.WithdrawProof memory _p = _proof(_w, _value);
    uint256 _fee = _value * 200 / 10_000;

    vm.expectEmit(address(doorstep));
    emit ZipDoorstep.Delivered(1, door, _value - _fee, 'Your lantern is on the step.', '');
    doorstep.execute(_w, _p);

    assertEq(doorstep.deliveries(), 1);
    assertEq(zc.balanceOf(doorstep.FURNACE()), _value - _fee);
    assertEq(zc.balanceOf(relayer), _fee);
  }

  function test_DeliverSealedOnly() public {
    bytes memory _sealed = hex'04deadbeefcafebabe0123456789abcdef';
    IPrivacyPool.Withdrawal memory _w =
      _withdrawal(address(doorstep), _instruction(address(0), 0, _delivery(door, '', _sealed)));
    ProofLib.WithdrawProof memory _p = _proof(_w, DOOR_MIN_BURN);

    vm.expectEmit(address(doorstep));
    emit ZipDoorstep.Delivered(1, door, DOOR_MIN_BURN, '', _sealed);
    doorstep.execute(_w, _p);
  }

  function test_RevertWhen_DoorIsZero() public {
    IPrivacyPool.Withdrawal memory _w =
      _withdrawal(address(doorstep), _instruction(address(0), 0, _delivery(address(0), 'hi', '')));
    ProofLib.WithdrawProof memory _p = _proof(_w, DOOR_MIN_BURN);

    vm.expectRevert(ZipDoorstep.ZeroDoor.selector);
    doorstep.execute(_w, _p);
  }

  function test_RevertWhen_NothingToDeliver() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(doorstep), _instruction(address(0), 0, _delivery(door, '', '')));
    ProofLib.WithdrawProof memory _p = _proof(_w, DOOR_MIN_BURN);

    vm.expectRevert(ZipDoorstep.EmptyDelivery.selector);
    doorstep.execute(_w, _p);
  }

  function test_RevertWhen_SealedTooLong() public {
    bytes memory _sealed = new bytes(MAX_SEALED_BYTES + 1);
    IPrivacyPool.Withdrawal memory _w =
      _withdrawal(address(doorstep), _instruction(address(0), 0, _delivery(door, '', _sealed)));
    ProofLib.WithdrawProof memory _p = _proof(_w, DOOR_MIN_BURN);

    vm.expectRevert(abi.encodeWithSelector(ZipDoorstep.SealedTooLong.selector, MAX_SEALED_BYTES + 1, MAX_SEALED_BYTES));
    doorstep.execute(_w, _p);
  }

  function test_RevertWhen_BurnBelowMinimum() public {
    IPrivacyPool.Withdrawal memory _w = _withdrawal(address(doorstep), _instruction(address(0), 0, _delivery(door, 'hi', '')));
    ProofLib.WithdrawProof memory _p = _proof(_w, DOOR_MIN_BURN - 1);

    vm.expectRevert(abi.encodeWithSelector(ZipDoorstep.BurnBelowMinimum.selector, DOOR_MIN_BURN - 1, DOOR_MIN_BURN));
    doorstep.execute(_w, _p);
  }
}
