import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import { User, AssetType, Wallet, Transaction } from './models/index.js';
import { z } from 'zod';
import mongoose from 'mongoose';

dotenv.config();

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Schema Validation
const TransactionSchema = z.object({
    userId: z.string(), // Can be username or ID
    assetType: z.string(),
    amount: z.number().positive(),
    idempotencyKey: z.string().uuid(), // Or just string if client generates non-uuid
    description: z.string().optional(),
});

// Helper: Seed Database (Expose as API endpoint too)
app.post('/api/seed', async (req, res) => {
    // In production this should be protected
    // For now we'll just shell out to the seed script via child_process or reproduce logic here
    // Reproducing logic is safer/cleaner
    try {
        await User.deleteMany({});
        await AssetType.deleteMany({});
        await Wallet.deleteMany({});
        await Transaction.deleteMany({});

        const goldCoins = await AssetType.create({ name: 'Gold Coins', description: 'Main in-game currency' });
        const rewardPoints = await AssetType.create({ name: 'Reward Points', description: 'Loyalty points' });

        const treasury = await User.create({ username: 'system_treasury' });
        const alice = await User.create({ username: 'alice' });
        const bob = await User.create({ username: 'bob' });

        await Wallet.create({ user: treasury._id, assetType: goldCoins._id, balance: 1000000 });
        await Wallet.create({ user: alice._id, assetType: goldCoins._id, balance: 100 });
        await Wallet.create({ user: bob._id, assetType: goldCoins._id, balance: 50 });

        res.json({ message: 'Database seeded successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

// Helper: Get User and Asset IDs
async function resolveUserAndAsset(userIdOrName, assetTypeName) {
    let user = await User.findOne({ username: userIdOrName });
    if (!user) {
        // Try as objectId
        if (mongoose.Types.ObjectId.isValid(userIdOrName)) {
            user = await User.findById(userIdOrName);
        }
    }
    if (!user) throw new Error('User not found');

    const asset = await AssetType.findOne({ name: assetTypeName });
    if (!asset) throw new Error('Asset type not found');

    return { user, asset };
}

// Core Transaction Logic with Fallback for Standalone Mongo
async function processTransaction(req, res, type) {
    const validation = TransactionSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
    }

    const { userId, assetType, amount, idempotencyKey, description } = validation.data;

    // Helper to execute operation
    const executeOperation = async (session = null) => {
        // 1. Check Idempotency
        const existingTx = await Transaction.findOne({ idempotencyKey }).session(session);
        if (existingTx) {
            return { status: 200, json: { message: 'Transaction already processed', txId: existingTx._id } };
        }

        // 2. Resolve Entities
        let user = await User.findOne({ username: userId }).session(session);
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId).session(session);
        }
        if (!user) throw new Error('User not found');

        const asset = await AssetType.findOne({ name: assetType }).session(session);
        if (!asset) throw new Error('Asset type not found');

        // 3. Update Wallet Balance ATOMICALLY
        // Using findOneAndUpdate ensures atomic updates even without transactions (for balance)
        // Upsert logic: If wallet doesn't exist, create it.
        // Ideally we lock, but atomic update is better.

        // Calculate delta
        let delta = 0;
        if (type === 'TOPUP' || type === 'BONUS') {
            delta = amount;
        } else if (type === 'SPEND') {
            delta = -amount;
        }

        // Spend check logic inside query?
        // If SPEND, we require balance >= amount. 
        // We can use query condition: { balance: { $gte: amount } }

        const filter = { user: user._id, assetType: asset._id };
        if (type === 'SPEND') {
            filter.balance = { $gte: amount };
        }

        const update = { $inc: { balance: delta }, $setOnInsert: { user: user._id, assetType: asset._id } };
        const options = { new: true, upsert: true, session };

        // If SPEND and wallet doesn't exist (balance 0), upsert with negative balance? No.
        // If SPEND, we must ensure it exists OR handle "upsert with 0 balance" logic.
        // Actually if wallet doesn't exist, balance is 0. Spend fails.
        // So for SPEND, do NOT upsert if not exists? Or upsert but check result.

        if (type === 'SPEND') {
            options.upsert = false; // Cannot spend from non-existent wallet
        }

        let wallet = await Wallet.findOneAndUpdate(filter, update, options);

        if (!wallet) {
            // If SPEND failed, it implies insufficient funds OR wallet not found.
            if (type === 'SPEND') {
                // Check if wallet exists at all to give better error
                const w = await Wallet.findOne({ user: user._id, assetType: asset._id }).session(session);
                if (!w || w.balance < amount) {
                    throw new Error('Insufficient funds');
                }
            }
            // Should not happen for TOPUP/BONUS with upsert true
            throw new Error('Wallet update failed');
        }

        // 4. Record Transaction
        const tx = new Transaction({
            wallet: wallet._id,
            amount: delta,
            type,
            description: description || type,
            idempotencyKey
        });

        await tx.save({ session });

        return {
            status: 200,
            json: {
                message: 'Transaction successful',
                balance: wallet.balance,
                txId: tx._id
            }
        };
    };

    // Try with Transaction first (ACID compliance)
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const result = await executeOperation(session);
        await session.commitTransaction();
        res.status(result.status).json(result.json);
    } catch (error) {
        try { await session.abortTransaction(); } catch (e) { /* ignore abort error */ }

        // Check if error is due to missing Replica Set (Standalone Mongo)
        if (error.message.includes('Transaction numbers are only allowed') || error.message.includes('Sessions are not supported')) {
            console.warn('MongoDB Transaction failed (Standalone?), retrying without transaction...');
            try {
                // Retry WITHOUT session (Atomic updates still safety)
                const result = await executeOperation(null);
                res.status(result.status).json(result.json);
            } catch (retryError) {
                console.error(retryError);
                res.status(500).json({ error: retryError.message });
            }
        } else {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    } finally {
        session.endSession();
    }
}

// Routes
app.post('/api/wallet/topup', (req, res) => processTransaction(req, res, 'TOPUP'));
app.post('/api/wallet/bonus', (req, res) => processTransaction(req, res, 'BONUS'));
app.post('/api/wallet/spend', (req, res) => processTransaction(req, res, 'SPEND'));

app.get('/api/wallet/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let user = await User.findOne({ username: userId });
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        }
        if (!user) return res.status(404).json({ error: 'User not found' });

        const wallets = await Wallet.find({ user: user._id }).populate('assetType', 'name description');

        const result = wallets.map(w => ({
            asset: w.assetType.name,
            balance: w.balance,
            walletId: w._id
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (helper for frontend)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Get all asset types (helper for frontend)
app.get('/api/assets', async (req, res) => {
    try {
        const assets = await AssetType.find({});
        res.json(assets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get transaction history for a user
app.get('/api/transactions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let user = await User.findOne({ username: userId });
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        }
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Find all wallets for this user
        const wallets = await Wallet.find({ user: user._id });
        const walletIds = wallets.map(w => w._id);

        // Find transactions for these wallets
        const transactions = await Transaction.find({ wallet: { $in: walletIds } })
            .sort({ createdAt: -1 })
            .limit(20) // Limit to last 20
            .populate({
                path: 'wallet',
                populate: { path: 'assetType', select: 'name' }
            });

        const result = transactions.map(tx => ({
            id: tx._id,
            type: tx.type,
            amount: tx.amount,
            asset: tx.wallet.assetType.name,
            description: tx.description,
            date: tx.createdAt
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new User
app.post('/api/users', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: 'Username already taken' });

        const newUser = await User.create({ username });

        // Initialize empty wallets for all existing asset types
        const assets = await AssetType.find({});
        for (const asset of assets) {
            await Wallet.create({
                user: newUser._id,
                assetType: asset._id,
                balance: 0
            });
        }

        res.status(201).json(newUser);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
