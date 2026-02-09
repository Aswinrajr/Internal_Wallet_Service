import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:3000/api';
const USER_ID = 'alice'; // Ensure this user exists
const ASSET_TYPE = 'Gold Coins';

async function getBalance() {
    const res = await fetch(`${API_URL}/wallet/${USER_ID}`);
    const data = await res.json();
    const wallet = data.find(w => w.asset === ASSET_TYPE);
    return wallet ? wallet.balance : 0;
}

async function runConcurrencyTest() {
    console.log('--- Starting Concurrency Test ---');

    // 1. Get Initial Balance
    const initialBalance = await getBalance();
    console.log(`Initial Balance: ${initialBalance}`);

    // 2. Fire 10 parallel requests to add 10 coins each
    // Total expected addition: 100
    const requests = [];
    const iterations = 10;
    const amountPerTx = 10;

    console.log(`Sending ${iterations} parallel requests of ${amountPerTx} coins...`);

    for (let i = 0; i < iterations; i++) {
        requests.push(fetch(`${API_URL}/wallet/bonus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: USER_ID,
                assetType: ASSET_TYPE,
                amount: amountPerTx,
                idempotencyKey: randomUUID(), // Valid UUID
                description: `Concurrency Test ${i}`
            })
        }));
    }

    try {
        await Promise.all(requests);
        console.log('All requests finished.');

        // 3. Check Final Balance
        const finalBalance = await getBalance();
        console.log(`Final Balance: ${finalBalance}`);

        const expectedBalance = initialBalance + (iterations * amountPerTx);

        if (finalBalance === expectedBalance) {
            console.log('✅ SUCCESS: Balance matches expected value. Race conditions handled.');
        } else {
            console.log(`❌ FAILURE: Expected ${expectedBalance} but got ${finalBalance}. Race condition occurred!`);
        }

    } catch (error) {
        console.error('Error during test:', error);
    }
}

async function runIdempotencyTest() {
    console.log('\n--- Starting Idempotency Test ---');

    const key = randomUUID();
    const amount = 50;

    console.log(`Sending 1st request with key: ${key}`);
    const res1 = await fetch(`${API_URL}/wallet/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, assetType: ASSET_TYPE, amount, idempotencyKey: key })
    });
    const data1 = await res1.json();
    console.log('Result 1:', data1);

    console.log(`Sending 2nd request with SAME key: ${key}`);
    const res2 = await fetch(`${API_URL}/wallet/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, assetType: ASSET_TYPE, amount, idempotencyKey: key })
    });
    const data2 = await res2.json();
    console.log('Result 2:', data2);

    if (data1.txId === data2.txId) {
        console.log('✅ SUCCESS: Both requests returned the same Transaction ID.');
    } else {
        console.log('❌ FAILURE: Different IDs or error.');
    }
}

// Run tests
(async () => {
    // Note: If running on Node < 18, you might need to install node-fetch or run with --experimental-fetch
    // Assuming Node 18+ for this environment
    if (!globalThis.fetch) {
        console.log("Installing node-fetch for compatibility...");
        // You might need to run `npm install node-fetch` if this fails
    }

    await runIdempotencyTest();
    await runConcurrencyTest();
})();
