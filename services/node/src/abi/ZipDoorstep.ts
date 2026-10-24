// Generated from protocol/out/ZipDoorstep.sol/ZipDoorstep.json by scripts/gen-abi.mjs. Do not edit.
export const ZipDoorstepAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_pool",
        "type": "address",
        "internalType": "contract IPrivacyPool"
      },
      {
        "name": "_maxRelayFeeBPS",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_minBurn",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_maxTextBytes",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_maxSealedBytes",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ASSET",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FURNACE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "INSTRUCTION_VERSION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_RELAY_FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_SEALED_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_TEXT_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_BURN",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "POOL",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPrivacyPool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deliveries",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "_withdrawal",
        "type": "tuple",
        "internalType": "struct IPrivacyPool.Withdrawal",
        "components": [
          {
            "name": "processooor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "_proof",
        "type": "tuple",
        "internalType": "struct ProofLib.WithdrawProof",
        "components": [
          {
            "name": "pA",
            "type": "uint256[2]",
            "internalType": "uint256[2]"
          },
          {
            "name": "pB",
            "type": "uint256[2][2]",
            "internalType": "uint256[2][2]"
          },
          {
            "name": "pC",
            "type": "uint256[2]",
            "internalType": "uint256[2]"
          },
          {
            "name": "pubSignals",
            "type": "uint256[8]",
            "internalType": "uint256[8]"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Delivered",
    "inputs": [
      {
        "name": "_id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "_door",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "_burned",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "_text",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "_sealed",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Executed",
    "inputs": [
      {
        "name": "_nullifierHash",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "_feeRecipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "_value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "_fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BurnBelowMinimum",
    "inputs": [
      {
        "name": "_burned",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_minimum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "EmptyDelivery",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidFeeBPS",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotProcessooor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RelayFeeTooHigh",
    "inputs": [
      {
        "name": "_feeBPS",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_maxFeeBPS",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SealedTooLong",
    "inputs": [
      {
        "name": "_length",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_maximum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "TextTooLong",
    "inputs": [
      {
        "name": "_length",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_maximum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnexpectedBalance",
    "inputs": [
      {
        "name": "_expected",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_actual",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnsupportedInstructionVersion",
    "inputs": [
      {
        "name": "_version",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroDoor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroParameter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroWithdrawal",
    "inputs": []
  }
] as const;
