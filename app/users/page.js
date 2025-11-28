'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import TableFilterBar from "../../components/TableFilterBar";
import PaginationControls from "../../components/PaginationControls";
import { Edit, Trash2, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import UserModal from "../../components/UserModal";
import {
  loadUsers as loadUsersAPI,
  deleteUser as deleteUserAPI,
  submitUser as submitUserAPI,
  filterUsers,
  getRoleBadgeColor,
  getInitialFormData,
  getUserFormData
} from "./handlers";
import { usePermissions } from "../../hooks/usePermissions";

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = 'users';

const UsersManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());
  const { permissions: permissionMap, loading: permsLoading, canRead, canWrite } = usePermissions();
  const canViewUsers = canRead(RESOURCE_KEY);
  const canManageUsers = canWrite(RESOURCE_KEY);

  useEffect(() => {
    // Get current user info
    fetch("/api/auth/check", {
      credentials: 'include'
    })
      .then((res) => res.json())
        .then((data) => {
          setAuthLoading(false);
          if (!data.authenticated) {
            router.push("/");
          } else {
            setCurrentUser(data);
            loadUsers();
          }
        })
      .catch(() => {
        setAuthLoading(false);
        router.push("/");
      });
  }, [router]);

  const loadUsers = () => {
    loadUsersAPI(setUsers, setError, setLoading);
  };

  const handleCreate = () => {
    if (!canManageUsers) return;
    setEditingUser(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  };

  const handleEdit = (user) => {
    if (!canManageUsers) return;
    setEditingUser(user);
    setFormData(getUserFormData(user));
    setShowModal(true);
  };

  const handleDelete = (userId) => {
    if (!canManageUsers) return;
    deleteUserAPI(
      userId,
      () => loadUsers(),
      (error) => Swal.fire('Error', error || 'Failed to delete user', 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    submitUserAPI(
      editingUser,
      formData,
      () => {
        setShowModal(false);
        setError("");
        loadUsers();
      },
      (error) => setError(error)
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  const filteredUsers = filterUsers(users, searchTerm);
  const filteredCount = filteredUsers.length;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filteredCount, pageSize]);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const pageSizeSelector = (
    <div className="flex items-center gap-2">
      <label className="text-xs uppercase tracking-wide text-gray-500">
        Rows
      </label>
      <select
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
        className="px-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8c40]"
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );

  if (authLoading || loading || permsLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)]">
        <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
        <div className="p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <div className="card p-6 text-center text-sm text-red-600">
              You do not have permission to view this page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <TableFilterBar
            subtitle="People"
            title="User Management"
            description="Invite, edit, and monitor platform users."
            searchPlaceholder="Search users..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            leadingContent={pageSizeSelector}
            className="mb-4"
            actions={canManageUsers ? (
              <button
                type="button"
                onClick={handleCreate}
                className="relative group inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
              >
                <span className="absolute right-full mr-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap">
                  Add user
                </span>
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
              </button>
            ) : null}
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Users Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Login</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-2.5 text-center text-gray-500 text-xs">No users found</td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, idx) => (
                      <tr key={user._id} className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-2.5 align-top">
                          <div className="flex items-center">
                            {user.profilePicture ? (
                              <img
                                className="h-8 w-8 rounded-full mr-2"
                                src={user.profilePicture}
                                alt={`${user.firstName} ${user.lastName}`}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[#0d8c40] flex items-center justify-center text-white font-medium text-xs mr-2">
                                {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-semibold text-gray-900 leading-tight">
                                {user.firstName || user.lastName 
                                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                  : user.username}
                              </div>
                              <div className="text-xs text-gray-500 leading-tight">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="text-xs text-gray-900 leading-tight">{user.email || "—"}</div>
                          <div className="text-xs text-gray-500 leading-tight">{user.phoneNumber || "—"}</div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status ? user.status.toUpperCase() : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span className="text-gray-700 text-xs leading-tight">
                            {user.lastLogin 
                              ? new Date(user.lastLogin).toLocaleString() 
                              : "Never"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          {canManageUsers ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                                title="Edit"
                                aria-label={`Edit ${user.username || user._id}`}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(user._id)}
                                className={`p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors ${currentUser?.userId === user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Delete"
                                aria-label={`Delete ${user.username || user._id}`}
                                disabled={currentUser?.userId === user._id}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 text-right">Read only</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalItems={filteredCount}
              pageSize={pageSize}
              label="users"
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      <UserModal
        show={showModal}
        editingUser={editingUser}
        formData={formData}
        error={error}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormChange={setFormData}
      />
    </div>
  );
};

export default UsersManagementPage;

