import { Wallet, BN, AnchorProvider, Program } from "@coral-xyz/anchor";
import AlphaVault, {
  CustomizableFcfsVaultParams,
  CustomizableProrataVaultParams,
  IDL,
  PROGRAM_ID,
  PoolType,
  WalletDepositCap,
} from "@meteora-ag/alpha-vault";
import {
  Cluster,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  AlphaVaultTypeConfig,
  FcfsAlphaVaultConfig,
  ProrataAlphaVaultConfig,
  WhitelistModeConfig,
} from "./config";
import {
  getAmountInLamports,
  getAlphaVaultWhitelistMode,
  modifyComputeUnitPriceIx,
  runSimulateTransaction,
  deriveAlphaVault,
} from "./utils";
import { ALPHA_VAULT_PROGRAM_IDS } from "./constants";

export async function createFcfsAlphaVault(
  connection: Connection,
  wallet: Wallet,
  poolType: PoolType,
  poolAddress: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  quoteDecimals: number,
  params: FcfsAlphaVaultConfig,
  dryRun: boolean,
  computeUnitPriceMicroLamports: number,
  opts?: {
    alphaVaultProgramId: PublicKey;
  },
): Promise<void> {
  let maxDepositingCap = getAmountInLamports(
    params.maxDepositCap,
    quoteDecimals,
  );
  let individualDepositingCap = getAmountInLamports(
    params.individualDepositingCap,
    quoteDecimals,
  );
  let escrowFee = getAmountInLamports(params.escrowFee, quoteDecimals);
  let whitelistMode = getAlphaVaultWhitelistMode(params.whitelistMode);

  console.log(`\n> Initializing FcfsAlphaVault...`);
  console.log(`- Using poolType: ${poolType}`);
  console.log(`- Using poolMint ${poolAddress}`);
  console.log(`- Using baseMint ${baseMint}`);
  console.log(`- Using quoteMint ${quoteMint}`);
  console.log(`- Using depositingPoint ${params.depositingPoint}`);
  console.log(`- Using startVestingPoint ${params.startVestingPoint}`);
  console.log(`- Using endVestingPoint ${params.endVestingPoint}`);
  console.log(
    `- Using maxDepositingCap ${params.maxDepositCap}. In lamports ${maxDepositingCap}`,
  );
  console.log(
    `- Using individualDepositingCap ${params.individualDepositingCap}. In lamports ${individualDepositingCap}`,
  );
  console.log(
    `- Using escrowFee ${params.escrowFee}. In lamports ${escrowFee}`,
  );
  console.log(
    `- Using whitelistMode ${params.whitelistMode}. In value ${whitelistMode}`,
  );

  const initAlphaVaultTx = (await createCustomizableFcfsVault(
    connection,
    {
      quoteMint,
      baseMint,
      poolAddress,
      poolType,
      depositingPoint: new BN(params.depositingPoint),
      startVestingPoint: new BN(params.startVestingPoint),
      endVestingPoint: new BN(params.endVestingPoint),
      maxDepositingCap,
      individualDepositingCap,
      escrowFee,
      whitelistMode,
    },
    wallet.publicKey,
    computeUnitPriceMicroLamports,
    opts?.alphaVaultProgramId ??
      new PublicKey(ALPHA_VAULT_PROGRAM_IDS["mainnet-beta"]),
  )) as Transaction;

  if (dryRun) {
    console.log(`\n> Simulating init alpha vault tx...`);
    await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, [
      initAlphaVaultTx,
    ]);
  } else {
    console.log(`>> Sending init alpha vault transaction...`);
    const initAlphaVaulTxHash = await sendAndConfirmTransaction(
      connection,
      initAlphaVaultTx,
      [wallet.payer],
    ).catch((err) => {
      console.error(err);
      throw err;
    });
    console.log(
      `>>> Alpha vault initialized successfully with tx hash: ${initAlphaVaulTxHash}`,
    );
  }
}

