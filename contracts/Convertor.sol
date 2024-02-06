// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library Convertor {
    function decimals(
        AggregatorV3Interface aggregator
    ) internal view returns (uint8) {
        return aggregator.decimals();
    }

    function getPrice(
        AggregatorV3Interface aggregator
    ) internal view returns (uint256) {
        (, int256 answer, , , ) = aggregator.latestRoundData();
        // return uint256(answer * 10000000000);
        return uint256(answer * 1e18);
    }

    function getUsdAmount(
        uint256 ethAmount,
        AggregatorV3Interface aggregator
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(aggregator);

        uint256 amountInUsd = (ethPrice * ethAmount) / 1e18;
        return amountInUsd;
    }

    function getEthAmount(
        uint256 usdAmount,
        AggregatorV3Interface aggregator
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(aggregator);

        uint256 ethAmount = (usdAmount * 1e18) / ethPrice;
        return ethAmount;
    }
}
