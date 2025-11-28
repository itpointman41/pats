import { getDb } from './mongodb';
import { ObjectId } from 'mongodb';

function defaultPermissionsForRole(role) {
  const full = 'full';
  const read = 'read';
  const none = 'none';

  // Define resources that the app uses
  const resources = [
    'applicants',
    'transmittals',
    'passports',
    'users',
    'dashboard',
    'deployment',
    'profile',
    'settings',
    'companies'
  ];

  // Admin: full access everywhere
  if (role === 'admin') {
    const perms = {};
    resources.forEach(r => (perms[r] = full));
    return perms;
  }

  // Default for other roles: view/read-only for most resources, full for profile
  const perms = {};
  resources.forEach(r => {
    if (r === 'profile') perms[r] = full; // can edit own profile
    else perms[r] = read;
  });
  return perms;
}

export async function getPermissionsForUser(userId) {
  const db = await getDb();
  const permissions = db.collection('permissions');
  if (!ObjectId.isValid(userId)) return null;
  const found = await permissions.findOne({ userId: new ObjectId(userId) });
  return found || null;
}

export async function setPermissionsForUser(userId, permissionsObj) {
  const db = await getDb();
  const permissions = db.collection('permissions');
  if (!ObjectId.isValid(userId)) throw new Error('Invalid userId');
  const filter = { userId: new ObjectId(userId) };
  const update = {
    $set: {
      userId: new ObjectId(userId),
      permissions: permissionsObj,
      updatedAt: new Date()
    },
    $setOnInsert: { createdAt: new Date() }
  };
  const opts = { upsert: true };
  await permissions.updateOne(filter, update, opts);
  return { success: true };
}

export async function ensureDefaultPermissionsForUser(user) {
  // user is a document from users collection
  if (!user || !user._id) throw new Error('Invalid user');
  const role = (user.role || 'staff').toLowerCase();
  const perms = defaultPermissionsForRole(role);
  await setPermissionsForUser(user._id.toString(), perms);
  return perms;
}

export function defaultPermissionsForRoleExport(role) {
  return defaultPermissionsForRole(role);
}
