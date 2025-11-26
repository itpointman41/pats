import { getDb } from '../../../lib/mongodb';
import { getSessionCookie } from '../../../lib/auth';
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
      console.error('Invalid session ID format:', session);
      return { error: 'Unauthorized', status: 401 };
    }

    const user = await users.findOne({ _id: new ObjectId(session) });

    if (!user) {
      console.error('User not found for session:', session);
      return { error: 'Unauthorized', status: 401 };
    }

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
    const deployments = db.collection('deployments');
    const transmittals = db.collection('transmittals');
    const applicants = db.collection('applicants');

    // GET - List all deployments with transmittal and applicant details
    if (req.method === 'GET') {
      const found = await deployments.find({}).toArray();

      // Fetch transmittal and applicant data for each deployment
      const deploymentsList = await Promise.all(
        found.map(async (deployment) => {
          let transmittal = null;
          let applicant = null;
          try {
            const transmittalId = deployment.transmittalId;
            if (transmittalId) {
              transmittal = await transmittals.findOne({ _id: new ObjectId(transmittalId) });
            }

            const applicantId = deployment.applicantId;
            if (applicantId) {
              applicant = await applicants.findOne({ _id: new ObjectId(applicantId) });
            }
          } catch (err) {
            console.error('Error fetching transmittal or applicant:', err);
          }

          return {
            _id: deployment._id.toString(),
            transmittalId: deployment.transmittalId || '',
            applicantId: deployment.applicantId || '',
            applicantName: applicant?.name || '',
            visaCompany: deployment.visaCompany || '',
            company: deployment.company || '',
            visaPosition: deployment.visaPosition || '',
            position: deployment.position || '',
            passportNos: deployment.passportNos || '',
            visaNo: deployment.visaNo || '',
            dateOfEmedUploaded: deployment.dateOfEmedUploaded || null,
            dateOfInsurance: deployment.dateOfInsurance || null,
            deployedAt: deployment.deployedAt || null,
            ro: applicant?.ro || '',
            createdAt: deployment.createdAt,
            transmittal: transmittal ? {
              _id: transmittal._id.toString(),
              findings: transmittal.findings || '',
              clinicRemarks: transmittal.clinicRemarks || '',
              clinic: transmittal.clinic || '',
              payment: transmittal.payment || '',
              remarks: transmittal.remarks || '',
              dateOfMedical: transmittal.dateOfMedical || null,
              medicalExpiration: transmittal.medicalExpiration || null,
              medicalCert: transmittal.medicalCert || false,
              vaccineCert: transmittal.vaccineCert || false,
              biometric: transmittal.biometric || false,
              stampVisa: transmittal.stampVisa || false,
              waiver: transmittal.waiver || false,
              status: transmittal.status || 'pending',
              createdAt: transmittal.createdAt
            } : null
          };
        })
      );

      return res.status(200).json({ deployments: deploymentsList });
    }

    // PUT - Update deployment (deployment-specific fields only)
    if (req.method === 'PUT') {
      const {
        _id,
        visaCompany,
        company,
        visaPosition,
        position,
        passportNos,
        visaNo,
        dateOfEmedUploaded,
        dateOfInsurance,
        deployedAt
      } = req.body;

      if (!_id) {
        return res.status(400).json({ error: 'Deployment ID is required' });
      }

      const updateData = {};
      if (visaCompany !== undefined) updateData.visaCompany = visaCompany || null;
      if (company !== undefined) updateData.company = company || null;
      if (visaPosition !== undefined) updateData.visaPosition = visaPosition || null;
      if (position !== undefined) updateData.position = position || null;
      if (passportNos !== undefined) updateData.passportNos = passportNos || null;
      if (visaNo !== undefined) updateData.visaNo = visaNo || null;
      if (dateOfEmedUploaded !== undefined) updateData.dateOfEmedUploaded = dateOfEmedUploaded || null;
      if (dateOfInsurance !== undefined) updateData.dateOfInsurance = dateOfInsurance || null;
      if (deployedAt !== undefined) updateData.deployedAt = deployedAt || null;

      const result = await deployments.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Deployment updated successfully'
      });
    }

    // DELETE - Remove deployment
    if (req.method === 'DELETE') {
      const { _id } = req.query;

      if (!_id) {
        return res.status(400).json({ error: 'Deployment ID is required' });
      }

      const result = await deployments.deleteOne({ _id: new ObjectId(_id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Deployment deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Deployments API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