export async function createProrataAlphaVault(
  connection: Connection,
  wallet: Wallet,
  poolType: PoolType,
  poolAddress: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  quoteDecimals: number,
  params: ProrataAlphaVaultConfig,
  dryRun: boolean,
  computeUnitPriceMicroLamports: number,
  opts?: {
    alphaVaultProgramId: PublicKey;
  },
): Promise<Transaction> {
  let maxBuyingCap = getAmountInLamports(params.maxBuyingCap, quoteDecimals);
  let escrowFee = getAmountInLamports(params.escrowFee, quoteDecimals);
  let whitelistMode = getAlphaVaultWhitelistMode(params.whitelistMode);

  console.log(`\n> Initializing ProrataAlphaVault...`);
  console.log(`- Using poolType: ${poolType}`);
  console.log(`- Using poolMint ${poolAddress}`);
  console.log(`- Using baseMint ${baseMint}`);
  console.log(`- Using quoteMint ${quoteMint}`);
  console.log(`- Using depositingPoint ${params.depositingPoint}`);
  console.log(`- Using startVestingPoint ${params.startVestingPoint}`);
  console.log(`- Using endVestingPoint ${params.endVestingPoint}`);
  console.log(
    `- Using maxBuyingCap ${params.maxBuyingCap}. In lamports ${maxBuyingCap}`,
  );
  console.log(
    `- Using escrowFee ${params.escrowFee}. In lamports ${escrowFee}`,
  );
  console.log(
    `- Using whitelistMode ${params.whitelistMode}. In value ${whitelistMode}`,
  );

  const initAlphaVaultTx = (await createCustomizableProrataVault(
    connection,
    {
      quoteMint,
      baseMint,
      poolAddress,
      poolType,
      depositingPoint: new BN(params.depositingPoint),
      startVestingPoint: new BN(params.startVestingPoint),
      endVestingPoint: new BN(params.endVestingPoint),
      maxBuyingCap,
      escrowFee,
      whitelistMode,
    },
    wallet.publicKey,
    computeUnitPriceMicroLamports,
    opts?.alphaVaultProgramId ??
      new PublicKey(ALPHA_VAULT_PROGRAM_IDS["mainnet-beta"]),
  )) as Transaction;

  if (dryRun) {
    console.log(`\n> Simulating init alpha vault tx...`);
    await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, [
      initAlphaVaultTx,
    ]);
  } else {
    console.log(`>> Sending init alpha vault transaction...`);
    const initAlphaVaulTxHash = await sendAndConfirmTransaction(
      connection,
      initAlphaVaultTx,
      [wallet.payer],
    ).catch((err) => {
      console.error(err);
      throw err;
    });
    console.log(
      `>>> Alpha vault initialized successfully with tx hash: ${initAlphaVaulTxHash}`,
    );
  }
}

async function createCustomizableFcfsVault(
  connection: Connection,
  vaultParam: CustomizableFcfsVaultParams,
  owner: PublicKey,
  computeUnitPriceMicroLamports: number,
  alphaVaultProgramId: PublicKey,
) {
  const provider = new AnchorProvider(
    connection,
    {} as any,
    AnchorProvider.defaultOptions(),
  );

  const program = new Program(IDL, alphaVaultProgramId, provider);

  const {
    poolAddress,
    poolType,
    baseMint,
    quoteMint,
    depositingPoint,
    startVestingPoint,
    endVestingPoint,
    maxDepositingCap,
    individualDepositingCap,
    escrowFee,
    whitelistMode,
  } = vaultParam;

  const [alphaVault] = deriveAlphaVault(owner, poolAddress, program.programId);

  const createTx = await program.methods
    .initializeFcfsVault({
      poolType,
      baseMint,
      quoteMint,
      depositingPoint,
      startVestingPoint,
      endVestingPoint,
      maxDepositingCap,
      individualDepositingCap,
      escrowFee,
      whitelistMode,
    })
    .accounts({
      base: owner,
      vault: alphaVault,
      pool: poolAddress,
      funder: owner,
      program: program.programId,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const setPriorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeUnitPriceMicroLamports,
  });
  createTx.add(setPriorityFeeIx);

  const { blockhash, lastValidBlockHeight } =
    await program.provider.connection.getLatestBlockhash("confirmed");
  return new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: owner,
  }).add(createTx);
}

