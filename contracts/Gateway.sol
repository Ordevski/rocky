// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

interface Oracle {
    function latestAnswer() external view returns (int256);

    function decimals() external view returns (int8);
}

/**
 * @title Gateway
 * @dev
 * @custom:dev-run-script ./scripts/deploy_with_ethers.ts
 */
contract Gateway {
    address private oracleAddress;

    constructor(address oracle) {
        oracleAddress = oracle;
    }

    function getEthAmount(int256 cents) public view returns (int256) {
        int256 currentUsdPrice = Oracle(oracleAddress).latestAnswer() * 1e10;
        // multiply by 10 cause the default number of decimals is 8, we wanna make sure we are keeping all values to 1e18

        int256 usdAmount = cents * 1e16;
        // set the number of decimals right on the number of cents we have here, make it stand on the 18th decimal as well

        int256 ethValue = (usdAmount * 1e18) / currentUsdPrice;
        return ethValue;
    }

    function getUsdAmount(int256 eth) public view returns (int256) {}

    function decimals() public view returns (int8) {
        return Oracle(oracleAddress).decimals();
    }
}
