import { getDb } from '../../../lib/mongodb';
import { getSessionCookie } from '../../../lib/auth';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Function to automatically set inactive users (not logged in for 1+ week)
async function updateInactiveUsers() {
  try {
    const db = await getDb();
    const users = db.collection('users');
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Update users who haven't logged in for more than 1 week
    // Only update if they're currently active (not suspended)
    const result = await users.updateMany(
      {
        $or: [
          { lastLogin: { $lt: oneWeekAgo } },
          { lastLogin: null }
        ],
        status: { $ne: 'suspended' }
      },
      {
        $set: { status: 'inactive' }
      }
    );
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Error updating inactive users:', error);
    return 0;
  }
}

// Middleware to check if user is admin
async function requireAdmin(req) {
  const session = getSessionCookie(req);
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  try {
    const db = await getDb();
    const users = db.collection('users');
    
    // Validate ObjectId format
    if (!ObjectId.isValid(session)) {
      console.error('Invalid session ID format:', session);
      return { error: 'Unauthorized', status: 401 };
    }

    const user = await users.findOne({ _id: new ObjectId(session) });

    if (!user) {
      console.error('User not found for session:', session);
      return { error: 'Unauthorized', status: 401 };
    }

    // Temporarily allow all authenticated roles to access user APIs.
    // Will enforce permissions from the `permissions` collection later.
    // if (user.role !== 'admin') { return { error: 'Forbidden', status: 403 }; }

    return { user };
  } catch (error) {
    console.error('Error in requireAdmin:', error);
    return { error: 'Internal server error', status: 500 };
  }
}

export default async function handler(req, res) {
  try {
    // Check admin access
    const adminCheck = await requireAdmin(req);
    if (adminCheck.error) {
      console.error('Admin check failed:', adminCheck.error, 'Status:', adminCheck.status);
      return res.status(adminCheck.status).json({ error: adminCheck.error });
    }

    const db = await getDb();
    const users = db.collection('users');

    // GET - List all users
    if (req.method === 'GET') {
      // Update inactive users before fetching
      await updateInactiveUsers();
      
      const allUsers = await users.find({}).toArray();
      const usersList = allUsers.map(user => ({
        _id: user._id.toString(),
        username: user.username,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || 'staff',
        status: user.status || 'active',
        lastLogin: user.lastLogin || null,
        createdBy: user.createdBy || null,
        profilePicture: user.profilePicture || '',
        createdAt: user.createdAt
      }));
      return res.status(200).json({ users: usersList });
    }

    // POST - Create new user
    if (req.method === 'POST') {
      const { 
        username, 
        password, 
        role, 
        firstName, 
        lastName, 
        email, 
        phoneNumber, 
        profilePicture 
      } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const validRoles = ['admin', 'hr', 'bio', 'ro', 'staff', 'receptionist'];
      const userRole = role || 'staff';
      if (!validRoles.includes(userRole)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Status is automatically set to 'active' for new users
      const userStatus = 'active';

      // Check if user already exists
      const existingUser = await users.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await users.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Get creator ID (current admin)
      const session = getSessionCookie(req);
      const createdBy = session || null;

      // Create user
      const result = await users.insertOne({
        username,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || '',
        phoneNumber: phoneNumber || '',
        role: userRole,
        status: userStatus,
        lastLogin: null,
        createdBy: createdBy,
        profilePicture: profilePicture || '',
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          _id: result.insertedId.toString(),
          username,
          role: userRole
        }
      });
    }

    // PUT - Update user
    if (req.method === 'PUT') {
      const { 
        _id, 
        username, 
        password, 
        role, 
        firstName, 
        lastName, 
        email, 
        phoneNumber, 
        profilePicture 
      } = req.body;

      if (!_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const validRoles = ['admin', 'hr', 'bio', 'ro', 'staff', 'receptionist'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (role) updateData.role = role;
      // Status is automatically managed - not editable through API
      if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Check if username is being changed and if it's already taken
      if (username) {
        const existingUser = await users.findOne({ 
          username, 
          _id: { $ne: new ObjectId(_id) } 
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      // Check if email is being changed and if it's already taken
      if (email) {
        const existingEmail = await users.findOne({ 
          email, 
          _id: { $ne: new ObjectId(_id) } 
        });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      const result = await users.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'User updated successfully'
      });
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
      const { _id } = req.query;

      if (!_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Prevent deleting yourself
      const session = getSessionCookie(req);
      if (session === _id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const result = await users.deleteOne({ _id: new ObjectId(_id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

