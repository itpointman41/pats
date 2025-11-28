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

    // Temporarily allow all authenticated roles to access transmittals APIs.
    // Permission enforcement will be implemented via the permissions collection.
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
    const transmittals = db.collection('transmittals');
    const applicants = db.collection('applicants');

    // GET - List all transmittals with applicant names OR filter by applicantId
    if (req.method === 'GET') {
      const { applicantId } = req.query || {};
      let query = {};
      if (applicantId) {
        query.applicantId = applicantId;
      }

      const found = await transmittals.find(query).toArray();

      // Fetch applicant names for each transmittal
      const transmittalsList = await Promise.all(
        found.map(async (transmittal) => {
          let applicantName = '';
          let applicantObj = null;
          if (transmittal.applicantId) {
            try {
              const applicant = await applicants.findOne({ 
                _id: new ObjectId(transmittal.applicantId) 
              });
              applicantName = applicant ? applicant.name : '';
              if (applicant) {
                applicantObj = { ...applicant, _id: applicant._id.toString() };
              }
            } catch (err) {
              console.error('Error fetching applicant:', err);
            }
          }

          return {
            _id: transmittal._id.toString(),
            applicantId: transmittal.applicantId || '',
            applicantName: applicantName,
            applicant: applicantObj,
            visaCompany: transmittal.visaCompany || '',
            company: transmittal.company || '',
            visaPosition: transmittal.visaPosition || '',
            position: transmittal.position || '',
            passportNos: transmittal.passportNos || '',
            visaNo: transmittal.visaNo || transmittal.sponsorNo || transmittal.visa_number || '',
            medicalCert: transmittal.medicalCert || false,
            vaccineCert: transmittal.vaccineCert || false,
            dateOfEmedUploaded: transmittal.dateOfEmedUploaded || null,
            deployedAt: transmittal.deployedAt || null,
            dateOfMedical: transmittal.dateOfMedical || null,
            medicalExpiration: transmittal.medicalExpiration || null,
            findings: transmittal.findings || '',
            clinicRemarks: transmittal.clinicRemarks || '',
            clinic: transmittal.clinic || '',
            payment: transmittal.payment || '',
            remarks: transmittal.remarks || '',
            biometric: transmittal.biometric || false,
            stampVisa: transmittal.stampVisa || false,
            dateOfInsurance: transmittal.dateOfInsurance || null,
            waiver: transmittal.waiver || false,
            remed: transmittal.remed || false,
            status: transmittal.status || 'pending',
            createdAt: transmittal.createdAt
          };
        })
      );

      return res.status(200).json({ transmittals: transmittalsList });
    }

    // POST - Create new transmittal
    if (req.method === 'POST') {
      const {
        applicantId,
        dateOfMedical,
        medicalExpiration,
        findings,
        clinicRemarks,
        clinic,
        payment,
        remarks,
        medicalCert,
        vaccineCert,
        dateOfEmedUploaded,
        biometric,
        stampVisa,
        dateOfInsurance,
        waiver,
        remed
      } = req.body;

      if (!applicantId) {
        return res.status(400).json({ error: 'Applicant is required' });
      }

      // Validate applicant exists
      try {
        const applicant = await applicants.findOne({ 
          _id: new ObjectId(applicantId) 
        });
        if (!applicant) {
          return res.status(400).json({ error: 'Invalid applicant' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid applicant ID' });
      }

      // Get creator ID (current admin)
      const session = getSessionCookie(req);
      const createdBy = session || null;

      // Create transmittal (default status: pending)
      const result = await transmittals.insertOne({
        applicantId: applicantId,
        dateOfMedical: dateOfMedical || null,
        medicalExpiration: medicalExpiration || null,
        findings: findings || '',
        clinicRemarks: clinicRemarks || '',
        clinic: clinic || '',
        payment: payment || '',
        remarks: remarks || '',
        medicalCert: medicalCert || false,
        vaccineCert: vaccineCert || false,
        dateOfEmedUploaded: dateOfEmedUploaded || null,
        biometric: biometric || false,
        stampVisa: stampVisa || false,
        dateOfInsurance: dateOfInsurance || null,
        waiver: waiver || false,
        remed: remed || false,
        status: 'pending',
        createdBy: createdBy,
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Transmittal created successfully',
        transmittal: {
          _id: result.insertedId.toString()
        }
      });
    }

    // PUT - Update transmittal (partial updates allowed, including status)
    if (req.method === 'PUT') {
      const {
        _id,
        applicantId,
        visaCompany,
        company,
        visaPosition,
        position,
        passportNos,
        visaNo,
        dateOfMedical,
        medicalExpiration,
        findings,
        clinicRemarks,
        clinic,
        payment,
        remarks,
        medicalCert,
        vaccineCert,
        dateOfEmedUploaded,
        biometric,
        stampVisa,
        dateOfInsurance,
        waiver,
        remed,
        status,
        deployedAt
      } = req.body;

      if (!_id) {
        return res.status(400).json({ error: 'Transmittal ID is required' });
      }
      // If applicantId is provided, validate it
      if (applicantId !== undefined && applicantId !== null && applicantId !== '') {
        try {
          const applicant = await applicants.findOne({ _id: new ObjectId(applicantId) });
          if (!applicant) {
            return res.status(400).json({ error: 'Invalid applicant' });
          }
        } catch (err) {
          return res.status(400).json({ error: 'Invalid applicant ID' });
        }
      }

      const updateData = {};
      if (applicantId !== undefined) updateData.applicantId = applicantId;
      // deployment-specific fields (visaCompany, company, position, etc.) will be moved
      // into a separate `deployments` collection when a transmittal is marked deployed.
      // Only keep non-deployment transmittal fields here.
      if (dateOfMedical !== undefined) updateData.dateOfMedical = dateOfMedical || null;
      if (medicalExpiration !== undefined) updateData.medicalExpiration = medicalExpiration || null;
      if (findings !== undefined) updateData.findings = findings;
      if (clinicRemarks !== undefined) updateData.clinicRemarks = clinicRemarks;
      if (clinic !== undefined) updateData.clinic = clinic;
      if (payment !== undefined) updateData.payment = payment;
      if (remarks !== undefined) updateData.remarks = remarks;
      if (medicalCert !== undefined) updateData.medicalCert = medicalCert;
      if (vaccineCert !== undefined) updateData.vaccineCert = vaccineCert;
      if (dateOfEmedUploaded !== undefined) updateData.dateOfEmedUploaded = dateOfEmedUploaded || null;
      if (biometric !== undefined) updateData.biometric = biometric;
      if (stampVisa !== undefined) updateData.stampVisa = stampVisa;
      if (dateOfInsurance !== undefined) updateData.dateOfInsurance = dateOfInsurance || null;
      if (waiver !== undefined) updateData.waiver = waiver;
      if (remed !== undefined) updateData.remed = remed;
      // always allow deployedAt and status on transmittal, but deployment details go to deployments collection
      if (deployedAt !== undefined) updateData.deployedAt = deployedAt || null;
      if (status !== undefined) updateData.status = status;

      // If this update marks the transmittal as deployed, create/update a deployments doc
      const deployments = db.collection('deployments');
      const markingDeployed = (status && String(status).toLowerCase() === 'deployed') || (deployedAt !== undefined && deployedAt);

      // Apply update to transmittal first
      const result = await transmittals.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Transmittal not found' });
      }

      if (markingDeployed) {
        // build deployment doc from provided fields (prefer request body fields, fallback to current transmittal)
        const current = await transmittals.findOne({ _id: new ObjectId(_id) });
        const doc = {
          transmittalId: String(_id),
          applicantId: applicantId || (current && current.applicantId) || null,
          deployedAt: deployedAt || (current && current.deployedAt) || new Date().toISOString(),
          createdBy: getSessionCookie(req) || null,
          createdAt: new Date()
        };

        // Fetch applicant doc if available so we can avoid duplicating applicant-level fields
        let applicantDoc = null;
        try {
          if (doc.applicantId) {
            applicantDoc = await applicants.findOne({ _id: new ObjectId(doc.applicantId) });
          }
        } catch (e) {
          // ignore lookup errors
          applicantDoc = null;
        }

        // Ensure deployment document includes requested deployment fields.
        // Prefer request body values, then values from the transmittal, then applicant document.
        doc.visaCompany = (visaCompany !== undefined) ? (visaCompany || null) : (current && current.visaCompany) || (applicantDoc && applicantDoc.visaCompany) || null;
        doc.company = (company !== undefined) ? (company || null) : (current && current.company) || (applicantDoc && applicantDoc.company) || null;
        doc.visaPosition = (visaPosition !== undefined) ? (visaPosition || null) : (current && current.visaPosition) || (applicantDoc && applicantDoc.visaPosition) || null;
        doc.position = (position !== undefined) ? (position || null) : (current && current.position) || (applicantDoc && applicantDoc.position) || null;
        doc.passportNos = (passportNos !== undefined) ? (passportNos || null) : (current && current.passportNos) || (applicantDoc && applicantDoc.passportNos) || null;
        // visaNo may be stored under several keys on transmittal/applicant; prefer request body if provided
        if (visaNo !== undefined) {
          doc.visaNo = visaNo || null;
        } else if (current && (current.visaNo || current.sponsorNo || current.visa_number)) {
          doc.visaNo = current.visaNo || current.sponsorNo || current.visa_number || null;
        } else if (applicantDoc && (applicantDoc.visaNo || applicantDoc.sponsorNo || applicantDoc.visa_number)) {
          doc.visaNo = applicantDoc.visaNo || applicantDoc.sponsorNo || applicantDoc.visa_number || null;
        } else {
          doc.visaNo = null;
        }
        // Ensure we don't duplicate: update existing deployment for this transmittal or insert
        const existing = await deployments.findOne({ transmittalId: String(_id) }) || await deployments.findOne({ transmittalId: _id });
        if (existing) {
          await deployments.updateOne({ _id: existing._id }, { $set: doc });
        } else {
          // store transmittalId as string for simplicity
          doc.transmittalId = String(_id);
          await deployments.insertOne(doc);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Transmittal updated successfully'
      });
    }

    // DELETE - Delete transmittal
    if (req.method === 'DELETE') {
      const { _id } = req.query;

      if (!_id) {
        return res.status(400).json({ error: 'Transmittal ID is required' });
      }

      const result = await transmittals.deleteOne({ _id: new ObjectId(_id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Transmittal not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Transmittal deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Transmittals API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

