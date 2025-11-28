"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserPlus2 } from "lucide-react";

export default function ApplicantModal({ show, editingApplicant, formData, error, onClose, onSubmit, onFormChange }) {
  const [roUsers, setRoUsers] = useState([]);
  const [loadingRo, setLoadingRo] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyDropdownRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Initialize company search with existing data
      if (formData.companyId) {
        // We'll set this after fetching companies
      } else if (formData.company) {
        setCompanySearch(formData.company);
      }

      // Fetch RO users and companies when modal opens
      setLoadingRo(true);
      setLoadingCompanies(true);
      Promise.all([
        fetch("/api/admin/users/ro", { credentials: 'include' }).then((r) => r.json()),
        fetch("/api/admin/companies", { credentials: 'include' }).then((r) => r.json())
      ])
        .then(([roData, companiesData]) => {
          if (roData.roUsers) {
            setRoUsers(roData.roUsers);
          }
          if (companiesData.companies) {
            setCompanies(companiesData.companies);
            // If editing and we have a companyId, find and set the company name
            if (formData.companyId) {
              const selectedCompany = companiesData.companies.find(c => c._id === formData.companyId);
              if (selectedCompany) {
                setCompanySearch(selectedCompany.companyName);
              }
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load RO users or companies:", err);
        })
        .finally(() => {
          setLoadingRo(false);
          setLoadingCompanies(false);
        });
    }
  }, [show, formData.companyId, formData.company]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    }

    if (showCompanyDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCompanyDropdown]);

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.companyName.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleCompanySelect = (company) => {
    onFormChange({ ...formData, companyId: company._id, company: company.companyName });
    setCompanySearch(company.companyName);
    setShowCompanyDropdown(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white/95 rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">
              <UserPlus2 size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                Applicants
              </p>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingApplicant ? "Edit Applicant" : "Create Applicant"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
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
          <div className="relative" ref={companyDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setShowCompanyDropdown(true);
                if (!e.target.value) {
                  onFormChange({ ...formData, companyId: "", company: "" });
                }
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              placeholder="Type to search company..."
              disabled={loadingCompanies}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {loadingCompanies && (
              <p className="mt-1 text-xs text-gray-500">Loading companies...</p>
            )}
            {showCompanyDropdown && !loadingCompanies && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCompanies.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">No companies found</div>
                ) : (
                  filteredCompanies.map((company) => (
                    <button
                      key={company._id}
                      type="button"
                      onClick={() => handleCompanySelect(company)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {company.companyName}
                    </button>
                  ))
                )}
              </div>
            )}
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
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#0d8c40] text-white font-semibold shadow-sm hover:bg-[#0b7335] transition-colors"
            >
              {editingApplicant ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

