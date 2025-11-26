import { requireAuth } from "../../lib/auth";
import { redirect } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";

export default async function AdminProfilePage() {
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
        <div className="p-6 sm:p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-muted)]">Account</p>
              <h1 className="text-3xl font-semibold text-[var(--color-text)]">Profile</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">View your admin account details.</p>
            </div>

            <div className="card p-6 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-[var(--color-secondary)] text-white text-2xl font-semibold flex items-center justify-center">
                    {(user.firstName || user.username || "A").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text)]">{user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.username}</p>
                    <p className="text-sm text-[var(--color-text-muted)] capitalize">{user.role}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ProfileField label="Username" value={user.username} />
                <ProfileField label="Email" value={user.email || "—"} />
                <ProfileField label="Phone Number" value={user.phoneNumber || "—"} />
                <ProfileField label="Status" value={(user.status || "active").toUpperCase()} />
                <ProfileField label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"} />
                <ProfileField label="Created At" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    redirect("/");
  }
}

function ProfileField({ label, value }) {
  return (
    <div className="border border-[var(--color-border)] rounded-2xl p-4 bg-white/80">
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-base text-[var(--color-text)] mt-1">{value}</p>
    </div>
  );
}

