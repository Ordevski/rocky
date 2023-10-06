// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library Convertor {
    function getPrice(
        AggregatorV3Interface aggregator
    ) internal view returns (uint256) {
        (, int256 answer, , , ) = aggregator.latestRoundData();
        return uint256(answer * 10000000000);
    }

    function getConversionRate(
        uint256 ethAmount,
        AggregatorV3Interface aggregator
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(aggregator);
        uint256 ethAmountInUsd = (ethPrice * ethAmount) / 1000000000000000000;

        return ethAmountInUsd;
    }

    function getEthAmount(
        uint256 usdAmount,
        AggregatorV3Interface aggregator
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(aggregator);

        uint256 ethAmount = (usdAmount * 1000000000000000000) / ethPrice;
        return ethAmount;
    }
}
