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

    // Allow all authenticated roles for now; permissions will be enforced later.
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
    const applicants = db.collection('applicants');

    // GET - List all applicants or fetch single by _id
    if (req.method === 'GET') {
      const { _id } = req.query || {};
      if (_id) {
        if (!ObjectId.isValid(_id)) {
          return res.status(400).json({ error: 'Invalid applicant ID' });
        }
        const applicant = await applicants.findOne({ _id: new ObjectId(_id) });
        if (!applicant) {
          return res.status(404).json({ error: 'Applicant not found' });
        }
        // Return full applicant object (stringify _id and companyId)
        return res.status(200).json({ 
          applicant: { 
            ...applicant, 
            _id: applicant._id.toString(),
            companyId: applicant.companyId ? applicant.companyId.toString() : null
          } 
        });
      }

      const allApplicants = await applicants.find({}).toArray();
      const applicantsList = allApplicants.map(applicant => ({
        _id: applicant._id.toString(),
        name: applicant.name || '',
        position: applicant.position || '',
        company: applicant.company || '',
        companyId: applicant.companyId ? applicant.companyId.toString() : null,
        ro: applicant.ro || '',
        phoneNumber: applicant.phoneNumber || '',
        createdAt: applicant.createdAt
      }));
      return res.status(200).json({ applicants: applicantsList });
    }

    // POST - Create new applicant
    if (req.method === 'POST') {
      const { name, position, company, companyId, ro, phoneNumber } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Get creator ID (current admin)
      const session = getSessionCookie(req);
      const createdBy = session || null;

      // Create applicant
      const applicantData = {
        name,
        position: position || '',
        company: company || '',
        ro: ro || '',
        phoneNumber: phoneNumber || '',
        createdBy: createdBy,
        createdAt: new Date()
      };

      // Add companyId if provided and valid
      if (companyId && ObjectId.isValid(companyId)) {
        applicantData.companyId = new ObjectId(companyId);
      }

      const result = await applicants.insertOne(applicantData);

      const applicantId = result.insertedId.toString();

      // Automatically create an empty transmittal for the new applicant
      try {
        const transmittals = db.collection('transmittals');
        await transmittals.insertOne({
          applicantId: applicantId,
          dateOfMedical: null,
          medicalExpiration: null,
          findings: '',
          clinicRemarks: '',
          clinic: '',
          payment: '',
          remarks: '',
          createdBy: createdBy,
          createdAt: new Date()
        });
      } catch (transmittalError) {
        console.error('Error creating transmittal for applicant:', transmittalError);
        // Don't fail the applicant creation if transmittal creation fails
      }

      return res.status(201).json({
        success: true,
        message: 'Applicant created successfully',
        applicant: {
          _id: applicantId,
          name,
          position,
          company,
          ro
        }
      });
    }

    // PUT - Update applicant
    if (req.method === 'PUT') {
      const { _id, name, position, company, companyId, ro, phoneNumber } = req.body;

      if (!_id) {
        return res.status(400).json({ error: 'Applicant ID is required' });
      }

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (position !== undefined) updateData.position = position;
      if (company !== undefined) updateData.company = company;
      if (ro !== undefined) updateData.ro = ro;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      // Handle companyId - convert to ObjectId if provided
      if (companyId !== undefined) {
        if (companyId && ObjectId.isValid(companyId)) {
          updateData.companyId = new ObjectId(companyId);
        } else if (companyId === null || companyId === '') {
          updateData.companyId = null;
        }
      }

      const result = await applicants.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Applicant not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Applicant updated successfully'
      });
    }

    // DELETE - Delete applicant
    if (req.method === 'DELETE') {
      const { _id } = req.query;

      if (!_id) {
        return res.status(400).json({ error: 'Applicant ID is required' });
      }

      const result = await applicants.deleteOne({ _id: new ObjectId(_id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Applicant not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Applicant deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Applicants API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

