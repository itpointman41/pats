/**
 * Script to create empty transmittals for existing applicants that don't have one
 * Run with: node scripts/create-transmittals-for-existing-applicants.js
 */

const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'pats';

async function createTransmittalsForExistingApplicants() {
  let client;
  
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const applicants = db.collection('applicants');
    const transmittals = db.collection('transmittals');

    // Get all applicants
    const allApplicants = await applicants.find({}).toArray();
    console.log(`Found ${allApplicants.length} applicants`);

    // Get all existing transmittals to check which applicants already have one
    const existingTransmittals = await transmittals.find({}).toArray();
    const applicantsWithTransmittals = new Set(
      existingTransmittals
        .map(t => t.applicantId?.toString())
        .filter(id => id)
    );
    console.log(`Found ${applicantsWithTransmittals.size} applicants with existing transmittals`);

    let created = 0;
    let skipped = 0;

    // Create transmittals for applicants that don't have one
    for (const applicant of allApplicants) {
      const applicantId = applicant._id.toString();
      
      if (applicantsWithTransmittals.has(applicantId)) {
        skipped++;
        continue;
      }

      // Create empty transmittal
      await transmittals.insertOne({
        applicantId: applicantId,
        dateOfMedical: null,
        medicalExpiration: null,
        findings: '',
        clinicRemarks: '',
        clinic: '',
        payment: '',
        remarks: '',
        status: 'pending',
        createdBy: applicant.createdBy || null,
        createdAt: new Date()
      });

      created++;
      console.log(`Created transmittal for applicant: ${applicant.name} (${applicantId})`);
    }

    console.log(`\nSummary:`);
    console.log(`- Created: ${created} transmittals`);
    console.log(`- Skipped: ${skipped} applicants (already have transmittals)`);
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

createTransmittalsForExistingApplicants();

