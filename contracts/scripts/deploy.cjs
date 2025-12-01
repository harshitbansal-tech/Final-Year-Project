const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const Processor = await hre.ethers.getContractFactory("PaymentProcessorV2");
  const proc = await Processor.deploy();
  await proc.waitForDeployment();
  const addr = await proc.getAddress();
  console.log("Deployed PaymentProcessorV2:", addr);

  fs.writeFileSync(
    "../frontend/src/constants/PaymentProcessor-address.json",
    JSON.stringify({ sepolia: addr }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
