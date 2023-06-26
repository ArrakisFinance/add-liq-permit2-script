const p2sdk = require("@uniswap/permit2-sdk");
const dotenv = require("dotenv");
const ethers = require("ethers");
const routerABI = require('./routerabi.json');

// env
dotenv.config({ path: __dirname + "/.env" });
const ALCHEMY_ID = process.env.ALCHEMY_ID;
const PK = process.env.PK;

/// @note run against polygon mainnet
const providerURL = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_ID}`;

// constants
const DEADLINE = "999999999999999";
const NONCE = "1003";
const AMOUNT0 = "50000";
const AMOUNT1_WORKS = "100000000000";
const AMOUNT1_FAILS = "10000000000000";

const TOKEN0_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const TOKEN1_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const ROUTER_ADDRESS = "0xF4e0671a76B1715744a259a0fa0c561eB89e3340";
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const VAULT_ADDRESS = "0x00A1DF29047dc005c192e50EC87798dbAb816f39";

const main = async () => {
    const provider = new ethers.JsonRpcProvider(providerURL);
    const wallet = new ethers.Wallet(PK, provider);
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);

    /// @note comment out if already done
    // const token0 = new ethers.Contract(TOKEN0_ADDRESS, ["function approve(address,uint256) external returns (bool)"], wallet);
    // const token1 = new ethers.Contract(TOKEN1_ADDRESS, ["function approve(address,uint256) external returns (bool)"], wallet);
    // console.log("approving...");
    // await token0.approve(PERMIT2_ADDRESS, ethers.MaxUint256, {gasLimit: 100000, maxFeePerGas: ethers.parseUnits("500", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")});
    // const tx1 = await token1.approve(PERMIT2_ADDRESS, ethers.MaxUint256, {gasLimit: 100000, maxFeePerGas: ethers.parseUnits("500", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")});
    // await tx1.wait();

    console.log("signing permit...");
    const permitData = p2sdk.SignatureTransfer.getPermitData(
        {
            permitted: [
                {
                    token: TOKEN0_ADDRESS,
                    amount: AMOUNT0,
                },
                {
                    token: TOKEN1_ADDRESS,
                    amount: AMOUNT1_WORKS,
                },
            ],
            spender: ROUTER_ADDRESS,
            nonce: NONCE,
            deadline: DEADLINE,
        },
        PERMIT2_ADDRESS,
        137
    );

    const permitData2 = p2sdk.SignatureTransfer.getPermitData(
        {
            permitted: [
                {
                    token: TOKEN0_ADDRESS,
                    amount: AMOUNT0,
                },
                {
                    token: TOKEN1_ADDRESS,
                    amount: AMOUNT1_FAILS,
                },
            ],
            spender: ROUTER_ADDRESS,
            nonce: NONCE,
            deadline: DEADLINE,
        },
        PERMIT2_ADDRESS,
        137
    );

    const finalSig = await wallet.signTypedData(permitData.domain, permitData.types, permitData.values)

    const finalSig2 = await wallet.signTypedData(permitData2.domain, permitData2.types, permitData2.values)

    const addLiquidityData = {
        amount0Max: AMOUNT0,
        amount1Max: AMOUNT1_WORKS,
        amount0Min: 0,
        amount1Min: 0,
        amountSharesMin: 0,
        vault: VAULT_ADDRESS,
        receiver: wallet.address,
        gauge: ethers.ZeroAddress,
    };

    const addLiquidityPermit2Data = {
        addData: addLiquidityData,
        permit: {
            permitted: [
            {
                token: TOKEN0_ADDRESS,
                amount: AMOUNT0,
            },
            {
                token: TOKEN1_ADDRESS,
                amount: AMOUNT1_WORKS,
            },
            ],
            nonce: NONCE,
            deadline: DEADLINE,
        },
        signature: finalSig,
    };

    console.log("simulating add...")
    await router.addLiquidityPermit2.estimateGas(addLiquidityPermit2Data,  {maxFeePerGas: ethers.parseUnits("500", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")});
    console.log("worked! (as expected)");

    const addLiquidityData2 = {
        amount0Max: AMOUNT0,
        amount1Max: AMOUNT1_FAILS,
        amount0Min: 0,
        amount1Min: 0,
        amountSharesMin: 0,
        vault: VAULT_ADDRESS,
        receiver: wallet.address,
        gauge: ethers.ZeroAddress,
    };

    const addLiquidityPermit2Data2 = {
        addData: addLiquidityData2,
        permit: {
            permitted: [
            {
                token: TOKEN0_ADDRESS,
                amount: AMOUNT0,
            },
            {
                token: TOKEN1_ADDRESS,
                amount: AMOUNT1_FAILS,
            },
            ],
            nonce: NONCE,
            deadline: DEADLINE,
        },
        signature: finalSig2,
    };

    console.log("simulating add again...");
    await router.addLiquidityPermit2.estimateGas(addLiquidityPermit2Data2,  {maxFeePerGas: ethers.parseUnits("500", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")});
    console.log("if you get here then problem solved, but you wont get here");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });