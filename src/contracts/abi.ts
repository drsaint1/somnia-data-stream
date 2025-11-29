export const RACING_CONTRACT_ABI = [
  {
    inputs: [],
    name: "mintStarterCar",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "mintPremiumCar",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },

  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint256", name: "carId", type: "uint256" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "distance", type: "uint256" },
      { internalType: "uint256", name: "obstaclesAvoided", type: "uint256" },
      { internalType: "uint256", name: "bonusCollected", type: "uint256" },
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "submitRaceResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint256", name: "carId", type: "uint256" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "distance", type: "uint256" },
      { internalType: "uint256", name: "obstaclesAvoided", type: "uint256" },
      { internalType: "uint256", name: "bonusCollected", type: "uint256" },
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "bool", name: "mintTokens", type: "bool" },
    ],
    name: "submitRaceResultWithTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint256", name: "parent1Id", type: "uint256" },
      { internalType: "uint256", name: "parent2Id", type: "uint256" },
    ],
    name: "breedCars",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "stakeCar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "unstakeCar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" },
    ],
    name: "createTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "uint256", name: "carId", type: "uint256" },
    ],
    name: "enterTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "finalizeTournament",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "claimRaceTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_racingToken", type: "address" },
    ],
    name: "setRacingToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPlayerCars",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPlayerStats",
    outputs: [
      { internalType: "uint256", name: "level", type: "uint256" },
      { internalType: "uint256", name: "totalXP", type: "uint256" },
      { internalType: "uint256", name: "earnings", type: "uint256" },
      { internalType: "uint256", name: "carCount", type: "uint256" },
      { internalType: "uint256", name: "lastReward", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPendingTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getTokenBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "getCarDetails",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "speed", type: "uint256" },
          { internalType: "uint256", name: "handling", type: "uint256" },
          { internalType: "uint256", name: "acceleration", type: "uint256" },
          { internalType: "uint256", name: "rarity", type: "uint256" },
          { internalType: "uint256", name: "experience", type: "uint256" },
          { internalType: "uint256", name: "wins", type: "uint256" },
          { internalType: "uint256", name: "races", type: "uint256" },
          { internalType: "uint256", name: "generation", type: "uint256" },
          { internalType: "uint256", name: "birthTime", type: "uint256" },
          { internalType: "bool", name: "isStaked", type: "bool" },
          { internalType: "uint256", name: "stakedTime", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
        ],
        internalType: "struct SomniaRacing.RaceCar",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "nextTournamentId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentDetails",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "prizePool", type: "uint256" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "uint256", name: "participantCount", type: "uint256" },
      { internalType: "bool", name: "finalized", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentParticipants",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentWinners",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "getCarRaceHistory",
    outputs: [
      {
        components: [
          { internalType: "address", name: "player", type: "address" },
          { internalType: "uint256", name: "carId", type: "uint256" },
          { internalType: "uint256", name: "score", type: "uint256" },
          { internalType: "uint256", name: "distance", type: "uint256" },
          {
            internalType: "uint256",
            name: "obstaclesAvoided",
            type: "uint256",
          },
          { internalType: "uint256", name: "bonusCollected", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "uint256", name: "tournamentId", type: "uint256" },
        ],
        internalType: "struct SomniaRacing.RaceResult[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "limit", type: "uint256" }],
    name: "getLeaderboard",
    outputs: [
      { internalType: "address[]", name: "players", type: "address[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" },
      { internalType: "uint256[]", name: "levels", type: "uint256[]" },
      { internalType: "uint256[]", name: "totalXPs", type: "uint256[]" },
      { internalType: "uint256[]", name: "carCounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "rarity",
        type: "uint256",
      },
    ],
    name: "CarMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "score",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "xpGained",
        type: "uint256",
      },
    ],
    name: "RaceCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tournamentId",
        type: "uint256",
      },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      {
        indexed: false,
        internalType: "uint256",
        name: "prizePool",
        type: "uint256",
      },
    ],
    name: "TournamentCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parent1",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "parent2",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "childId",
        type: "uint256",
      },
    ],
    name: "CarBred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "CarStaked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "rewardXP",
        type: "uint256",
      },
    ],
    name: "CarUnstaked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "score",
        type: "uint256",
      },
    ],
    name: "TokensEarned",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokensMinted",
    type: "event",
  },
] as const;

export const CONTRACT_ADDRESSES = {
  RACING: import.meta.env.VITE_RACING_CONTRACT_ADDRESS as `0x${string}`,
  TOURNAMENTS: import.meta.env
    .VITE_TOURNAMENTS_CONTRACT_ADDRESS as `0x${string}`,
  TOKEN: import.meta.env.VITE_RACING_TOKEN_ADDRESS as `0x${string}`,
} as const;
