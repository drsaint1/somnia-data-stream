// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IRacingToken {
    function mintRaceReward(address player, uint256 score, bool isTournament) external;
    function getRewardEstimate(uint256 score, bool isTournament) external view returns (uint256);
    function getDailyChallengeReward() external view returns (uint256);
    function getDailyChallengeRewardCustom(uint256 rewardAmount) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}




contract SomniaRacing is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
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
    
    struct RaceResult {
        address player;
        uint256 carId;
        uint256 score;
        uint256 distance;
        uint256 obstaclesAvoided;
        uint256 bonusCollected;
        uint256 timestamp;
        uint256 tournamentId; 
    }
    
    mapping(uint256 => RaceCar) public raceCars;
    mapping(address => uint256[]) public playerCars;
    mapping(address => uint256) public playerLevel;
    mapping(address => uint256) public playerXP;
    mapping(address => uint256) public playerEarnings;
    mapping(address => uint256) public playerBestScore;
    mapping(address => uint256) public lastDailyReward;
    mapping(address => uint256) public tokenBalance;
    mapping(address => uint256) public pendingTokens;
    
    uint256 public nextCarId = 1;
    uint256 public totalSupply = 0;
    address[] public allPlayers;
    mapping(address => bool) public isRegisteredPlayer;
    uint256 public dailyRewardAmount = 0.001 ether;
    uint256 public totalPrizePool = 0;
    
    IRacingToken public racingToken;
    address public tournamentContract;
    
    uint256 public constant STARTER_COST = 0.01 ether;
    uint256 public constant SPORT_COST = 0.05 ether;
    uint256 public constant RACING_BEAST_COST = 0.08 ether;
    uint256 public constant BREEDING_COST = 0.01 ether;
    uint256 public constant DAILY_REWARD = 0.001 ether;
    uint256 public constant XP_PER_LEVEL = 1000;
    uint256 public constant STAKE_REWARD_RATE = 100;
    
    event CarMinted(address indexed player, uint256 indexed carId, uint256 rarity);
    event RaceCompleted(address indexed player, uint256 indexed carId, uint256 score, uint256 xpGained);
    event CarStaked(uint256 indexed carId, address indexed owner);
    event CarUnstaked(uint256 indexed carId, address indexed owner, uint256 rewardXP);
    event DailyRewardClaimed(address indexed player, uint256 amount);
    event LevelUp(address indexed player, uint256 newLevel);
    event TokensEarned(address indexed player, uint256 amount, uint256 score);
    event TokensMinted(address indexed player, uint256 amount);
    
    constructor() ERC721("Somnia Racing Cars", "ERC") Ownable(msg.sender) {
        _registerPlayer(msg.sender);
    }
    
  
    
    
    function _registerPlayer(address player) internal {
        if (!isRegisteredPlayer[player]) {
            allPlayers.push(player);
            isRegisteredPlayer[player] = true;
        }
    }
    
    function _updatePlayerBestScore(address player, uint256 score) internal {
        if (score > playerBestScore[player]) {
            playerBestScore[player] = score;
        }
    }
    
   
    
    function mintStarterCar() external payable whenNotPaused {
        require(msg.value >= STARTER_COST, "Insufficient payment");
        
        _registerPlayer(msg.sender);
        
        uint256 carId = nextCarId++;
        totalSupply++;
        
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, carId)));
        uint256 baseSpeed = 30 + (seed % 20);     
        uint256 baseHandling = 35 + ((seed >> 8) % 20);   
        uint256 baseAccel = 40 + ((seed >> 16) % 15);    
        uint256 rarity = _calculateRarity(seed);
        
        raceCars[carId] = RaceCar({
            speed: baseSpeed,
            handling: baseHandling,
            acceleration: baseAccel,
            rarity: rarity,
            experience: 0,
            wins: 0,
            races: 0,
            generation: 1,
            birthTime: block.timestamp,
            isStaked: false,
            stakedTime: 0,
            name: "Starter Racer"
        });
        
        playerCars[msg.sender].push(carId);
        _mint(msg.sender, carId);
        _setTokenURI(carId, _generateTokenURI(raceCars[carId], carId));
        
        emit CarMinted(msg.sender, carId, rarity);
    }
    
    function mintSportCar() external payable whenNotPaused {
        require(msg.value >= SPORT_COST, "Insufficient payment");
        
        _registerPlayer(msg.sender);
        
        uint256 carId = nextCarId++;
        totalSupply++;
        
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, carId)));
        uint256 baseSpeed = 50 + (seed % 25);      
        uint256 baseHandling = 45 + ((seed >> 8) % 25);   
        uint256 baseAccel = 55 + ((seed >> 16) % 20);     
        uint256 rarity = _calculatePremiumRarity(seed);
        
        raceCars[carId] = RaceCar({
            speed: baseSpeed,
            handling: baseHandling,
            acceleration: baseAccel,
            rarity: rarity,
            experience: 0,
            wins: 0,
            races: 0,
            generation: 1,
            birthTime: block.timestamp,
            isStaked: false,
            stakedTime: 0,
            name: "Sport Car"
        });
        
        playerCars[msg.sender].push(carId);
        _mint(msg.sender, carId);
        _setTokenURI(carId, _generateTokenURI(raceCars[carId], carId));
        
        emit CarMinted(msg.sender, carId, rarity);
    }
    
    function mintRacingBeast() external payable whenNotPaused {
        require(msg.value >= RACING_BEAST_COST, "Insufficient payment");
        
        _registerPlayer(msg.sender);
        
        uint256 carId = nextCarId++;
        totalSupply++;
        
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, carId)));
        uint256 baseSpeed = 70 + (seed % 25);      
        uint256 baseHandling = 60 + ((seed >> 8) % 25);   
        uint256 baseAccel = 75 + ((seed >> 16) % 20);     
        uint256 rarity = _calculatePremiumRarity(seed);
        
        raceCars[carId] = RaceCar({
            speed: baseSpeed,
            handling: baseHandling,
            acceleration: baseAccel,
            rarity: rarity,
            experience: 0,
            wins: 0,
            races: 0,
            generation: 1,
            birthTime: block.timestamp,
            isStaked: false,
            stakedTime: 0,
            name: "Racing Beast"
        });
        
        playerCars[msg.sender].push(carId);
        _mint(msg.sender, carId);
        _setTokenURI(carId, _generateTokenURI(raceCars[carId], carId));
        
        emit CarMinted(msg.sender, carId, rarity);
    }
    
   
    function mintPremiumCar() external payable whenNotPaused {
        require(msg.value >= SPORT_COST, "Insufficient payment");
        
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nextCarId)));
        
        if (seed % 2 == 0) {
            _registerPlayer(msg.sender);
            
            uint256 carId = nextCarId++;
            totalSupply++;
            
            uint256 baseSpeed = 50 + (seed % 25);
            uint256 baseHandling = 45 + ((seed >> 8) % 25);
            uint256 baseAccel = 55 + ((seed >> 16) % 20);
            uint256 rarity = _calculatePremiumRarity(seed);
            
            raceCars[carId] = RaceCar({
                speed: baseSpeed,
                handling: baseHandling,
                acceleration: baseAccel,
                rarity: rarity,
                experience: 0,
                wins: 0,
                races: 0,
                generation: 1,
                birthTime: block.timestamp,
                isStaked: false,
                stakedTime: 0,
                name: "Sport Car"
            });
            
            playerCars[msg.sender].push(carId);
            _mint(msg.sender, carId);
            _setTokenURI(carId, _generateTokenURI(raceCars[carId], carId));
            
            emit CarMinted(msg.sender, carId, rarity);
        } else {
            require(msg.value >= RACING_BEAST_COST, "Insufficient payment for Racing Beast upgrade");
            
            _registerPlayer(msg.sender);
            
            uint256 carId = nextCarId++;
            totalSupply++;
            
            uint256 baseSpeed = 70 + (seed % 25);
            uint256 baseHandling = 60 + ((seed >> 8) % 25);
            uint256 baseAccel = 75 + ((seed >> 16) % 20);
            uint256 rarity = _calculatePremiumRarity(seed);
            
            raceCars[carId] = RaceCar({
                speed: baseSpeed,
                handling: baseHandling,
                acceleration: baseAccel,
                rarity: rarity,
                experience: 0,
                wins: 0,
                races: 0,
                generation: 1,
                birthTime: block.timestamp,
                isStaked: false,
                stakedTime: 0,
                name: "Racing Beast"
            });
            
            playerCars[msg.sender].push(carId);
            _mint(msg.sender, carId);
            _setTokenURI(carId, _generateTokenURI(raceCars[carId], carId));
            
            emit CarMinted(msg.sender, carId, rarity);
        }
    }
    
   

    function submitRaceResult(
        address player,
        uint256 carId,
        uint256 score,
        uint256 distance,
        uint256 obstaclesAvoided,
        uint256 bonusCollected,
        uint256 tournamentId
    ) external whenNotPaused {
        _submitRaceResult(player, carId, score, distance, obstaclesAvoided, bonusCollected, tournamentId, false);
    }
    
    function submitRaceResultWithTokens(
        address player,
        uint256 carId,
        uint256 score,
        uint256 distance,
        uint256 obstaclesAvoided,
        uint256 bonusCollected,
        uint256 tournamentId,
        bool mintTokens
    ) external whenNotPaused {
        _submitRaceResult(player, carId, score, distance, obstaclesAvoided, bonusCollected, tournamentId, mintTokens);
    }
    
    function _submitRaceResult(
        address player,
        uint256 carId,
        uint256 score,
        uint256 distance,
        uint256 obstaclesAvoided,
        uint256 bonusCollected,
        uint256 tournamentId,
        bool mintTokens
    ) internal {
        require(ownerOf(carId) == player, "Not car owner");
        require(!raceCars[carId].isStaked, "Car is staked");
        
        raceCars[carId].races++;
        raceCars[carId].experience += score / 100;
        
        _registerPlayer(player);
        _updatePlayerBestScore(player, score);
        
        uint256 xpGained = score / 10;
        playerXP[player] += xpGained;
        
        uint256 newLevel = (playerXP[player] / XP_PER_LEVEL) + 1;
        if (newLevel > playerLevel[player]) {
            playerLevel[player] = newLevel;
            emit LevelUp(player, newLevel);
        }
        
       
        if (address(racingToken) != address(0)) {
            
            if (tournamentId >= 1000) {
                try racingToken.getDailyChallengeRewardCustom(tournamentId - 1000) returns (uint256 tokenAmount) {
                    racingToken.mint(player, tokenAmount);
                    tokenBalance[player] += tokenAmount;
                    emit TokensEarned(player, tokenAmount, score);
                } catch {
                  
                    try racingToken.mintRaceReward(player, score, true) {
                        uint256 rewardAmount = racingToken.getRewardEstimate(score, true);
                        tokenBalance[player] += rewardAmount;
                        emit TokensEarned(player, rewardAmount, score);
                    } catch {
                        
                    }
                }
            } else {
               
                try racingToken.mintRaceReward(player, score, tournamentId > 0) {
                    uint256 rewardAmount = racingToken.getRewardEstimate(score, tournamentId > 0);
                    tokenBalance[player] += rewardAmount;
                    emit TokensEarned(player, rewardAmount, score);
                } catch {
                    
                }
            }
        }
        
        
        if (score > 15000) { 
            raceCars[carId].wins++;
            
            uint256 earnings = score * 0.001 ether / 1000; 
            playerEarnings[player] += earnings;
        }
        
        emit RaceCompleted(player, carId, score, xpGained);
    }
    
   
    
    function stakeCar(uint256 carId) external whenNotPaused {
        require(ownerOf(carId) == msg.sender, "Not car owner");
        require(!raceCars[carId].isStaked, "Car already staked");
        
        raceCars[carId].isStaked = true;
        raceCars[carId].stakedTime = block.timestamp;
        
        emit CarStaked(carId, msg.sender);
    }
    
    function unstakeCar(uint256 carId) external whenNotPaused {
        require(ownerOf(carId) == msg.sender, "Not car owner");
        require(raceCars[carId].isStaked, "Car not staked");
        
        uint256 stakingDuration = block.timestamp - raceCars[carId].stakedTime;
        uint256 rewardXP = (stakingDuration * STAKE_REWARD_RATE) / 1 days;
        
        raceCars[carId].isStaked = false;
        raceCars[carId].stakedTime = 0;
        raceCars[carId].experience += rewardXP;
        playerXP[msg.sender] += rewardXP;
        
        emit CarUnstaked(carId, msg.sender, rewardXP);
    }
    
    
    
    
    function claimDailyReward() external whenNotPaused nonReentrant {
        require(isRegisteredPlayer[msg.sender], "Not a registered player");
        require(block.timestamp >= lastDailyReward[msg.sender] + 1 days, "Daily reward already claimed");
        
        lastDailyReward[msg.sender] = block.timestamp;
        
        payable(msg.sender).transfer(dailyRewardAmount);
        
        
        if (address(racingToken) != address(0)) {
            try racingToken.getDailyChallengeReward() returns (uint256 tokenAmount) {
                racingToken.mint(msg.sender, tokenAmount);
                tokenBalance[msg.sender] += tokenAmount;
                emit TokensMinted(msg.sender, tokenAmount);
            } catch {
                
            }
        }
        
        emit DailyRewardClaimed(msg.sender, dailyRewardAmount);
    }
    
   

    
    function getPlayerCars(address player) external view returns (uint256[] memory) {
        return playerCars[player];
    }
    
    function getCarDetails(uint256 carId) external view returns (RaceCar memory) {
        return raceCars[carId];
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 level,
        uint256 totalXP,
        uint256 earnings,
        uint256 carCount,
        uint256 lastReward
    ) {
        return (
            playerLevel[player],
            playerXP[player],
            playerEarnings[player],
            playerCars[player].length,
            lastDailyReward[player]
        );
    }
    
    function getLeaderboard(uint256 limit) external view returns (
        address[] memory players,
        uint256[] memory scores,
        uint256[] memory levels,
        uint256[] memory totalXPs,
        uint256[] memory carCounts
    ) {
        uint256 playerCount = allPlayers.length;
        if (playerCount == 0) {
            return (new address[](0), new uint256[](0), new uint256[](0), new uint256[](0), new uint256[](0));
        }
        
        
        address[] memory tempPlayers = new address[](playerCount);
        uint256[] memory tempScores = new uint256[](playerCount);
        uint256[] memory tempLevels = new uint256[](playerCount);
        uint256[] memory tempXPs = new uint256[](playerCount);
        uint256[] memory tempCarCounts = new uint256[](playerCount);
        
        
        for (uint256 i = 0; i < playerCount; i++) {
            address player = allPlayers[i];
            tempPlayers[i] = player;
            tempScores[i] = playerBestScore[player];
            tempLevels[i] = playerLevel[player];
            tempXPs[i] = playerXP[player];
            tempCarCounts[i] = playerCars[player].length;
        }
        
       
        for (uint256 i = 1; i < playerCount; i++) {
            uint256 currentScore = tempScores[i];
            address currentPlayer = tempPlayers[i];
            uint256 currentLevel = tempLevels[i];
            uint256 currentXP = tempXPs[i];
            uint256 currentCarCount = tempCarCounts[i];
            
            uint256 j = i;
            while (j > 0 && tempScores[j - 1] < currentScore) {
                tempScores[j] = tempScores[j - 1];
                tempPlayers[j] = tempPlayers[j - 1];
                tempLevels[j] = tempLevels[j - 1];
                tempXPs[j] = tempXPs[j - 1];
                tempCarCounts[j] = tempCarCounts[j - 1];
                j--;
            }
            
            tempScores[j] = currentScore;
            tempPlayers[j] = currentPlayer;
            tempLevels[j] = currentLevel;
            tempXPs[j] = currentXP;
            tempCarCounts[j] = currentCarCount;
        }
        
        
        uint256 resultCount = playerCount < limit ? playerCount : limit;
        players = new address[](resultCount);
        scores = new uint256[](resultCount);
        levels = new uint256[](resultCount);
        totalXPs = new uint256[](resultCount);
        carCounts = new uint256[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            players[i] = tempPlayers[i];
            scores[i] = tempScores[i];
            levels[i] = tempLevels[i];
            totalXPs[i] = tempXPs[i];
            carCounts[i] = tempCarCounts[i];
        }
        
        return (players, scores, levels, totalXPs, carCounts);
    }
    
    function getAllPlayers() external view returns (address[] memory) {
        return allPlayers;
    }
    
    function getTotalPlayers() external view returns (uint256) {
        return allPlayers.length;
    }
    
    function getPlayerRank(address player) external view returns (uint256) {
        uint256 playerScore = playerBestScore[player];
        uint256 rank = 1;
        
        for (uint256 i = 0; i < allPlayers.length; i++) {
            if (playerBestScore[allPlayers[i]] > playerScore) {
                rank++;
            }
        }
        
        return rank;
    }
    
    function getTokenBalance(address player) external view returns (uint256) {
        return tokenBalance[player];
    }
    
    function getPendingTokens(address player) external view returns (uint256) {
        return pendingTokens[player];
    }
    
    function claimRaceTokens(address player) external whenNotPaused {
        uint256 amount = pendingTokens[player];
        require(amount > 0, "No pending tokens");
        
        pendingTokens[player] = 0;
        tokenBalance[player] += amount;
        
        emit TokensMinted(player, amount);
    }
    
   
    
    
    function _calculateRarity(uint256 seed) internal pure returns (uint256) {
        uint256 random = seed % 100;
        if (random < 60) return 1;    
        if (random < 80) return 2;      
        if (random < 93) return 3;      
        if (random < 99) return 4;      
        return 5;                      
    }
    
    function _calculatePremiumRarity(uint256 seed) internal pure returns (uint256) {
        uint256 random = seed % 100;
        if (random < 30) return 2;     
        if (random < 60) return 3;      
        if (random < 85) return 4;      
        return 5;                       
    }
    
    function _generateTokenURI(RaceCar memory car, uint256 tokenId) internal pure returns (string memory) {
        
        return string(abi.encodePacked("https://api.somniaracing.com/metadata/", _toString(tokenId)));
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
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        uint256 reserveAmount = dailyRewardAmount * 100;
        uint256 withdrawAmount = balance > reserveAmount ? balance - reserveAmount : 0;
        
        require(withdrawAmount > 0, "No excess funds to withdraw");
        payable(owner()).transfer(withdrawAmount);
    }
    
    function setDailyReward(uint256 newReward) external onlyOwner {
        dailyRewardAmount = newReward;
    }
    
    function setRacingToken(address _racingToken) external onlyOwner {
        racingToken = IRacingToken(_racingToken);
    }
    
    function setTournamentContract(address _tournamentContract) external onlyOwner {
        tournamentContract = _tournamentContract;
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {
        totalPrizePool += msg.value;
    }
}