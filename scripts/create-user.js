const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'pats';

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0];
const password = args[1] || 'password123';
const role = args[2] || 'staff';

const validRoles = ['admin', 'hr', 'bio', 'ro', 'staff'];

if (!username) {
  console.error('Usage: node scripts/create-user.js <username> [password] [role]');
  console.error('Roles:', validRoles.join(', '));
  process.exit(1);
}

if (!validRoles.includes(role)) {
  console.error(`Invalid role: ${role}`);
  console.error('Valid roles:', validRoles.join(', '));
  process.exit(1);
}

async function createUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Check if user already exists
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      console.log(`User "${username}" already exists. Updating...`);
      await users.updateOne(
        { username },
        { $set: { password: hashedPassword, role } }
      );
      console.log(`User "${username}" updated successfully!`);
    } else {
      const result = await users.insertOne({
        username,
        password: hashedPassword,
        role,
        createdAt: new Date()
      });
      console.log(`User "${username}" created successfully!`);
      console.log('User ID:', result.insertedId);
    }
    
    await client.close();
    console.log('\nUser credentials:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createUser();

