const DiamSdk = require("diamnet-sdk");

async function createKeypair() {
    return DiamSdk.Keypair.random();
}

async function fundAccount(publicKey) {
    const response = await fetch(`https://friendbot.diamcircle.io?addr=${encodeURIComponent(publicKey)}`);
    const responseJSON = await response.json();
    console.log("SUCCESS! You have a new account :)\n", responseJSON);
}

async function createChildAccount(parentAccount, startingBalance) {
    const childAccount = DiamSdk.Keypair.random();
    const server = new DiamSdk.Aurora.Server("https://diamtestnet.diamcircle.io/");

    let createAccountTx = new DiamSdk.TransactionBuilder(parentAccount, {
        fee: DiamSdk.BASE_FEE,
        networkPassphrase: DiamSdk.Networks.TESTNET,
    });

    createAccountTx = await createAccountTx
        .addOperation(DiamSdk.Operation.createAccount({
            destination: childAccount.publicKey(),
            startingBalance: startingBalance,
        }))
        .setTimeout(180)
        .build();

    await createAccountTx.sign(parentAccount);
    
    try {
        const txResponse = await server.submitTransaction(createAccountTx);
        console.log("Created the new account", childAccount.publicKey());
        return childAccount;
    } catch (error) {
        console.error("Transaction submission error:", error.response);
        throw error;
    }
}

async function getAccountBalances(publicKey) {
    const server = new DiamSdk.Aurora.Server("https://diamtestnet.diamcircle.io/");
    const account = await server.loadAccount(publicKey);
    console.log("Balances for account: " + publicKey);
    account.balances.forEach(balance => {
        console.log("Type:", balance.asset_type, ", Balance:", balance.balance);
    });
}

(async function main() {
    try {
        const pair = await createKeypair();
        await fundAccount(pair.publicKey());

        const server = new DiamSdk.Aurora.Server("https://diamtestnet.diamcircle.io/");
        const parentAccount = await server.loadAccount(pair.publicKey());

        const childAccount = await createChildAccount(parentAccount, "5");
        await getAccountBalances(pair.publicKey());
    } catch (e) {
        console.error("ERROR!", e);
    }
})();
