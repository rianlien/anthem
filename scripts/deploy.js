const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const SoulboundNFT = await hre.ethers.getContractFactory("SoulboundNFT");
  const soulboundNFT = await SoulboundNFT.deploy("EmotionCardSBT", "ECSBT"); // initialOwner引数を削除

  await soulboundNFT.waitForDeployment();

  console.log("SoulboundNFT deployed to:", soulboundNFT.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });