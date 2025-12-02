import { getDb } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import { setSessionCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Find user
    const user = await users.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if user is suspended (suspended users cannot log in)
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    // Automatically set status to 'active' on successful login and update last login
    await users.updateOne(
      { _id: user._id },
      { $set: { 
        status: 'active',
        lastLogin: new Date()
      } }
    );

    // Set session with remember me option
    setSessionCookie(res, user._id.toString(), rememberMe === true);

    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      userId: user._id.toString(),
      role: user.role || 'staff'
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Check if it's a MongoDB connection error
    if (error.message && error.message.includes('MONGODB_URI')) {
      return res.status(500).json({ 
        error: 'Database configuration error. Please contact the administrator.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Check if it's a database connection error
    if (error.message && error.message.includes('Database connection failed')) {
      return res.status(500).json({ 
        error: 'Unable to connect to database. Please contact the administrator.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

