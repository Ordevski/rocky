const { ethers } = require("hardhat");

const networkConfig = {
    31337: {
        name: "localhost",   
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
    },
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    }
};

const developmentChains = ["hardhat", "localhost"];

const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
const DECIMALS = "8";
const INITIAL_PRICE = "200000000000" // 2000 need to check up on this
const COUNTER = "0";

module.exports = { networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS, DECIMALS, INITIAL_PRICE, COUNTER };