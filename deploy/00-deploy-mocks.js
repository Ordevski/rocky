const { network } = require("hardhat");
const { DECIMALS, INITIAL_PRICE } = require("../helper-hardhat-config");

module.exports = async({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    if(chainId == 31337){
        log("Local network detected. Deploying mocks.");
        await deploy("MockV3Aggregator", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        });

        log("Mocks deployed.");
        log("You are deploying to a local network, you'll need a local network running to interact.");
        log("Please run `npx hardhat console` to interact with deployed contracts.");
        log("_____________________________________________________________________");
    }
}
module.exports.tags = ["all", "mocks"];