async function createCustomizableProrataVault(
  connection: Connection,
  vaultParam: CustomizableProrataVaultParams,
  owner: PublicKey,
  computeUnitPriceMicroLamports: number,
  alphaVaultProgramId: PublicKey,
) {
  const provider = new AnchorProvider(
    connection,
    {} as any,
    AnchorProvider.defaultOptions(),
  );

  const program = new Program(IDL, alphaVaultProgramId, provider);

  const {
    poolAddress,
    poolType,
    baseMint,
    quoteMint,
    depositingPoint,
    startVestingPoint,
    endVestingPoint,
    maxBuyingCap,
    escrowFee,
    whitelistMode,
  } = vaultParam;

  const [alphaVault] = deriveAlphaVault(owner, poolAddress, program.programId);

  const createTx = await program.methods
    .initializeProrataVault({
      poolType,
      baseMint,
      quoteMint,
      depositingPoint,
      startVestingPoint,
      endVestingPoint,
      maxBuyingCap,
      escrowFee,
      whitelistMode,
    })
    .accounts({
      base: owner,
      vault: alphaVault,
      pool: poolAddress,
      funder: owner,
      program: program.programId,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
  const setPriorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeUnitPriceMicroLamports,
  });
  createTx.add(setPriorityFeeIx);

  const { blockhash, lastValidBlockHeight } =
    await program.provider.connection.getLatestBlockhash("confirmed");
  return new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: owner,
  }).add(createTx);
}

export async function createPermissionedAlphaVaultWithAuthority(
  connection: Connection,
  wallet: Wallet,
  vaultAuthority: Keypair,
  alphaVaultType: AlphaVaultTypeConfig,
  poolType: PoolType,
  poolAddress: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  quoteDecimals: number,
  params: FcfsAlphaVaultConfig | ProrataAlphaVaultConfig,
  whitelistList: WalletDepositCap[],
  dryRun: boolean,
  computeUnitPriceMicroLamports: number,
  opts?: {
    alphaVaultProgramId: PublicKey;
  },
): Promise<void> {
  if (params.whitelistMode != WhitelistModeConfig.PermissionedWithAuthority) {
    throw new Error(`Invalid whitelist mode ${params.whitelistMode}. Only Permissioned with authority is allowed 
    `);
  }

  switch (alphaVaultType) {
    case AlphaVaultTypeConfig.Fcfs:
      await createFcfsAlphaVault(
        connection,
        wallet,
        poolType,
        poolAddress,
        baseMint,
        quoteMint,
        quoteDecimals,
        params as FcfsAlphaVaultConfig,
        dryRun,
        computeUnitPriceMicroLamports,
        opts,
      );
    case AlphaVaultTypeConfig.Prorata:
      await createProrataAlphaVault(
        connection,
        wallet,
        poolType,
        poolAddress,
        baseMint,
        quoteMint,
        quoteDecimals,
        params as ProrataAlphaVaultConfig,
        dryRun,
        computeUnitPriceMicroLamports,
        opts,
      );
  }

  const [alphaVaultPubkey] = deriveAlphaVault(
    wallet.publicKey,
    poolAddress,
    new PublicKey(PROGRAM_ID),
  );

  const alphaVault = await AlphaVault.create(connection, alphaVaultPubkey);

  // Create StakeEscrow accounts for whitelist list
  const instructions =
    await alphaVault.createMultipleStakeEscrowByAuthorityInstructions(
      whitelistList,
      vaultAuthority.publicKey,
    );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const setPriorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeUnitPriceMicroLamports,
  });

  const createStakeEscrowAccountsTx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: vaultAuthority.publicKey,
  })
    .add(...instructions)
    .add(setPriorityFeeIx);

  if (dryRun) {
    console.log(`\n> Simulating create stake escrow accounts tx...`);
    await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, [
      createStakeEscrowAccountsTx,
    ]);
  } else {
    console.log(`>> Sending init alpha vault transaction...`);
    const createStakeEscrowAccountTxHash = await sendAndConfirmTransaction(
      connection,
      createStakeEscrowAccountsTx,
      [vaultAuthority],
    ).catch((err) => {
      console.error(err);
      throw err;
    });
    console.log(
      `>>> Create stake escrow accounts successfully with tx hash: ${createStakeEscrowAccountTxHash}`,
    );
  }
}
