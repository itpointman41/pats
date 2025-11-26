'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import TableFilterBar from "../../components/TableFilterBar";
import PaginationControls from "../../components/PaginationControls";
import { Edit, Trash2 } from 'lucide-react';
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

const PAGE_SIZE = 15;

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());

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
    setEditingUser(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData(getUserFormData(user));
    setShowModal(true);
  };

  const handleDelete = (userId) => {
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
  }, [searchTerm, filteredCount]);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <TableFilterBar
            subtitle="People"
            title="User Management"
            description="Invite, edit, and monitor platform users."
            searchPlaceholder="Search users..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            className="mb-4"
            actions={(
              <button
                onClick={handleCreate}
                className="btn-primary space-x-2 self-start w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add User</span>
              </button>
            )}
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
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-[var(--surface-muted)]/70 even:bg-white">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.profilePicture ? (
                              <img
                                className="h-10 w-10 rounded-full mr-3"
                                src={user.profilePicture}
                                alt={`${user.firstName} ${user.lastName}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-[#0d8c40] flex items-center justify-center text-white font-medium text-sm mr-3">
                                {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName || user.lastName 
                                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                  : user.username}
                              </div>
                              <div className="text-sm text-gray-500">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email || "—"}</div>
                          <div className="text-sm text-gray-500">{user.phoneNumber || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleString() 
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1 rounded hover:bg-gray-100 text-[#0d8c40] mr-3"
                            title="Edit"
                            aria-label={`Edit ${user.username || user._id}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className={`p-1 rounded hover:bg-gray-100 text-red-600 ${currentUser?.userId === user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete"
                            aria-label={`Delete ${user.username || user._id}`}
                            disabled={currentUser?.userId === user._id}
                          >
                            <Trash2 size={16} />
                          </button>
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
              pageSize={PAGE_SIZE}
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
}

