const { ethers, getNamedAccounts, network, deployments } = require("hardhat")
const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RockPaperScissors", function () {
        let rockPaperScissors, deployer, challenger, challenged, playerThree;
        let mockV3Aggregator, ethToUsdExchangeRate; 

        beforeEach(async () => {

            // const rocky = await ethers.getContractFactory("RockPaperScissors");
            // rockPaperScissors = await rocky.deploy();
            // await rockPaperScissors.deployed();

            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);

            rockPaperScissors = await ethers.getContract("RockPaperScissors", deployer);
            mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);

            [, answer, , , ]  = await mockV3Aggregator.latestRoundData();
            ethToUsdExchangeRate = answer;

            const signers = await ethers.getSigners();
            const addresses = await Promise.all(signers.map(async (signer) => {
                return await signer.getAddress();
            }));   

            [deployer, challenger, challenged, playerThree] = [addresses[0], addresses[1], addresses[2], addresses[3]];
            
        });

        describe("constructor", function () {
            it("sets the aggregator addresses correctly", async () => {
                const response = await rockPaperScissors.getPriceFeed()
                assert.equal(response, mockV3Aggregator.address)
            })
        });

        describe("registerAndDeposit", async function (){
            let minimumDepositUsd, minimumDepositEth
            
            beforeEach(async () => {
                minimumDepositUsd = 5;
                minimumDepositEth = ethers.utils.parseUnits("0.0025", 18);
                console.log("Minimum Deposit USD:", minimumDepositUsd.toString());
                console.log("Minimum Deposit ETH:", minimumDepositEth.toString());
                console.log("Exchange rate is: ", ethToUsdExchangeRate.toString());
            });
            

            it("should allow a user to register and deposit", async function () {
                const initialDeposit = await rockPaperScissors.getDeposit(challenger);                    

                await rockPaperScissors.connect(await ethers.getSigner(challenger)).registerAndDeposit({ value: minimumDepositEth });

                const updatedDeposit = await rockPaperScissors.getDeposit(challenger);
                expect(updatedDeposit).to.equal(initialDeposit.add(minimumDepositEth));
            });

            it("should not allow a user to register and deposit without enough ether", async function () {
                const lessThanMinimumDeposit = ethers.utils.parseUnits("0.002", 18);
            
                await expect(rockPaperScissors.connect(await ethers.getSigner(challenger))
                    .registerAndDeposit({ value: lessThanMinimumDeposit })).to.be.reverted;
            
                const updatedDeposit = await rockPaperScissors.getDeposit(challenger);   // Check that the deposit was not updated
                expect(updatedDeposit).to.equal(0);
            });
        });

        // describe("openChallenge", async function (){
        //     let hand, owner, opponent, challengeId;
        //     beforeEach(async () => {
        //         const signers = await ethers.getSigners();

        //         // Get addresses of all signers
        //         const addresses = await Promise.all(signers.map(async (signer) => {
        //             return await signer.getAddress();
        //         }));

        //         owner = addresses[0];
        //         opponent = addresses[2];            
        //         opponentTwo = addresses[3];
        //         hand = 1;      
        //     });

        //     it("should open a challenge successfully when the challenger has enough deposit and the amount is above the minimum", async function () {
        //         await rockPaperScissors.registerAndDeposit(ethers.utils.parseEther("1.2"));
        //         const amount = ethers.utils.parseEther("1.1");

        //         await rockPaperScissors.openChallenge(opponent, amount, hand); // {signer: owner}

        //         const challengeAmount = await rockPaperScissors.getChallengeAmount(0);
        //         const activeAmountOfDeposit = await rockPaperScissors.getAmountActive(owner);

        //         expect(amount).to.equal(challengeAmount);
        //         expect(activeAmountOfDeposit).to.equal(amount);
                
        //     });

        //     it("should revert if reserved funds have exceeded amount of deposit", async function (){
        //         await rockPaperScissors.registerAndDeposit(ethers.utils.parseEther("2"));
        //         const amount = ethers.utils.parseEther("1.1");

        //         await rockPaperScissors.openChallenge(opponent, amount, hand);

        //         await expect(rockPaperScissors.openChallenge(opponent, amount, hand))
        //         .to.be.revertedWith("RockPaperScissors__CannotAfford");
        //     });

        //     it("should revert if challenge amount is below minimum", async function (){
        //         await rockPaperScissors.registerAndDeposit(ethers.utils.parseEther("2"));
        //         const amount = ethers.utils.parseEther("0.00011");  // 0.00011 is minimum

        //         await expect(rockPaperScissors.openChallenge(opponent, amount, hand))
        //         .to.be.revertedWith("Not enough ETH.");
        //     });

        //     it("should update state variables when different opponents are challenged", async function (){
        //         await rockPaperScissors.registerAndDeposit(ethers.utils.parseEther("5"));
        //         const amount = ethers.utils.parseEther("1.1");  // 0.00011 is minimum

        //         await rockPaperScissors.openChallenge(opponent, amount, hand);
        //         await rockPaperScissors.openChallenge(opponentTwo, amount, hand);

        //         const challengeAmount = await rockPaperScissors.getChallengeAmount(1);
        //         const activeAmountOfDeposit = await rockPaperScissors.getAmountActive(owner);

        //         const actualPlayers = await rockPaperScissors.getPlayers(0);

        //         expect(actualPlayers[0]).to.equal(owner);
        //         expect(actualPlayers[1]).to.equal(opponent);

        //         expect(amount).to.equal(challengeAmount);
        //         expect(activeAmountOfDeposit).to.equal(amount.mul(2));
        //     });

        //     it("emits the event successfully", async function () {
        //         await rockPaperScissors.registerAndDeposit(ethers.utils.parseEther("5"));
        //         const amount = ethers.utils.parseEther("1.1");  // 0.00011 is minimum

        //         await expect(rockPaperScissors.openChallenge(opponent, amount, hand))
        //             .to.emit(rockPaperScissors, "ChallengeOpened")
        //             .withArgs("0", owner, opponent, amount, hand);
        //     });     

        //     // Attempting to open a challenge while the contract is in a paused state and verifying that it reverts.
        //     // Attempting to open a challenge after the contract's end date and verifying that it reverts.
        // });

        // describe("acceptChallenge", async function () {
        //     beforeEach(async function () {
        //         const signers = await ethers.getSigners();
        //         const addresses = await Promise.all(signers.map(async (signer) => {
        //             return await signer.getAddress();
        //         }));

        //         owner = addresses[0];
        //         challenger = addresses[1];
        //         challenged = addresses[2];            

        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         amount = ethers.utils.parseEther("1.1"); hand = 1; 
        //     });

        //     it("should be accepted successfully", async function () {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1);
        //         expect(await rockPaperScissors.getAmountActive(challenged)).to.equal(amount);
        //     });

        //     it("should revert if challenge does not exist", async function () {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
                
        //         await expect(rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(7, 1))
        //             .to.be.revertedWith("RockPaperScissors__ChallengeDoesNotExist");
        //     });

        //     it("should revert if different person accepts", async function (){
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //         await expect(rockPaperScissors.connect(await ethers.getSigner(challenger)).acceptChallenge(0, 1))
        //             .to.be.revertedWith("RockPaperScissors__ChallengeCannotBeAccepted");
        //     })

        //     it("should revert if challenged has insufficient funds", async function() {
        //         let highAmount = ethers.utils.parseEther("4");
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("3"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, highAmount, hand);

        //         await expect(rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1))
        //             .to.be.revertedWith("RockPaperScissors__CannotAfford");
        //     });

        //     // it("should revert if challenge has already been accepted", async function() {
        //     //     await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //     //     await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //     //     await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1);
        //     //     await expect(rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1))
        //     //         .to.be.revertedWith("RockPaperScissors__ChallengeDoesNotExist");
        //     // });

        //     // testing and logic for preventing calling with false amount
        // });

        // describe("closeChallenge", async function () {
        //     beforeEach(async function () {
        //         const signers = await ethers.getSigners();
        //         const addresses = await Promise.all(signers.map(async (signer) => {
        //             return await signer.getAddress();
        //         }));

        //         owner = addresses[0];
        //         challenger = addresses[1];
        //         challenged = addresses[2];            

        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         amount = ethers.utils.parseEther("1.1"); hand = 1;  
        //     });

        //     it("should be closed successfully by challenger", async function () {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).closeChallenge(0);

        //         expect(await rockPaperScissors.getAmountActive(challenger)).to.equal(0);
        //         expect(await rockPaperScissors.getPlayers(0)[0]).to.not.equal(challenger);
        //         expect(await rockPaperScissors.getPlayers(0)[1]).to.not.equal(challenged);
        //     });

        //     it("should be closed successfully by challenged", async function () {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).closeChallenge(0);

        //         expect(await rockPaperScissors.getAmountActive(challenger)).to.equal(0);
        //         expect(await rockPaperScissors.getPlayers(0)[0]).to.not.equal(challenger);
        //         expect(await rockPaperScissors.getPlayers(0)[1]).to.not.equal(challenged);
        //     });

        //     it("should not be able to be closed by non-involved user", async function() {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //         await expect(rockPaperScissors.connect(await ethers.getSigner(owner)).closeChallenge(0))
        //             .to.be.revertedWith("RockPaperScissors__ChallengeCannotBeClosed");

        //         expect(await rockPaperScissors.getAmountActive(challenger)).to.equal(amount);

        //         const actualPlayers = await rockPaperScissors.getPlayers(0);
        //         expect(actualPlayers[0]).to.equal(challenger);
        //         expect(actualPlayers[1]).to.equal(challenged);
        //     });

        //     it("should not be able to close nonexisting challenge", async function() {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, hand);

        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).closeChallenge(0);

        //         await expect(rockPaperScissors.connect(await ethers.getSigner(challenger)).closeChallenge(0))
        //             .to.be.revertedWith("RockPaperScissors__ChallengeDoesNotExist");
        //     });

        //     // testing and logic for preventing calling with false amount
        // });

        // describe("gameCommenced", async function () {
        //     beforeEach(async function () {
        //         const signers = await ethers.getSigners();
        //         const addresses = await Promise.all(signers.map(async (signer) => {
        //             return await signer.getAddress();
        //         }));
        
        //         owner = addresses[0];
        //         challenger = addresses[1];
        //         challenged = addresses[2];            
        
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).registerAndDeposit(ethers.utils.parseEther("5"));
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).registerAndDeposit(ethers.utils.parseEther("5"));

        //         challengerInitialDeposit = await rockPaperScissors.getDeposit(challenger);
        //         challengedInitialDeposit = await rockPaperScissors.getDeposit(challenged);
        //         amount = ethers.utils.parseEther("1.1"); 
        //     });

        //     it("challenger plays rock, challenged plays rock", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 1);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1); 
        //         await rockPaperScissors.gameCommenced(0, 1, 1);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(challengerInitialDeposit).to.equal(actualChallengerDeposit);
        //         expect(challengedInitialDeposit).to.equal(actualChallengedDeposit);
        //     });

        //     it("challenger plays rock, challenged plays paper", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 1);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 2); 
        //         await rockPaperScissors.gameCommenced(0, 1, 2);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(ethers.utils.parseEther("3.9")).to.equal(BigNumber.from(actualChallengerDeposit.toString()));
        //         expect(ethers.utils.parseEther("5.99")).to.equal(BigNumber.from(actualChallengedDeposit.toString()));
        //     });

        //     it("challenger plays rock, challenged plays scissors", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 1);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 3); 
        //         await rockPaperScissors.gameCommenced(0, 1, 3);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(ethers.utils.parseEther("3.9")).to.equal(BigNumber.from(actualChallengedDeposit.toString()));
        //         expect(ethers.utils.parseEther("5.99")).to.equal(BigNumber.from(actualChallengerDeposit.toString()));
        //     });

        //     it("challenger plays paper, challenged plays rock", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 2);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1); 
        //         await rockPaperScissors.gameCommenced(0, 2, 1);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(ethers.utils.parseEther("3.9")).to.equal(BigNumber.from(actualChallengedDeposit.toString()));
        //         expect(ethers.utils.parseEther("5.99")).to.equal(BigNumber.from(actualChallengerDeposit.toString()));
        //     });

        //     it("challenger plays paper, challenged plays paper", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 2);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 2); 
        //         await rockPaperScissors.gameCommenced(0, 2, 2);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(challengerInitialDeposit).to.equal(actualChallengerDeposit);
        //         expect(challengedInitialDeposit).to.equal(actualChallengedDeposit);
        //     });

        //     it("challenger plays paper, challenged plays scissors", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 2);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 3); 
        //         await rockPaperScissors.gameCommenced(0, 2, 3);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(ethers.utils.parseEther("3.9")).to.equal(BigNumber.from(actualChallengerDeposit.toString()));
        //         expect(ethers.utils.parseEther("5.99")).to.equal(BigNumber.from(actualChallengedDeposit.toString()));
        //     });

        //     it("challenger plays scissors, challenged plays rock", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 1);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 1); 
        //         await rockPaperScissors.gameCommenced(0, 3, 1);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(ethers.utils.parseEther("3.9")).to.equal(BigNumber.from(actualChallengerDeposit.toString()));
        //         expect(ethers.utils.parseEther("5.99")).to.equal(BigNumber.from(actualChallengedDeposit.toString()));
        //     });

        //     it("challenger plays scissors, challenged plays paper", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 3);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 2); 
        //         await rockPaperScissors.gameCommenced(0, 3, 2);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(ethers.utils.parseEther("3.9")).to.equal(BigNumber.from(actualChallengedDeposit.toString()));
        //         expect(ethers.utils.parseEther("5.99")).to.equal(BigNumber.from(actualChallengerDeposit.toString()));
        //     });

        //     it("challenger plays scissors, challenged plays scissors", async () => {
        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).openChallenge(challenged, amount, 3);
        //         await rockPaperScissors.connect(await ethers.getSigner(challenged)).acceptChallenge(0, 3); 
        //         await rockPaperScissors.gameCommenced(0, 3, 3);

        //         actualChallengerDeposit = await rockPaperScissors.getDeposit(challenger);
        //         actualChallengedDeposit = await rockPaperScissors.getDeposit(challenged);
        //         expect(challengerInitialDeposit).to.equal(actualChallengerDeposit);
        //         expect(challengedInitialDeposit).to.equal(actualChallengedDeposit);
        //     });
        // });

        // describe("withdraw", async function () {
        //     beforeEach(async function () {
        //         const signers = await ethers.getSigners();
        //         const addresses = await Promise.all(signers.map(async (signer) => {
        //             return await signer.getAddress();
        //         }));

        //         owner = addresses[0];
        //         challenger = addresses[1];
        //         challenged = addresses[2];          

        //         await rockPaperScissors.connect(await ethers.getSigner(challenger)).registerAndDeposit(ethers.utils.parseEther("5"));
        //     });

        //     it("successful withdrawal", async function () {
        //         try{
        //             await rockPaperScissors.connect(await ethers.getSigner(challenger)).withdraw(ethers.utils.parseEther("3"), { gasLimit: 2000000 });
        //         }catch(error){
        //             console.log(error.message);
        //             console.log("TRX: ", error.transaction);
        //             throw error;
        //         }

        //         await expect(rockPaperScissors.getDeposit(challenger)).to.equal(ethers.utils.parseEther("2"));
        //     })
        // });
    })