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
    const companies = db.collection('company');

    // GET - List all companies
    if (req.method === 'GET') {
      // Add pagination support
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const skip = (page - 1) * limit;

      // Get total count and data in parallel
      const [totalCount, found] = await Promise.all([
        companies.countDocuments({}),
        companies.find({}).skip(skip).limit(limit).sort({ companyName: 1 }).toArray()
      ]);

      const companiesList = found.map((company) => ({
        _id: company._id.toString(),
        companyName: company.companyName || '',
        crn: company.crn || '',
        dateApprove: company.dateApprove || null,
        dateExpiry: company.dateExpiry || null
      }));

      return res.status(200).json({ 
        companies: companiesList,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }

    // POST - Create new company
    if (req.method === 'POST') {
      const { companyName, crn, dateApprove, dateExpiry } = req.body;

      if (!companyName) {
        return res.status(400).json({ error: 'Company name is required' });
      }

      // Get creator ID (current admin)
      const session = getSessionCookie(req);
      const createdBy = session || null;

      // Create company
      const result = await companies.insertOne({
        companyName: companyName,
        crn: crn || '',
        dateApprove: dateApprove || null,
        dateExpiry: dateExpiry || null,
        createdBy: createdBy,
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Company created successfully',
        company: {
          _id: result.insertedId.toString(),
          companyName,
          crn,
          dateApprove,
          dateExpiry
        }
      });
    }

    // PUT - Update company
    if (req.method === 'PUT') {
      const { _id, companyName, crn, dateApprove, dateExpiry } = req.body;

      if (!_id) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      if (!companyName) {
        return res.status(400).json({ error: 'Company name is required' });
      }

      const updateData = {};
      if (companyName !== undefined) updateData.companyName = companyName;
      if (crn !== undefined) updateData.crn = crn;
      if (dateApprove !== undefined) updateData.dateApprove = dateApprove || null;
      if (dateExpiry !== undefined) updateData.dateExpiry = dateExpiry || null;

      const result = await companies.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Company updated successfully'
      });
    }

    // DELETE - Delete company
    if (req.method === 'DELETE') {
      const { _id } = req.query;

      if (!_id) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const result = await companies.deleteOne({ _id: new ObjectId(_id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Company deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Companies API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

