import { requireAuth } from "../../lib/auth";
import { redirect } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import dynamic from "next/dynamic";

const AccountSettingsClient = dynamic(() =>
  import("../../components/AccountSettingsClient")
);
const PermissionsManager = dynamic(() =>
  import("../../components/PermissionsManager")
);

export default async function AdminSettingsPage() {
  try {
    const session = await requireAuth();
    const { getDb } = await import("../../lib/mongodb");
    const { ObjectId } = await import("mongodb");

    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ _id: new ObjectId(session) });

    if (!user) redirect("/");

    // IMPORTANT: never override role with "staff"
    const clientUser = {
      _id: user._id.toString(),
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      role: user.role,            // <-- FIXED
      status: user.status || "active",
    };

    return (
      <div className="min-h-screen bg-[var(--surface-muted)]">
        <NavBarAdmin username={user.username} role={user.role} />

        <div className="p-6 sm:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              {/* LEFT SIDE TABS */}
              <aside className="md:col-span-1">
                <nav className="sticky top-20 space-y-2">
                  <button id="tab-account" className="w-full text-left p-3 border-l border-[#878787] cursor-pointer">
                    Account settings
                  </button>
                  <button id="tab-perms" className="w-full text-left p-3 border-l border-[#878787] cursor-pointer">
                    Permissions
                  </button>
                </nav>
              </aside>

              {/* RIGHT SIDE CONTENT */}
              <main className="md:col-span-3">
                <div id="tab-content">
                  <div data-tab="account">
                    <AccountSettingsClient user={clientUser} />
                  </div>

                  <div data-tab="perms" className="hidden">
                    <PermissionsManager currentUser={clientUser} />
                  </div>
                </div>
              </main>

            </div>
          </div>
        </div>

        {/* TAB SWITCH SCRIPT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                const btnAccount = document.getElementById('tab-account');
                const btnPerms = document.getElementById('tab-perms');
                const account = document.querySelector('[data-tab="account"]');
                const perms = document.querySelector('[data-tab="perms"]');

                function showAccount(){
                  account.classList.remove('hidden');
                  perms.classList.add('hidden');
                }
                function showPerms(){
                  perms.classList.remove('hidden');
                  account.classList.add('hidden');
                }

                btnAccount.addEventListener('click', showAccount);
                btnPerms.addEventListener('click', showPerms);
              })();
            `,
          }}
        />
      </div>
    );
  } catch (err) {
    redirect("/");
  }
}
