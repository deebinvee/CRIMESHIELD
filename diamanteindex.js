import {
  Horizon,
  Asset,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Operation,
} from "diamante-sdk-js";

// Initialize Horizon server and network passphrase for testnet
const server = new Horizon.Server("https://diamtestnet.diamcircle.io/");
const networkPassphrase = "Diamante Testnet";

// Generate key pairs for issuer, distributor, and external accounts
const issuerKP = Keypair.fromSecret("SECRET_KEY");
const distributorKP = Keypair.fromSecret("SECRET_KEY");
const externalKP = Keypair.fromSecret("SECRET_KEY");

// Fund these accounts using friendbot.

const asset1 = new Asset("ASSET1", issuerKP.publicKey());
const asset2 = new Asset("ASSET2", issuerKP.publicKey());
const asset3 = new Asset("ASSET3", issuerKP.publicKey());

/**
 * Create assets and send them to the distributor account.
 *
 * @returns {Promise<number>} 1 if the transactions are successful, 0 if an error occurs
 */
async function createAndDistributeAssets() {
  try {
    // Load account details
    const issuerAccount = await server.loadAccount(issuerKP.publicKey());
    const distributorAccount = await server.loadAccount(
      distributorKP.publicKey()
    );

    // Distributor account trusts all assets
    const transaction = new TransactionBuilder(distributorAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset: asset1 }))
      .addOperation(Operation.changeTrust({ asset: asset2 }))
      .addOperation(Operation.changeTrust({ asset: asset3 }))
      .setTimeout(30)
      .build();

    transaction.sign(distributorKP);
    await server.submitTransaction(transaction);

    // Issuer sends assets to the distributor
    const transaction1 = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: distributorKP.publicKey(),
          asset: asset1,
          amount: "80",
        })
      )
      .addOperation(
        Operation.payment({
          destination: distributorKP.publicKey(),
          asset: asset2,
          amount: "80",
        })
      )
      .addOperation(
        Operation.payment({
          destination: distributorKP.publicKey(),
          asset: asset3,
          amount: "80",
        })
      )
      .setTimeout(30)
      .build();

    transaction1.sign(issuerKP);
    await server.submitTransaction(transaction1);

    console.log(
      "Transferred assets to Distributor account!: ",
      distributorKP.publicKey()
    );

    return 1;
  } catch (e) {
    console.error("Error during transaction:", e);
    return 0;
  }
}

/**
 * Create liquidity by adding sell offers for the assets.
 *
 * @returns {Promise<number>} 1 if the transaction is successful, 0 if an error occurs
 */
async function createLiquidity() {
  try {
    // Load the distributor account
    const distributorAccount = await server.loadAccount(
      distributorKP.publicKey()
    );

    // Create a transaction with manageSellOffer operations
    const transaction = new TransactionBuilder(distributorAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.manageSellOffer({
          selling: Asset.native(),
          buying: asset1,
          amount: "80",
          price: "1",
        })
      )
      .addOperation(
        Operation.manageSellOffer({
          selling: asset1,
          buying: asset2,
          amount: "80",
          price: "1",
        })
      )
      .addOperation(
        Operation.manageSellOffer({
          selling: asset2,
          buying: asset3,
          amount: "80",
          price: "1",
        })
      )
      .addOperation(
        Operation.manageSellOffer({
          selling: asset3,
          buying: Asset.native(),
          amount: "80",
          price: "1",
        })
      )
      .setTimeout(30)
      .build();

    // Sign and submit the transaction
    transaction.sign(distributorKP);
    await server.submitTransaction(transaction);

    console.log("Liquidity added successfully!");
    return 1;
  } catch (e) {
    console.error(
      "Error during transaction:",
      e.response.data.extras.result_codes
    );
    return 0;
  }
}

/**
 * Swap Diams to an asset.
 *
 * @returns {Promise<number>} 1 if the transaction is successful, 0 if an error occurs
 */
async function swapDiamToAsset() {
  try {
    // Load the external account
    const externalAccount = await server.loadAccount(externalKP.publicKey());

    // Create a transaction to trust the asset and swap Diamonds (XLM) for the asset
    const transaction = new TransactionBuilder(externalAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset: asset3 }))
      .addOperation(
        Operation.manageBuyOffer({
          selling: Asset.native(),
          buying: asset3,
          buyAmount: "20",
          price: "1",
        })
      )
      .setTimeout(100)
      .build();

    // Sign and submit the transaction
    transaction.sign(externalKP);
    await server.submitTransaction(transaction);

    console.log("Diams swapped to Asset3 successfully!");
    return 1;
  } catch (error) {
    console.error("Error swapping Diam to Asset3:", error);
    return 0;
  }
}

/**
 * Swap assets using the best path.
 *
 * @returns {Promise<number>} 1 if the transaction is successful, 0 if an error occurs
 */
async function swapAssets() {
  try {
    // Load the external account
    const account = await server.loadAccount(externalKP.publicKey());

    // Find the best path from asset3 to asset1
    const pathCallBuilder = server.strictSendPaths(asset3, "2", [asset1]);
    const paths = await pathCallBuilder.call();

    if (paths.records.length === 0) {
      console.log("No paths found. Checking offers...");
      return;
    }

    const bestPath = paths.records[0];

    const pathArray = bestPath.path.map((pathAsset) => {
      return new Asset(pathAsset.asset_code, pathAsset.asset_issuer);
    });

    // Create a transaction for the path payment
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset: asset1 }))
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: asset3,
          sendAmount: "1",
          destination: externalKP.publicKey(),
          destAsset: asset1,
          path: pathArray,
          destMin: "1",
        })
      )
      .setTimeout(100)
      .build();

    // Sign and submit the transaction
    transaction.sign(externalKP);
    await server.submitTransaction(transaction);

    console.log("Asset3 -> Asset1 swap completed");
    return 1;
  } catch (error) {
    console.error(
      "Error finding paths or swapping assets:",
      error.response.data.extras.result_codes
    );
    return 0;
  }
}

// Call this one by one in a main function
async function main() {
  try {
    const createAssetsResult = await createAndDistributeAssets();

    if (createAssetsResult === 1) {
      const createLiquidityResult = await createLiquidity();

      if (createLiquidityResult === 1) {
        const swapDiamToAssetResult = await swapDiamToAsset();

        if (swapDiamToAssetResult === 1) {
          await swapAssets();
          console.log("All transactions completed successfully!");
        } else {
          console.error("Error during swapDiamToAsset transaction.");
        }
      } else {
        console.error("Error during createLiquidity transaction.");
      }
    } else {
      console.error("Error during createAndDistributeAssets transaction.");
    }
  } catch (e) {
    console.error("Error during transaction:", e);
  }
}

main();
