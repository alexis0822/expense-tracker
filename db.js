import { MongoClient } from 'mongodb';

// MongoDB connection configuration
const uri = 'mongodb://localhost:27017';
const dbName = 'expenseTracker';

// Database connection instances
let client;  // MongoDB client instance
let db;      // Database instance

/**
 * Establishes connection to MongoDB database
 * Implements singleton pattern to reuse existing connection
 */
export async function connectToDatabase() {
    // Return existing connection if available
    if (db) return db;

    // Create new connection if none exists
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    return db;
}