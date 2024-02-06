const { ethers } = require("hardhat");

const networkConfig = {
    31337: {
        name: "localhost",   
        latestAnswer: 220958410408
    },
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    }
};

const developmentChains = ["hardhat", "localhost"];

const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
const DECIMALS = "8";
const INITIAL_PRICE = "200000000000" // price of $1
const COUNTER = "0";

module.exports = { networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS, DECIMALS, INITIAL_PRICE, COUNTER };