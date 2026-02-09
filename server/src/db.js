import mongoose from 'mongoose';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to .env file in server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const connStr = process.env.MONGODB_URI;
        console.log("MONGODB_URI", connStr);
        if (!process.env.MONGODB_URI) {
            console.error("CRITICAL: MONGODB_URI is undefined in .env file.");
            console.warn("Please ensure .env file exists in the server root and contains MONGODB_URI.");
        }

        await mongoose.connect(connStr);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

export default connectDB;
