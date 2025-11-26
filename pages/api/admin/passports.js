import { getDb } from '../../../lib/mongodb';
import { getSessionCookie } from '../../../lib/auth';
import { ObjectId } from 'mongodb';

async function requireAdmin(req) {
  const session = getSessionCookie(req);
  if (!session) return { error: 'Unauthorized', status: 401 };

  try {
    const db = await getDb();
    const users = db.collection('users');
    if (!ObjectId.isValid(session)) return { error: 'Unauthorized', status: 401 };
    const user = await users.findOne({ _id: new ObjectId(session) });
    if (!user) return { error: 'Unauthorized', status: 401 };
    // Allow all authenticated roles for now (permissions system will be added)
    // if (user.role !== 'admin') return { error: 'Forbidden', status: 403 };
    return { user };
  } catch (err) {
    console.error('requireAdmin error', err);
    return { error: 'Internal server error', status: 500 };
  }
}

export default async function handler(req, res) {
  try {
    const adminCheck = await requireAdmin(req);
    if (adminCheck.error) return res.status(adminCheck.status).json({ error: adminCheck.error });

    const db = await getDb();
    const passports = db.collection('passports');
    const applicants = db.collection('applicants');

    if (req.method === 'GET') {
      const { applicantId } = req.query || {};
      const query = {};
      if (applicantId) query.applicantId = applicantId;
      const found = await passports.find(query).toArray();
      const list = await Promise.all(found.map(async (p) => {
        let applicantName = '';
        let applicantObj = null;
        if (p.applicantId) {
          try {
            const a = await applicants.findOne({ _id: new ObjectId(p.applicantId) });
            if (a) { applicantName = a.name || ''; applicantObj = { ...a, _id: a._id.toString() }; }
          } catch (err) { console.error('Error fetching applicant for passport', err); }
        }
        return {
          _id: p._id.toString(),
          applicantId: p.applicantId || '',
          applicantName: p.applicantName || applicantName,
          applicant: applicantObj,
          naNo: p.naNo || null,
          passportNos: p.passportNos || null,
          passportExpiry: p.passportExpiry || null,
          depositDate: p.depositDate || null,
          withdrawalDate: p.withdrawalDate || null,
          withdrawalReason: p.withdrawalReason || null,
          remarks: p.remarks || null,
          transmittalId: p.transmittalId || null,
          createdAt: p.createdAt || null
        };
      }));
      return res.status(200).json({ passports: list });
    }

    if (req.method === 'POST') {
      const {
        applicantId,
        naNo,
        applicantName,
        passportNos,
        passportExpiry,
        depositDate,
        withdrawalDate,
        withdrawalReason,
        remarks,
        transmittalId
      } = req.body;

      if (!applicantId) return res.status(400).json({ error: 'applicantId is required' });
      // Validate applicantId is a valid ObjectId
      if (!ObjectId.isValid(applicantId)) {
        return res.status(400).json({ error: 'Invalid applicantId format' });
      }
      const applicant = await applicants.findOne({ _id: new ObjectId(applicantId) });
      if (!applicant) return res.status(400).json({ error: 'No applicant found for applicantId' });

      const session = getSessionCookie(req) || null;
      const update = {
        applicantId: applicantId,
        naNo: naNo || null,
        applicantName: applicantName || null,
        passportNos: passportNos || null,
        passportExpiry: passportExpiry || null,
        depositDate: depositDate || null,
        withdrawalDate: withdrawalDate || null,
        withdrawalReason: withdrawalReason || null,
        remarks: remarks || null,
        transmittalId: transmittalId || null,
        updatedAt: new Date(),
        createdBy: session
      };

      const result = await passports.findOneAndUpdate(
        { applicantId: applicantId },
        { $set: update, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );

      // result.value may be null in some driver/runtime situations; fallback to finding the document
      let passportDoc = result && result.value;
      if (!passportDoc) {
        passportDoc = await passports.findOne({ applicantId: applicantId });
      }
      if (!passportDoc) {
        console.error('Failed to obtain passport document after upsert', { result });
        return res.status(500).json({ error: 'Failed to create or retrieve passport' });
      }

      return res.status(200).json({ success: true, passport: { _id: passportDoc._id.toString() } });
    }

    if (req.method === 'PUT') {
      const { _id } = req.body;
      if (!_id) return res.status(400).json({ error: 'Passport ID is required' });
      if (!ObjectId.isValid(_id)) return res.status(400).json({ error: 'Invalid passport ID format' });
      const updateData = {};
      const fields = ['naNo','applicantName','passportNos','passportExpiry','depositDate','withdrawalDate','withdrawalReason','remarks','transmittalId','applicantId'];
      for (const f of fields) { if (req.body[f] !== undefined) updateData[f] = req.body[f] === '' ? null : req.body[f]; }
      updateData.updatedAt = new Date();
      const result = await passports.updateOne({ _id: new ObjectId(_id) }, { $set: updateData });
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Passport not found' });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { _id } = req.query;
      if (!_id) return res.status(400).json({ error: 'Passport ID is required' });
      if (!ObjectId.isValid(_id)) return res.status(400).json({ error: 'Invalid passport ID format' });
      const result = await passports.deleteOne({ _id: new ObjectId(_id) });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Passport not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // Log full error and return message for debugging
    console.error('Passports API error', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Internal server error', details: err && (err.stack || err.message || err) });
  }
}
