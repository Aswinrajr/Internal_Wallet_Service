import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const User = mongoose.model('User', UserSchema);

const AssetTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: String,
});

export const AssetType = mongoose.model('AssetType', AssetTypeSchema);

const WalletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assetType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssetType',
        required: true,
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Ensure a user can only have one wallet per asset type
WalletSchema.index({ user: 1, assetType: 1 }, { unique: true });

export const Wallet = mongoose.model('Wallet', WalletSchema);

const TransactionSchema = new mongoose.Schema({
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['TOPUP', 'BONUS', 'SPEND'],
        required: true,
    },
    description: String,
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model('Transaction', TransactionSchema);
