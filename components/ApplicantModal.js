"use client";

import { useState, useEffect } from "react";

export default function ApplicantModal({ show, editingApplicant, formData, error, onClose, onSubmit, onFormChange }) {
  const [roUsers, setRoUsers] = useState([]);
  const [loadingRo, setLoadingRo] = useState(false);

  useEffect(() => {
    if (show) {
      // Fetch RO users when modal opens
      setLoadingRo(true);
      fetch("/api/admin/users/ro", {
        credentials: 'include'
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.roUsers) {
            setRoUsers(data.roUsers);
          }
        })
        .catch((err) => {
          console.error("Failed to load RO users:", err);
        })
        .finally(() => {
          setLoadingRo(false);
        });
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {editingApplicant ? "Edit Applicant" : "Create Applicant"}
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => onFormChange({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => onFormChange({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => onFormChange({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              R.O. (Recruiting Officer)
            </label>
            <select
              value={formData.ro}
              onChange={(e) => onFormChange({ ...formData, ro: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
              disabled={loadingRo}
            >
              <option value="" className="hidden">Select R.O.</option>
              {roUsers.map((user) => {
                const displayName = user.firstName || user.lastName
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : user.username;
                return (
                  <option key={user._id} value={user.username}>
                    {displayName} ({user.username})
                  </option>
                );
              })}
              <option value="DHired">DHired</option>
            </select>
            {loadingRo && (
              <p className="mt-1 text-xs text-gray-500">Loading R.O. users...</p>
            )}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0d8c40] text-white rounded-lg hover:bg-[#0b7335]"
            >
              {editingApplicant ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

