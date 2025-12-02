import { getDb } from '../../../../lib/mongodb';
import { getSessionCookie } from '../../../../lib/auth';
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

    const allowedRoles = ['admin', 'ro', 'receptionist'];
    if (!allowedRoles.includes((user.role || '').toLowerCase())) {
        console.error('User does not have dashboard access. Role:', user.role, 'Session:', session);
      return { error: 'Forbidden', status: 403 };
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

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Add simple caching (5 seconds) to reduce database load
    const cacheKey = 'dashboard-stats';
    const cache = global.dashboardCache || {};
    const now = Date.now();
    
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp < 5000)) {
      // Set cache headers
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
      return res.status(200).json(cache[cacheKey].data);
    }

    const db = await getDb();
    const applicants = db.collection('applicants');
    const transmittals = db.collection('transmittals');
    const users = db.collection('users');
    const passports = db.collection('passports');

    // Get total counts
    const totalApplicants = await applicants.countDocuments({});
    const totalTransmittals = await transmittals.countDocuments({});
    const totalUsers = await users.countDocuments({});
    const totalPassports = await passports.countDocuments({});

    // Get transmittal status breakdown
    const transmittalStatuses = await transmittals.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const statusBreakdown = {
      pending: 0,
      deployed: 0,
      process: 0,
      encode: 0,
      deployment: 0,
      other: 0
    };

    transmittalStatuses.forEach(item => {
      const status = (item._id || 'pending').toLowerCase();
      if (statusBreakdown.hasOwnProperty(status)) {
        statusBreakdown[status] = item.count;
      } else {
        statusBreakdown.other += item.count;
      }
    });

    // Get user role breakdown
    const userRoles = await users.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const roleBreakdown = {
      admin: 0,
      hr: 0,
      bio: 0,
      ro: 0,
      receptionist: 0,
      staff: 0
    };

    userRoles.forEach(item => {
      const role = (item._id || 'staff').toLowerCase();
      if (roleBreakdown.hasOwnProperty(role)) {
        roleBreakdown[role] = item.count;
      }
    });

    // Get applicants created over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const applicantsOverTime = await applicants.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    const deployedAtProjection = {
      $addFields: {
        deployedAtDate: {
          $cond: [
            { $eq: [{ $type: '$deployedAt' }, 'string'] },
            {
              $dateFromString: {
                dateString: '$deployedAt',
                onError: null,
                onNull: null
              }
            },
            '$deployedAt'
          ]
        }
      }
    };

    // Get deployments over time (last 12 months)
    const deploymentsOverTime = await transmittals.aggregate([
      deployedAtProjection,
      {
        $match: {
          status: { $in: ['deployed', 'deployment'] },
          deployedAtDate: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$deployedAtDate' },
            month: { $month: '$deployedAtDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentApplicants = await applicants.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentDeploymentsAgg = await transmittals.aggregate([
      deployedAtProjection,
      {
        $match: {
          status: { $in: ['deployed', 'deployment'] },
          deployedAtDate: { $gte: thirtyDaysAgo }
        }
      },
      { $count: 'count' }
    ]).toArray();
    const recentDeployments = recentDeploymentsAgg[0]?.count || 0;

    // Format time series data for charts
    const formatTimeSeries = (data) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return data.map(item => ({
        month: `${months[item._id.month - 1]} ${item._id.year}`,
        count: item.count
      }));
    };

    const responseData = {
      totals: {
        applicants: totalApplicants,
        transmittals: totalTransmittals,
        users: totalUsers,
        passports: totalPassports
      },
      statusBreakdown,
      roleBreakdown,
      applicantsOverTime: formatTimeSeries(applicantsOverTime),
      deploymentsOverTime: formatTimeSeries(deploymentsOverTime),
      recent: {
        applicants: recentApplicants,
        deployments: recentDeployments
      }
    };

    // Cache the response
    if (!global.dashboardCache) global.dashboardCache = {};
    global.dashboardCache[cacheKey] = {
      data: responseData,
      timestamp: now
    };

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

