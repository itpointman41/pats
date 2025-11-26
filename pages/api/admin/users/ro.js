import { getDb } from '../../../../lib/mongodb';
import { getSessionCookie } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

// Middleware to check if user is admin
async function requireAdmin(req) {
  const session = getSessionCookie(req);
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    
    if (!ObjectId.isValid(session)) {
      return { error: 'Unauthorized', status: 401 };
    }

    const user = await users.findOne({ _id: new ObjectId(session) });

    // Allow all authenticated roles for now. This endpoint lists RO users.
    // Future: restrict to specific roles based on `permissions` collection.
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    return { user };
  } catch (error) {
    return { error: 'Internal server error', status: 500 };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin access
    const adminCheck = await requireAdmin(req);
    if (adminCheck.error) {
      return res.status(adminCheck.status).json({ error: adminCheck.error });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Get all users with role 'ro'
    const roUsers = await users.find({ role: 'ro' }).toArray();
    const roUsersList = roUsers.map(user => ({
      _id: user._id.toString(),
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    }));

    return res.status(200).json({ roUsers: roUsersList });
  } catch (error) {
    console.error('RO Users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

