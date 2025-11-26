import { requireAuth } from '../../lib/auth';
import { redirect } from 'next/navigation';
import NavBarAdmin from '../../components/nav_bar_admin';
import DashboardContent from './DashboardContent';

export default async function AdminDashboardPage() {
    try {
            const session = await requireAuth();
            const { getDb } = await import('../../lib/mongodb');
            const { ObjectId } = await import('mongodb');
        
            const db = await getDb();
            const users = db.collection('users');
            const user = await users.findOne({ _id: new ObjectId(session) });
        
            if (!user) {
                redirect('/');
            }
        
        return (
            <div className="min-h-screen bg-[var(--surface-muted)]">
                <NavBarAdmin username={user.username} role={user.role} />
                <DashboardContent />
            </div>
        );
    } catch (error) {
        redirect('/');
    }
}
