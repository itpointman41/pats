import { getDb } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test MongoDB connection
    const db = await getDb();
    
    // Try a simple operation
    const collections = await db.listCollections().toArray();
    
    res.status(200).json({ 
      success: true,
      message: 'Database connection successful',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      hasUri: !!process.env.MONGODB_URI,
      uriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'not set'
    });
  } catch (error) {
    console.error('Database test error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Database connection failed',
      message: error.message,
      code: error.code,
      hasUri: !!process.env.MONGODB_URI,
      uriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'not set'
    });
  }
}

