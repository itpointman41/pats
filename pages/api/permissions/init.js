import { getDb } from '../../../lib/mongodb';
import { getSessionCookie } from '../../../lib/auth';
import { ObjectId } from 'mongodb';
import { ensureDefaultPermissionsForUser } from '../../../lib/permissions';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const session = getSessionCookie(req);
    if (!session || !ObjectId.isValid(session)) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    const users = db.collection('users');
    const current = await users.findOne({ _id: new ObjectId(session) });
    if (!current || current.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    // Iterate all users and ensure default permissions per their role
    const cursor = users.find({});
    let count = 0;
    while (await cursor.hasNext()) {
      const u = await cursor.next();
      try {
        await ensureDefaultPermissionsForUser(u);
        count++;
      } catch (e) {
        console.error('Error setting permissions for user', u._id, e);
      }
    }

    return res.status(200).json({ success: true, usersProcessed: count });
  } catch (err) {
    console.error('Permissions init error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
