// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Convertor.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

error RockPaperScissors__CannotAfford(
    uint256 deposit,
    uint256 amountReserved,
    address player
);
error RockPaperScissors__ChallengeCannotBeClosed(
    uint256 challengeId,
    address boldGuy
);
error RockPaperScissors__ChallengeDoesNotExist(
    uint256 challengeId,
    address boldGuy
);
error RockPaperScissors__ChallengeCannotBeAccepted(
    uint256 challengeId,
    address boldGuy
);
error RockPaperScissors__WithdrawAmountCannotExceedDeposit(
    address boldGuy,
    uint256 depositAmount,
    uint256 withdrawAmount
);
error RockPaperScissors__UnreserveFundsToWithdrawAmount(
    address withdrawer,
    uint256 withdrawAmount
);
error RockPaperScissors__WithdrawFailed(address withdrawer);

contract RockPaperScissors is ReentrancyGuard {
    enum Hand {
        Empty,
        Rock,
        Paper,
        Scissors
    }

    enum Outcome {
        None,
        Draw,
        Challenger,
        Opponent
    }

    using Convertor for uint256;

    uint256 public constant MINIMUM_BET_USD = 5;
    uint256 public constant MINIMUM_DEPOSIT_USD = 5;
    uint256 public constant CHALLENGE_OPEN_TAX_USD = 1; // change this

    uint256 private challengeCounter;
    AggregatorV3Interface private aggregator;

    mapping(address => uint256) private deposit;
    mapping(address => uint256) private reservedFunds;
    mapping(uint256 => address[]) private challengeIdToPlayers;
    mapping(uint256 => uint256) private challengeIdToAmount;

    event DepositMade(address indexed depositor, uint256 amount);

    event WithdrawalMade(address indexed withdrawer, uint256 amount);

    // possibly add a slot for the opponent hand and fill it out later
    event ChallengeOpened(
        uint256 indexed challengeId,
        address indexed challenger,
        address indexed opponent,
        uint256 amount,
        uint256 hand
    );

    event ChallengeClosed(uint256 challengeId, address closer);

    event ChallengeAccepted(uint256 challengeId, uint256 hand);

    event ChallengedPlaysHand(uint256 challengeId, uint256 hand);

    modifier isAmountAboveMinimum(uint256 amount, uint256 givenMinimum) {
        if (amount.getConversionRate(aggregator) < givenMinimum) {
            revert("Not enough ETH.");
        }
        _;
    }

    modifier canAfford(uint256 amount) {
        uint256 fundsReserved = getAmountActive(msg.sender);
        uint256 depositMade = getDeposit(msg.sender);

        if (fundsReserved + amount > depositMade) {
            revert RockPaperScissors__CannotAfford(
                depositMade,
                fundsReserved + amount,
                msg.sender
            );
        }
        _;
    }

    modifier challengeExists(uint256 challengeId) {
        if ((getPlayers(challengeId)).length == 0) {
            revert RockPaperScissors__ChallengeDoesNotExist(
                challengeId,
                msg.sender
            );
        }
        _;
    }

    constructor(uint256 counter, address priceFeed) {
        challengeCounter = counter;
        aggregator = AggregatorV3Interface(priceFeed);
    }

    function registerAndDeposit()
        public
        payable
        nonReentrant
        isAmountAboveMinimum(msg.value, MINIMUM_DEPOSIT_USD)
    {
        deposit[msg.sender] = getDeposit(msg.sender) + msg.value;

        emit DepositMade(msg.sender, msg.value);
    }

    function openChallenge(
        address opponent,
        uint256 amount,
        Hand hand
    ) public isAmountAboveMinimum(amount, MINIMUM_BET_USD) canAfford(amount) {
        challengeIdToAmount[challengeCounter] = amount;
        challengeIdToPlayers[challengeCounter] = [msg.sender, opponent];

        reservedFunds[msg.sender] = getAmountActive(msg.sender) + amount;

        emit ChallengeOpened(
            challengeCounter,
            msg.sender,
            opponent,
            amount,
            uint(hand)
        );

        challengeCounter++;
    }

    function acceptChallenge(
        uint256 challengeId,
        uint256 hand
    )
        public
        challengeExists(challengeId)
        canAfford(challengeIdToAmount[challengeId])
    {
        address challenged = challengeIdToPlayers[challengeId][1];
        uint256 amount = challengeIdToAmount[challengeId];

        if (msg.sender != challenged) {
            revert RockPaperScissors__ChallengeCannotBeAccepted(
                challengeId,
                msg.sender
            );
        }

        reservedFunds[challenged] = getAmountActive(challenged) + amount;

        emit ChallengeAccepted(challengeId, hand);
    }

    function closeChallenge(
        uint256 challengeId
    ) public challengeExists(challengeId) {
        address[] memory players = challengeIdToPlayers[challengeId];

        if (msg.sender != players[0] && msg.sender != players[1]) {
            revert RockPaperScissors__ChallengeCannotBeClosed(
                challengeId,
                msg.sender
            );
        }
        address challenger = players[0];

        reservedFunds[challenger] =
            getAmountActive(challenger) -
            challengeIdToAmount[challengeId];
        deposit[challenger] = getDeposit(challenger) - getEthAmountOfTax(); // tax

        emit ChallengeClosed(challengeId, msg.sender);
        delete challengeIdToPlayers[challengeId]; // ?
    }

    function gameCommenced(
        uint256 challengeId,
        Hand challengerHand,
        Hand challengedHand
    ) public challengeExists(challengeId) {
        uint256 amount = challengeIdToAmount[challengeId];
        address challenger = challengeIdToPlayers[challengeId][0];
        address challenged = challengeIdToPlayers[challengeId][1];

        Outcome outcome = compareHands(challengerHand, challengedHand);

        if (outcome == Outcome.Challenger) {
            allocateWinnings(challenger, challenged, amount);
        } else if (outcome == Outcome.Opponent) {
            allocateWinnings(challenged, challenger, amount);
        }

        reservedFunds[challenger] = getAmountActive(challenger) - amount;
        reservedFunds[challenged] = getAmountActive(challenged) - amount;

        delete challengeIdToPlayers[challengeId];
        delete challengeIdToAmount[challengeId];
    }

    function compareHands(
        Hand challengerHand,
        Hand opponentHand
    ) private pure returns (Outcome) {
        if (challengerHand == opponentHand) {
            return Outcome.Draw;
        } else if (
            (challengerHand == Hand.Rock && opponentHand == Hand.Paper) ||
            (challengerHand == Hand.Scissors && opponentHand == Hand.Rock) ||
            (challengerHand == Hand.Paper && opponentHand == Hand.Scissors)
        ) {
            return Outcome.Opponent;
        } else {
            return Outcome.Challenger;
        }
    }

    function allocateWinnings(
        address winner,
        address loser,
        uint256 amount
    ) private {
        deposit[winner] = deposit[winner] + ((amount * 90) / 100);
        deposit[loser] = deposit[loser] - amount;
    }

    function withdraw(uint256 withdrawAmount) public payable nonReentrant {
        uint256 depositMade = deposit[msg.sender];

        if (withdrawAmount > depositMade) {
            revert RockPaperScissors__WithdrawAmountCannotExceedDeposit(
                msg.sender,
                depositMade,
                withdrawAmount
            );
        }
        if (withdrawAmount > depositMade - reservedFunds[msg.sender]) {
            revert RockPaperScissors__UnreserveFundsToWithdrawAmount(
                msg.sender,
                withdrawAmount
            );
        }

        deposit[msg.sender] = depositMade - withdrawAmount;
        (bool callSuccess, ) = payable(msg.sender).call{value: withdrawAmount}(
            ""
        );

        if (!callSuccess) {
            revert RockPaperScissors__WithdrawFailed(msg.sender);
        }
        emit WithdrawalMade(msg.sender, withdrawAmount);
    }

    // function challengedPlaysTheirHand(uint256 challengeId, Hand hand) private {
    //     emit ChallengedPlaysHand(challengeId, uint(hand));
    // }

    function getDeposit(address player) public view returns (uint256) {
        return deposit[player];
    }

    function getAmountActive(address player) public view returns (uint256) {
        return reservedFunds[player];
    }

    function getPlayers(
        uint256 challengeId
    ) public view returns (address[] memory) {
        return challengeIdToPlayers[challengeId];
    }

    function getChallengeAmount(
        uint256 challengeId
    ) public view returns (uint256) {
        return challengeIdToAmount[challengeId];
    }

    function getEthAmountOfTax() public view returns (uint256) {
        return CHALLENGE_OPEN_TAX_USD.getEthAmount(aggregator);
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return aggregator;
    }
}
