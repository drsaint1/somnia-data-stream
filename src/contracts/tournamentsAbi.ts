// src/contracts/tournamentsAbi.ts - SomniaTournaments Contract ABI (Updated with 5-minute start time)
export const TOURNAMENTS_CONTRACT_ADDRESS = 
  import.meta.env.VITE_TOURNAMENTS_CONTRACT_ADDRESS as `0x${string}`;

export const TOURNAMENTS_ABI = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" }
    ],
    name: "createTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "uint256", name: "carId", type: "uint256" }
    ],
    name: "enterTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" }
    ],
    name: "finalizeTournament",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    inputs: [
      { internalType: "uint256", name: "parent1Id", type: "uint256" },
      { internalType: "uint256", name: "parent2Id", type: "uint256" }
    ],
    name: "breedCars",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },

  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" }
    ],
    name: "getTournamentDetails",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "prizePool", type: "uint256" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "uint256", name: "participantCount", type: "uint256" },
      { internalType: "bool", name: "finalized", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" }
    ],
    name: "getTournamentParticipants",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" }
    ],
    name: "getTournamentWinners",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "uint256", name: "carId", type: "uint256" }
    ],
    name: "getTournamentScore",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" }
    ],
    name: "getTournamentScores",
    outputs: [
      { internalType: "uint256[]", name: "carIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "address", name: "player", type: "address" }
    ],
    name: "hasPlayerParticipated",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "address", name: "player", type: "address" }
    ],
    name: "getPlayerTournamentCars",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "address", name: "player", type: "address" }
    ],
    name: "getPlayerTournamentResults",
    outputs: [
      { internalType: "bool", name: "participated", type: "bool" },
      { internalType: "uint256[]", name: "carIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" },
      { internalType: "uint256", name: "bestScore", type: "uint256" },
      { internalType: "uint256", name: "bestRank", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "nextTournamentId",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },

  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_racingContract", type: "address" }
    ],
    name: "setRacingContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "uint256", name: "carId", type: "uint256" },
      { internalType: "uint256", name: "score", type: "uint256" }
    ],
    name: "submitTournamentScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tournamentId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "prizePool",
        type: "uint256"
      }
    ],
    name: "TournamentCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tournamentId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256"
      }
    ],
    name: "TournamentEntered",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tournamentId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "winners",
        type: "uint256[]"
      }
    ],
    name: "TournamentFinalized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parent1",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "parent2",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "childId",
        type: "uint256"
      }
    ],
    name: "CarBred",
    type: "event"
  }
] as const;