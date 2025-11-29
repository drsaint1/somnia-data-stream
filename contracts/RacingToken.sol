// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RacingToken is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    uint256 public constant INITIAL_SUPPLY = 100000 * 10**18;
    
    uint256 public raceRewardAmount = 10 * 10**18;
    uint256 public tournamentRewardMultiplier = 5;
    
    mapping(address => bool) public authorizedMinters;
    
    event RewardMinted(address indexed player, uint256 amount, string reason);
    event AuthorizedMinterAdded(address indexed minter);
    event AuthorizedMinterRemoved(address indexed minter);
    
    constructor() ERC20("Somnia FAST Token", "FAST") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    function addAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit AuthorizedMinterAdded(minter);
    }
    
    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit AuthorizedMinterRemoved(minter);
    }
    
    function mintRaceReward(address player, uint256 score, bool isTournament) 
        external 
        nonReentrant 
    {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        
        uint256 baseReward = raceRewardAmount;
        uint256 scoreBonus = (score / 100) * 10**18;
        uint256 totalReward = baseReward + scoreBonus;
        
        if (isTournament) {
            totalReward = totalReward * tournamentRewardMultiplier;
        }
        
        require(totalSupply() + totalReward <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(player, totalReward);
        
        string memory reason = isTournament ? "Tournament Race" : "Practice Race";
        emit RewardMinted(player, totalReward, reason);
    }
    
    function mintReward(address to, uint256 amount, string calldata reason) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit RewardMinted(to, amount, reason);
    }
    
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit RewardMinted(recipients[i], amounts[i], "Airdrop");
        }
    }
    
    function setRaceRewardAmount(uint256 newAmount) external onlyOwner {
        raceRewardAmount = newAmount;
    }
    
    function setTournamentRewardMultiplier(uint256 multiplier) external onlyOwner {
        tournamentRewardMultiplier = multiplier;
    }
    
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    function getRewardEstimate(uint256 score, bool isTournament) 
        external 
        view 
        returns (uint256) 
    {
        uint256 baseReward = raceRewardAmount;
        uint256 scoreBonus = (score / 100) * 10**18;
        uint256 totalReward = baseReward + scoreBonus;
        
        if (isTournament) {
            totalReward = totalReward * tournamentRewardMultiplier;
        }
        
        return totalReward;
    }
    
    function getDailyChallengeReward() external pure returns (uint256) {
        return 250 * 10**18;
    }
    
    function getDailyChallengeRewardCustom(uint256 rewardAmount) external pure returns (uint256) {
        return rewardAmount * 10**18;
    }
    
    function mint(address to, uint256 amount) external nonReentrant {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
        emit RewardMinted(to, amount, "Direct Mint");
    }
    
    function pause() external onlyOwner {
        }
    
    function unpause() external onlyOwner {
        }
}