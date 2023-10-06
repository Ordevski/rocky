require("dotenv").config();
const { network } = require("hardhat");
const { verify } = require("../utils/verify");
const { developmentChains, networkConfig, VERIFICATION_BLOCK_CONFIRMATIONS, COUNTER } = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS;

    let priceFeedAddress;

    if(chainId == 31337){
        const ethUsdAggregator = await deployments.get("MockV3Aggregator");
        priceFeedAddress = ethUsdAggregator.address;
    } else{
        priceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    }
    log("Deploying Rocky and waiting for confirmations.");
    log("_____________________________________________________________________");

    const arguments = [COUNTER, priceFeedAddress];
    const rocky = await deploy("RockPaperScissors", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmation: waitBlockConfirmations
    });

    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        log("Verifying...");
        await verify(rocky.address, arguments);
    }
    log("_____________________________________________________________________");
}

module.exports.tags = ["all", "rocky"]