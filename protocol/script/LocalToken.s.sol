// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {ERC20} from '@oz/token/ERC20/ERC20.sol';
import {Script} from 'forge-std/Script.sol';
import {console} from 'forge-std/console.sol';

/// @notice Stand-in for ZC on a local Anvil chain. Mainnet uses the real launchpad token.
contract LocalZC is ERC20 {
  constructor() ERC20('zipcoin', 'ZC') {
    _mint(msg.sender, 1_000_000_000e18);
  }
}

contract DeployLocalToken is Script {
  function run() external returns (address _token) {
    vm.startBroadcast();
    _token = address(new LocalZC());
    vm.stopBroadcast();
    console.log('LocalZC %s', _token);
  }
}
