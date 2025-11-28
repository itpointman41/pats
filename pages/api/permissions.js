import { getDb } from '../../lib/mongodb';
import { getSessionCookie } from '../../lib/auth';
import { ObjectId } from 'mongodb';
import {
  getPermissionsForUser,
  setPermissionsForUser,
  ensureDefaultPermissionsForUser,
  defaultPermissionsForRoleExport
} from '../../lib/permissions';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const users = db.collection('users');
    const session = getSessionCookie(req);

    // Resolve current user if session exists
    let currentUser = null;
    if (session && ObjectId.isValid(session)) {
      currentUser = await users.findOne({ _id: new ObjectId(session) });
    }

    const ensurePermissionsShape = async (userDoc, userId) => {
      if (!userDoc) return null;
      const role = (userDoc.role || 'staff').toLowerCase();
      const defaults = defaultPermissionsForRoleExport(role);

      let permsDoc = await getPermissionsForUser(userId);
      if (!permsDoc) {
        await ensureDefaultPermissionsForUser(userDoc);
        permsDoc = await getPermissionsForUser(userId);
      }
      if (!permsDoc) return null;

      const merged = {
        ...defaults,
        ...(permsDoc.permissions || {}),
      };

      // Persist merged permissions if they differ
      const needsUpdate = Object.keys(defaults).some((key) => merged[key] !== (permsDoc.permissions || {})[key]);
      if (needsUpdate) {
        await setPermissionsForUser(userId, merged);
        permsDoc = await getPermissionsForUser(userId);
        return permsDoc;
      }

      return { ...permsDoc, permissions: merged };
    };

    if (req.method === 'GET') {
      const { userId } = req.query || {};
      // If userId is provided, only allow admins to fetch others' permissions
      if (userId) {
        if (!currentUser || currentUser.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid userId' });
        const targetUser = await users.findOne({ _id: new ObjectId(userId) });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });
        const perms = await ensurePermissionsShape(targetUser, userId);
        return res.status(200).json({ permissions: perms });
      }

      // If no userId, return current user's permissions (or null)
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
      const perms = await ensurePermissionsShape(currentUser, currentUser._id.toString());
      return res.status(200).json({ permissions: perms });
    }

    if (req.method === 'POST') {
      // Only admins can set permissions for arbitrary users
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { userId, permissions } = req.body || {};
      if (!userId || !ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid userId' });
      if (!permissions || typeof permissions !== 'object') return res.status(400).json({ error: 'Invalid permissions' });

      await setPermissionsForUser(userId, permissions);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Permissions API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
