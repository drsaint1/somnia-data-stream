import hre from "hardhat";
import fs from "fs";
const { ethers } = hre;

async function main() {
  console.log(" Deploying All Contracts to Somnia Testnet\n");

  const [deployer] = await ethers.getSigners();
  console.log(" Deploying with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(" Account balance:", ethers.formatEther(balance), "ETH\n");

  try {
    console.log(" Deploying RacingToken contract...");
    const RacingToken = await ethers.getContractFactory("RacingToken");

    const tokenContract = await RacingToken.deploy();
    await tokenContract.waitForDeployment();

    const tokenAddress = await tokenContract.getAddress();
    console.log("✅ RacingToken deployed to:", tokenAddress);

    console.log(" Deploying SomniaRacing contract...");
    const SomniaRacing = await ethers.getContractFactory("SomniaRacing");

    const racingContract = await SomniaRacing.deploy();
    await racingContract.waitForDeployment();

    const racingAddress = await racingContract.getAddress();
    console.log("✅ SomniaRacing deployed to:", racingAddress);

    console.log("\n Deploying SomniaTournaments contract...");
    const SomniaTournaments = await ethers.getContractFactory(
      "SomniaTournaments"
    );

    const tournamentsContract = await SomniaTournaments.deploy(
      racingAddress
    );
    await tournamentsContract.waitForDeployment();

    const tournamentsAddress = await tournamentsContract.getAddress();
    console.log("✅ SomniaTournaments deployed to:", tournamentsAddress);

    console.log("\n🔗 Linking contracts...");

    console.log("🔄 Setting racing token address...");
    const setTokenTx = await racingContract.setRacingToken(tokenAddress);
    await setTokenTx.wait();
    console.log("✅ Token contract linked to Racing contract");

    console.log("🔄 Authorizing racing contract as token minter...");
    const setMinterTx = await tokenContract.addAuthorizedMinter(racingAddress);
    await setMinterTx.wait();
    console.log("✅ Racing contract authorized to mint tokens");

    console.log("🔄 Linking tournament contract...");
    try {
      const setTournamentTx = await racingContract.setTournamentContract(
        tournamentsAddress
      );
      await setTournamentTx.wait();
      console.log("✅ Tournament contract linked to Racing contract");
    } catch (error) {
      console.log(
        "ℹ️  Tournament contract linking skipped (function may not exist)"
      );
    }

    console.log("\n Complete Deployment Summary:");

    console.log(" RacingToken Contract:", tokenAddress);
    console.log(" SomniaRacing Contract:", racingAddress);
    console.log(" SomniaTournaments Contract:", tournamentsAddress);

    console.log("\n Contract Features:");

    console.log(" RacingToken (RACE):");
    console.log("   • ERC20 token for rewards");
    console.log("   • Minting controlled by Racing contract");
    console.log("   • Player token balances");
    console.log("   • Token rewards for racing");

    console.log("\n  SomniaRacing:");
    console.log("   • Car minting (Starter, Sport, Racing Beast)");
    console.log("   • Race result submission with token rewards");
    console.log("   • Staking system (100 XP/day)");
    console.log("   • Daily rewards & challenges");
    console.log("   • Player stats & global leaderboard");
    console.log("   • Token integration for gameplay rewards");

    console.log("\n SomniaTournaments:");
    console.log("   • Tournament creation & management");
    console.log("   • Entry fee collection");
    console.log("   • Prize pool distribution");
    console.log("   • Tournament leaderboards");
    console.log("   • Multi-player competition");

    console.log("\n🔄 Updating .env file with new contract addresses...");

    let envContent = "";
    try {
      envContent = fs.readFileSync(".env", "utf8");
    } catch (error) {
      console.log("ℹ️  .env file not found, creating new one...");
    }

    const updateEnvVar = (content, key, value) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`);
      } else {
        return content + `\n${key}=${value}`;
      }
    };

    envContent = updateEnvVar(
      envContent,
      "VITE_RACING_CONTRACT_ADDRESS",
      racingAddress
    );
    envContent = updateEnvVar(
      envContent,
      "VITE_RACING_TOKEN_ADDRESS",
      tokenAddress
    );
    envContent = updateEnvVar(
      envContent,
      "VITE_TOURNAMENTS_CONTRACT_ADDRESS",
      tournamentsAddress
    );

    // Write updated .env file
    fs.writeFileSync(".env", envContent.trim() + "\n");
    console.log("✅ .env file updated with new contract addresses");

    console.log("\n💡 Contract addresses updated in .env:");
    console.log(`   • RACING_CONTRACT_ADDRESS = "${racingAddress}"`);
    console.log(`   • RACING_TOKEN_ADDRESS = "${tokenAddress}"`);
    console.log(`   • TOURNAMENTS_CONTRACT_ADDRESS = "${tournamentsAddress}"`);

    const deploymentInfo = {
      network: "somniaTestnet",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      deployerBalance: ethers.formatEther(balance),
      contracts: {
        RacingToken: {
          address: tokenAddress,
          type: "ERC20 Token",
          features: ["rewards", "gameplay", "tokenomics"],
        },
        SomniaRacing: {
          address: racingAddress,
          type: "Main Game Contract",
          features: [
            "minting",
            "racing",
            "staking",
            "dailyRewards",
            "leaderboard",
            "tokenRewards",
          ],
        },
        SomniaTournaments: {
          address: tournamentsAddress,
          type: "Tournament System",
          features: [
            "tournaments",
            "entryFees",
            "prizeDistribution",
            "competition",
          ],
        },
      },
      contractLinks: {
        "Racing -> Tournaments": tournamentsAddress,
        "Racing -> Token": tokenAddress,
        "Token -> Racing": racingAddress,
      },
      gasUsed: {
        token: "Estimated ~1-2M gas",
        racing: "Estimated ~3-4M gas",
        tournaments: "Estimated ~2-3M gas",
        total: "Estimated ~6-8M gas",
      },
    };

    fs.writeFileSync(
      "deployment-split-contracts.json",
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(
      "\n💾 Deployment info saved to: deployment-split-contracts.json"
    );
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log(
      "\n ALL CONTRACTS DEPLOYED TO SOMNIA TESTNET SUCCESSFULLY! "
    );
    console.log("Ready for complete racing game experience! 🏎️");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
