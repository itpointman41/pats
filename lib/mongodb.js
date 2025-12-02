import { MongoClient } from 'mongodb';

const dbName = 'pats';

// Connection options optimized for MongoDB Atlas and serverless environments
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  retryWrites: true,
};

// Use globalThis for serverless environments (Vercel, etc.)
// This ensures connection reuse across serverless function invocations
const globalForMongo = globalThis;

let client;
let clientPromise;

function getMongoClient() {
  // MongoDB Atlas connection URI - required
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please set it in .env.local or your deployment platform.');
  }

  // Use global variable for connection reuse in both development and production
  // This is especially important for serverless environments like Vercel
  if (!globalForMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalForMongo._mongoClientPromise = client.connect();
  }
  
  return globalForMongo._mongoClientPromise;
}

export async function getDb() {
  try {
    const client = await getMongoClient();
    return client.db(dbName);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw new Error('Database connection failed. Please check your MONGODB_URI environment variable.');
  }
}

// Export client promise for direct use if needed (lazy initialization)
export default (() => {
  try {
    return getMongoClient();
  } catch (error) {
    // Don't throw at module load time - let it fail when getDb() is called
    console.warn('MongoDB URI not configured:', error.message);
    return null;
  }
})();

