import mongoose from 'mongoose';
import connectDB from './db.js';
import { User, AssetType, Wallet } from './models/index.js';

const seedData = async () => {
    try {
        await connectDB();

        // Clear existing data
        await User.deleteMany({});
        await AssetType.deleteMany({});
        await Wallet.deleteMany({});

        // 1. Create Asset Types
        const goldCoins = await AssetType.create({ name: 'Gold Coins', description: 'Main in-game currency' });
        const rewardPoints = await AssetType.create({ name: 'Reward Points', description: 'Loyalty points' });

        console.log('Asset Types created');

        // 2. Create Users
        const treasury = await User.create({ username: 'system_treasury' });
        const alice = await User.create({ username: 'alice' });
        const bob = await User.create({ username: 'bob' });

        console.log('Users created');

        // 3. Create Wallets
        await Wallet.create({ user: treasury._id, assetType: goldCoins._id, balance: 1000000 });
        await Wallet.create({ user: alice._id, assetType: goldCoins._id, balance: 100 });
        await Wallet.create({ user: bob._id, assetType: goldCoins._id, balance: 50 });

        console.log('Wallets created');

        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
