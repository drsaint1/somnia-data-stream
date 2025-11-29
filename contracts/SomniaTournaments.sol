// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface ISomniaRacing {
    struct RaceCar {
        uint256 speed;
        uint256 handling;
        uint256 acceleration;
        uint256 rarity;
        uint256 experience;
        uint256 wins;
        uint256 races;
        uint256 generation;
        uint256 birthTime;
        bool isStaked;
        uint256 stakedTime;
        string name;
    }
    
    function ownerOf(uint256 tokenId) external view returns (address);
    function getCarDetails(uint256 carId) external view returns (RaceCar memory);
    function nextCarId() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function raceCars(uint256 carId) external view returns (RaceCar memory);
    function playerCars(address player, uint256 index) external view returns (uint256);
    function playerLevel(address player) external view returns (uint256);
    function playerXP(address player) external view returns (uint256);
    function playerEarnings(address player) external view returns (uint256);
    function isRegisteredPlayer(address player) external view returns (bool);
}


contract SomniaTournaments is Ownable, ReentrancyGuard, Pausable {
    struct Tournament {
        uint256 id;
        string name;
        uint256 entryFee;
        uint256 prizePool;
        uint256 startTime;
        uint256 endTime;
        uint256 maxParticipants;
        uint256[] participants;
        mapping(uint256 => uint256) scores;
        mapping(uint256 => bool) hasEntered;
        bool finalized;
        uint256[] winners;
    }
    
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => mapping(address => bool)) public tournamentPlayerParticipated;
    mapping(uint256 => mapping(address => uint256[])) public tournamentPlayerCars;
    
    uint256 public nextTournamentId = 1;
    uint256 public totalTournamentPrizePool = 0;
    
    ISomniaRacing public racingContract;
    
    uint256 public constant BREEDING_COST = 0.01 ether;
    uint256 public constant MIN_TOURNAMENT_DURATION = 1 hours;
    uint256 public constant MAX_TOURNAMENT_DURATION = 7 days;
    
    event TournamentCreated(uint256 indexed tournamentId, string name, uint256 prizePool);
    event TournamentEntered(uint256 indexed tournamentId, address indexed player, uint256 indexed carId);
    event TournamentFinalized(uint256 indexed tournamentId, uint256[] winners);
    event CarBred(uint256 indexed parent1, uint256 indexed parent2, uint256 indexed childId);
    
    constructor(address _racingContract) Ownable(msg.sender) {
        racingContract = ISomniaRacing(_racingContract);
    }
    
    
    function createTournament(
        string memory name,
        uint256 entryFee,
        uint256 duration,
        uint256 maxParticipants
    ) external payable whenNotPaused {
        require(bytes(name).length > 0, "Tournament name required");
        require(duration >= MIN_TOURNAMENT_DURATION && duration <= MAX_TOURNAMENT_DURATION, "Invalid duration");
        require(maxParticipants >= 2 && maxParticipants <= 1000, "Invalid max participants");
        require(msg.value > 0, "Prize pool required");
        
        uint256 tournamentId = nextTournamentId++;
        Tournament storage tournament = tournaments[tournamentId];
        
        tournament.id = tournamentId;
        tournament.name = name;
        tournament.entryFee = entryFee;
        tournament.prizePool = msg.value;
        tournament.startTime = block.timestamp + 5 minutes;
        tournament.endTime = tournament.startTime + duration;
        tournament.maxParticipants = maxParticipants;
        tournament.finalized = false;
        
        totalTournamentPrizePool += msg.value;
        
        emit TournamentCreated(tournamentId, name, msg.value);
    }
    
    function enterTournament(uint256 tournamentId, uint256 carId) external payable whenNotPaused {
        Tournament storage tournament = tournaments[tournamentId];
        require(tournament.startTime > 0, "Tournament doesn't exist");
        require(block.timestamp >= tournament.startTime, "Tournament not started yet");
        require(block.timestamp <= tournament.endTime, "Tournament ended");
        require(!tournament.finalized, "Tournament already finalized");
        require(msg.value >= tournament.entryFee, "Insufficient entry fee");
        require(racingContract.ownerOf(carId) == msg.sender, "Not car owner");
        require(!tournament.hasEntered[carId], "Car already entered");
        require(tournament.participants.length < tournament.maxParticipants, "Tournament full");
        
        ISomniaRacing.RaceCar memory car = racingContract.getCarDetails(carId);
        require(!car.isStaked, "Car is staked");
        
        tournament.participants.push(carId);
        tournament.hasEntered[carId] = true;
        tournament.prizePool += msg.value;
        
        tournamentPlayerParticipated[tournamentId][msg.sender] = true;
        tournamentPlayerCars[tournamentId][msg.sender].push(carId);
        
        emit TournamentEntered(tournamentId, msg.sender, carId);
    }
    
    function finalizeTournament(uint256 tournamentId) external onlyOwner {
        Tournament storage tournament = tournaments[tournamentId];
        require(tournament.startTime > 0, "Tournament doesn't exist");
        require(block.timestamp > tournament.endTime, "Tournament not ended");
        require(!tournament.finalized, "Already finalized");
        
        uint256[] memory winners = new uint256[](3);
        uint256[] memory topScores = new uint256[](3);
        
        for (uint256 i = 0; i < tournament.participants.length; i++) {
            uint256 carId = tournament.participants[i];
            uint256 score = tournament.scores[carId];
            
            if (score > topScores[0]) {
                topScores[2] = topScores[1];
                topScores[1] = topScores[0];
                topScores[0] = score;
                winners[2] = winners[1];
                winners[1] = winners[0];
                winners[0] = carId;
            } else if (score > topScores[1]) {
                topScores[2] = topScores[1];
                topScores[1] = score;
                winners[2] = winners[1];
                winners[1] = carId;
            } else if (score > topScores[2]) {
                topScores[2] = score;
                winners[2] = carId;
            }
        }
        
        uint256 firstPrize = (tournament.prizePool * 50) / 100;
        uint256 secondPrize = (tournament.prizePool * 30) / 100;
        uint256 thirdPrize = (tournament.prizePool * 20) / 100;
        
        if (winners[0] != 0) {
            address winner1 = racingContract.ownerOf(winners[0]);
            payable(winner1).transfer(firstPrize);
        }
        
        if (winners[1] != 0) {
            address winner2 = racingContract.ownerOf(winners[1]);
            payable(winner2).transfer(secondPrize);
        }
        
        if (winners[2] != 0) {
            address winner3 = racingContract.ownerOf(winners[2]);
            payable(winner3).transfer(thirdPrize);
        }
        
        tournament.winners = winners;
        tournament.finalized = true;
        
        emit TournamentFinalized(tournamentId, winners);
    }
    
    
    function breedCars(uint256 parent1Id, uint256 parent2Id) external payable whenNotPaused {
        require(msg.value >= BREEDING_COST, "Insufficient breeding fee");
        require(racingContract.ownerOf(parent1Id) == msg.sender, "Not owner of parent1");
        require(racingContract.ownerOf(parent2Id) == msg.sender, "Not owner of parent2");
        require(parent1Id != parent2Id, "Cannot breed car with itself");
        
        ISomniaRacing.RaceCar memory parent1 = racingContract.getCarDetails(parent1Id);
        ISomniaRacing.RaceCar memory parent2 = racingContract.getCarDetails(parent2Id);
        
        require(!parent1.isStaked && !parent2.isStaked, "Cars are staked");
        
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, parent1Id, parent2Id)));
        
        uint256 childSpeed = _calculateChildStat(parent1.speed, parent2.speed, seed, 0);
        uint256 childHandling = _calculateChildStat(parent1.handling, parent2.handling, seed, 1);
        uint256 childAccel = _calculateChildStat(parent1.acceleration, parent2.acceleration, seed, 2);
        uint256 childRarity = _max(parent1.rarity, parent2.rarity);
        
        string memory childName = string(abi.encodePacked("Gen-", _toString(_max(parent1.generation, parent2.generation) + 1), " Hybrid"));
        
        emit CarBred(parent1Id, parent2Id, racingContract.nextCarId());
    }
    
    
    function getTournamentDetails(uint256 tournamentId) external view returns (
        string memory name,
        uint256 entryFee,
        uint256 prizePool,
        uint256 startTime,
        uint256 endTime,
        uint256 participantCount,
        bool finalized
    ) {
        Tournament storage tournament = tournaments[tournamentId];
        return (
            tournament.name,
            tournament.entryFee,
            tournament.prizePool,
            tournament.startTime,
            tournament.endTime,
            tournament.participants.length,
            tournament.finalized
        );
    }
    
    function getTournamentParticipants(uint256 tournamentId) external view returns (uint256[] memory) {
        return tournaments[tournamentId].participants;
    }
    
    function getTournamentWinners(uint256 tournamentId) external view returns (uint256[] memory) {
        return tournaments[tournamentId].winners;
    }
    
    function getTournamentScore(uint256 tournamentId, uint256 carId) external view returns (uint256) {
        return tournaments[tournamentId].scores[carId];
    }
    
    function getTournamentScores(uint256 tournamentId) external view returns (
        uint256[] memory carIds,
        uint256[] memory scores
    ) {
        Tournament storage tournament = tournaments[tournamentId];
        uint256 participantCount = tournament.participants.length;
        
        carIds = new uint256[](participantCount);
        scores = new uint256[](participantCount);
        
        for (uint256 i = 0; i < participantCount; i++) {
            uint256 carId = tournament.participants[i];
            carIds[i] = carId;
            scores[i] = tournament.scores[carId];
        }
        
        return (carIds, scores);
    }
    
    function hasPlayerParticipated(uint256 tournamentId, address player) external view returns (bool) {
        return tournamentPlayerParticipated[tournamentId][player];
    }
    
    function getPlayerTournamentCars(uint256 tournamentId, address player) external view returns (uint256[] memory) {
        return tournamentPlayerCars[tournamentId][player];
    }
    
    function getPlayerTournamentResults(uint256 tournamentId, address player) external view returns (
        bool participated,
        uint256[] memory carIds,
        uint256[] memory scores,
        uint256 bestScore,
        uint256 bestRank
    ) {
        participated = tournamentPlayerParticipated[tournamentId][player];
        
        if (!participated) {
            return (false, new uint256[](0), new uint256[](0), 0, 0);
        }
        
        carIds = tournamentPlayerCars[tournamentId][player];
        scores = new uint256[](carIds.length);
        bestScore = 0;
        bestRank = 0;
        
        Tournament storage tournament = tournaments[tournamentId];
        
        for (uint256 i = 0; i < carIds.length; i++) {
            uint256 score = tournament.scores[carIds[i]];
            scores[i] = score;
            if (score > bestScore) {
                bestScore = score;
            }
        }
        
        if (bestScore > 0) {
            bestRank = 1;
            for (uint256 i = 0; i < tournament.participants.length; i++) {
                uint256 carId = tournament.participants[i];
                if (tournament.scores[carId] > bestScore) {
                    bestRank++;
                }
            }
        }
        
        return (participated, carIds, scores, bestScore, bestRank);
    }
    
    
    function _calculateChildStat(uint256 parent1Stat, uint256 parent2Stat, uint256 randomSeed, uint256 offset) internal pure returns (uint256) {
        uint256 average = (parent1Stat + parent2Stat) / 2;
        uint256 randomness = ((randomSeed >> (offset * 8)) % 21) - 10;
        uint256 result = average + randomness;
        return _min(100, _max(1, result));
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function setRacingContract(address _racingContract) external onlyOwner {
        racingContract = ISomniaRacing(_racingContract);
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function submitTournamentScore(uint256 tournamentId, uint256 carId, uint256 score) external {
        require(msg.sender == address(racingContract) || msg.sender == owner(), "Not authorized");
        
        Tournament storage tournament = tournaments[tournamentId];
        require(tournament.startTime > 0, "Tournament doesn't exist");
        require(block.timestamp >= tournament.startTime && block.timestamp <= tournament.endTime, "Tournament not active");
        require(tournament.hasEntered[carId], "Car not in tournament");
        
        if (score > tournament.scores[carId]) {
            tournament.scores[carId] = score;
        }
    }
    
    receive() external payable {
        totalTournamentPrizePool += msg.value;
    }
}