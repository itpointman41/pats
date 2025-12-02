const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = 'pats';

if (!uri) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function createIndexes() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    console.log('\nCreating indexes...\n');
    
    // Users collection indexes
    const users = db.collection('users');
    await users.createIndex({ _id: 1 });
    await users.createIndex({ username: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { sparse: true });
    await users.createIndex({ role: 1 });
    await users.createIndex({ status: 1 });
    await users.createIndex({ createdAt: -1 });
    console.log('✓ Users indexes created');
    
    // Applicants collection indexes
    const applicants = db.collection('applicants');
    await applicants.createIndex({ _id: 1 });
    await applicants.createIndex({ name: 1 });
    await applicants.createIndex({ companyId: 1 });
    await applicants.createIndex({ createdAt: -1 });
    console.log('✓ Applicants indexes created');
    
    // Transmittals collection indexes
    const transmittals = db.collection('transmittals');
    await transmittals.createIndex({ _id: 1 });
    await transmittals.createIndex({ applicantId: 1 });
    await transmittals.createIndex({ status: 1 });
    await transmittals.createIndex({ createdAt: -1 });
    await transmittals.createIndex({ deployedAt: 1 });
    console.log('✓ Transmittals indexes created');
    
    // Companies collection indexes
    const companies = db.collection('company');
    await companies.createIndex({ _id: 1 });
    await companies.createIndex({ companyName: 1 });
    await companies.createIndex({ createdAt: -1 });
    console.log('✓ Companies indexes created');
    
    // Passports collection indexes
    const passports = db.collection('passports');
    await passports.createIndex({ _id: 1 });
    await passports.createIndex({ applicantId: 1 });
    await passports.createIndex({ depositDate: -1 });
    console.log('✓ Passports indexes created');
    
    // Deployments collection indexes
    const deployments = db.collection('deployments');
    await deployments.createIndex({ _id: 1 });
    await deployments.createIndex({ transmittalId: 1 });
    await deployments.createIndex({ applicantId: 1 });
    await deployments.createIndex({ createdAt: -1 });
    console.log('✓ Deployments indexes created');
    
    // Permissions collection indexes
    const permissions = db.collection('permissions');
    await permissions.createIndex({ _id: 1 });
    await permissions.createIndex({ userId: 1 }, { unique: true });
    console.log('✓ Permissions indexes created');
    
    console.log('\n✅ All indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

createIndexes();

