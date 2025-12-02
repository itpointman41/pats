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

    // GET - List deployments with server-side pagination and optional search
    if (req.method === 'GET') {
      const {
        page = 1,
        limit: limitParam,
        search = ''
      } = req.query || {};

      const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
      const requestedLimit = limitParam !== undefined ? parseInt(limitParam, 10) : NaN;
      const baseLimit = Number.isNaN(requestedLimit) ? 25 : requestedLimit;
      const parsedLimit = Math.min(Math.max(baseLimit, 1), 200);
      const skip = (parsedPage - 1) * parsedLimit;

      const matchStage = {};

      // Build aggregation pipeline with applicant lookup so we can search by applicant fields
      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'applicants',
            let: {
              applicantIdStr: {
                $cond: [
                  { $eq: [{ $type: '$applicantId' }, 'objectId'] },
                  { $toString: '$applicantId' },
                  '$applicantId'
                ]
              }
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: ['$$applicantIdStr', null] },
                      { $eq: [{ $toString: '$_id' }, '$$applicantIdStr'] }
                    ]
                  }
                }
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  company: 1,
                  position: 1,
                  ro: 1
                }
              }
            ],
            as: 'applicant'
          }
        },
        { $unwind: { path: '$applicant', preserveNullAndEmptyArrays: true } }
      ];

      // Add search across relevant fields if provided
      if (search) {
        const regex = new RegExp(String(search), 'i');
        pipeline.push({
          $match: {
            $or: [
              { 'applicant.name': regex },
              { 'applicant.company': regex },
              { 'applicant.position': regex },
              { visaCompany: regex },
              { company: regex },
              { visaPosition: regex },
              { position: regex },
              { passportNos: regex },
              { visaNo: regex }
            ]
          }
        });
      }

      const facetPipeline = [
        ...pipeline,
        {
          $facet: {
            data: [
              { $sort: { deployedAt: -1, createdAt: -1 } },
              { $skip: skip },
              { $limit: parsedLimit }
            ],
            totalCount: [
              { $count: 'count' }
            ]
          }
        }
      ];

      const agg = await deployments.aggregate(facetPipeline).toArray();
      const payload = agg[0] || {};
      const resultData = payload.data || [];
      const totalCount = payload.totalCount?.[0]?.count || 0;

      const deploymentsList = resultData.map((deployment) => {
        const applicant = deployment.applicant || null;
        const applicantIdValue =
          typeof deployment.applicantId === 'object' && deployment.applicantId?.toString
            ? deployment.applicantId.toString()
            : deployment.applicantId || (applicant?._id?.toString?.() ?? '');

        return {
          _id: deployment._id.toString(),
          transmittalId: deployment.transmittalId || '',
          applicantId: applicantIdValue,
          applicantName: applicant?.name || '',
          applicantCompany: applicant?.company || '',
          applicantPosition: applicant?.position || '',
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
          createdAt: deployment.createdAt || null
        };
      });

      return res.status(200).json({
        deployments: deploymentsList,
        pagination: {
          total: totalCount,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalCount / parsedLimit)
        }
      });
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
