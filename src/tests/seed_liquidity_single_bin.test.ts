import { Keypair, PublicKey } from "@solana/web3.js";
import { createPermissionlessDlmmPool, seedLiquiditySingleBin } from "../index";
import { BN, web3 } from "@coral-xyz/anchor";
import { MeteoraConfig } from "../libs/config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { deriveCustomizablePermissionlessLbPair } from "@meteora-ag/dlmm";
import {
  connection,
  payerKeypair,
  rpcUrl,
  keypairFilePath,
  payerWallet,
  DLMM_PROGRAM_ID,
} from "./setup";

describe("Test Seed Liquidity Single Bin", () => {
  const WEN_DECIMALS = 5;
  const USDC_DECIMALS = 6;
  const WEN_SUPPLY = 100_000_000;
  const USDC_SUPPLY = 100_000_000;
  const binStep = 200;
  const feeBps = 200;
  const initialPrice = 0.005;
  const baseKeypair = Keypair.generate();
  const positionOwner = Keypair.generate().publicKey;
  const feeOwner = Keypair.generate().publicKey;

  let WEN: PublicKey;
  let USDC: PublicKey;
  let userWEN: web3.PublicKey;
  let userUSDC: web3.PublicKey;
  let poolKey: PublicKey;

  beforeAll(async () => {
    WEN = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey,
      null,
      WEN_DECIMALS,
      Keypair.generate(),
      undefined,
      TOKEN_PROGRAM_ID,
    );

    USDC = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey,
      null,
      USDC_DECIMALS,
      Keypair.generate(),
      undefined,
      TOKEN_PROGRAM_ID,
    );

    const userWenInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      WEN,
      payerKeypair.publicKey,
      false,
      "confirmed",
      {
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    userWEN = userWenInfo.address;

    const userUsdcInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      USDC,
      payerKeypair.publicKey,
      false,
      "confirmed",
      {
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    userUSDC = userUsdcInfo.address;

    await mintTo(
      connection,
      payerKeypair,
      WEN,
      userWEN,
      payerKeypair.publicKey,
      WEN_SUPPLY * 10 ** WEN_DECIMALS,
      [],
      {
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID,
    );

    await mintTo(
      connection,
      payerKeypair,
      USDC,
      userUSDC,
      payerKeypair.publicKey,
      USDC_SUPPLY * 10 ** USDC_DECIMALS,
      [],
      {
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID,
    );

    const slot = await connection.getSlot();
    const activationPoint = new BN(slot).add(new BN(100));

    const config: MeteoraConfig = {
      dryRun: false,
      rpcUrl,
      keypairFilePath,
      computeUnitPriceMicroLamports: 100000,
      createBaseToken: null,
      baseMint: WEN.toString(),
      quoteSymbol: "USDC",
      dlmm: {
        binStep,
        feeBps,
        initialPrice,
        activationType: "slot",
        activationPoint,
        priceRounding: "up",
        hasAlphaVault: false,
      },
      dynamicAmm: null,
      alphaVault: null,
      lockLiquidity: null,
      lfgSeedLiquidity: null,
      singleBinSeedLiquidity: null,
    };

    //create DLMM pool
    await createPermissionlessDlmmPool(
      config,
      connection,
      payerWallet,
      WEN,
      USDC,
      {
        cluster: "localhost",
        programId: DLMM_PROGRAM_ID,
      },
    );

    // send SOL to wallets
    const payerBalance = await connection.getBalance(payerKeypair.publicKey);
    console.log(`Payer balance ${payerBalance} lamports`);

    const [poolKeyString] = deriveCustomizablePermissionlessLbPair(
      WEN,
      USDC,
      new PublicKey(DLMM_PROGRAM_ID),
    );
    poolKey = new PublicKey(poolKeyString);
  });

  it("Should able to seed liquidity single bin", async () => {
    const seedAmount = new BN(1000 * 10 ** WEN_DECIMALS);
    const priceRounding = "up";
    const lockReleasePoint = new BN(0);
    const seedTokenXToPositionOwner = true;
    const dryRun = false;
    const computeUnitPriceMicroLamports = 100000;

    await seedLiquiditySingleBin(
      connection,
      payerKeypair,
      baseKeypair,
      payerKeypair,
      positionOwner,
      feeOwner,
      WEN,
      USDC,
      DLMM_PROGRAM_ID,
      seedAmount,
      initialPrice,
      priceRounding,
      lockReleasePoint,
      seedTokenXToPositionOwner,
      dryRun,
      computeUnitPriceMicroLamports,
      {
        cluster: "localhost",
      },
    );
  });
});