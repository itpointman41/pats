import { getSessionCookie } from '../../../lib/auth';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = getSessionCookie(req);
    if (session) {
      // Fetch user role from database
      const db = await getDb();
      const users = db.collection('users');
      const user = await users.findOne({ _id: new ObjectId(session) });
      
      if (user) {
        res.status(200).json({ 
          authenticated: true, 
          userId: session,
          username: user.username || '',
          role: user.role || 'staff'
        });
      } else {
        res.status(200).json({ authenticated: false });
      }
    } else {
      res.status(200).json({ authenticated: false });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

