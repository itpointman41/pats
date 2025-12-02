import { MongoClient } from 'mongodb';

const dbName = 'pats';

// Connection options optimized for MongoDB Atlas and serverless environments (Vercel)
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 0, // Allow connection pool to shrink to 0 when idle (important for serverless)
  serverSelectionTimeoutMS: 10000, // Increased timeout for serverless cold starts
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  connectTimeoutMS: 10000, // Connection timeout
  retryWrites: true,
  retryReads: true,
};

// Use globalThis for serverless environments (Vercel, etc.)
// This ensures connection reuse across serverless function invocations
const globalForMongo = globalThis;

let client;
let clientPromise;

function getMongoClient() {
  // MongoDB Atlas connection URI - required
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please set it in .env.local or your deployment platform.');
  }

  // Validate URI format (basic check)
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
  }

  // Ensure URI has proper connection options
  // Add retryWrites and w=majority if not present (important for Atlas)
  if (!uri.includes('retryWrites')) {
    const separator = uri.includes('?') ? '&' : '?';
    uri = `${uri}${separator}retryWrites=true&w=majority`;
  }

  // Use global variable for connection reuse in both development and production
  // This is especially important for serverless environments like Vercel
  if (!globalForMongo._mongoClientPromise) {
    try {
      client = new MongoClient(uri, options);
      globalForMongo._mongoClientPromise = client.connect();
    } catch (error) {
      console.error('Failed to create MongoDB client:', error);
      throw error;
    }
  }
  
  return globalForMongo._mongoClientPromise;
}

export async function getDb() {
  try {
    const client = await getMongoClient();
    const db = client.db(dbName);
    
    // Test the connection by listing collections (this will fail if DB doesn't exist or connection is bad)
    try {
      await db.listCollections().limit(1).toArray();
    } catch (testError) {
      // If database doesn't exist, MongoDB will still connect but operations fail
      console.error('Database operation test failed:', {
        message: testError.message,
        code: testError.code,
        database: dbName
      });
      // Continue anyway - the database might just be empty
    }
    
    return db;
  } catch (error) {
    // Log detailed error information
    console.error('MongoDB connection error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      hasUri: !!process.env.MONGODB_URI,
      uriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'not set'
    });
    
    // Preserve original error to get specific error codes
    throw error;
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

