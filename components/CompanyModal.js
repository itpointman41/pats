"use client";

import { X, Building2 } from "lucide-react";

export default function CompanyModal({ show, editingCompany, formData, error, onClose, onSubmit, onFormChange }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white/95 rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                Companies
              </p>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCompany ? "Edit Company" : "Create Company"}
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
        <form onSubmit={onSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => onFormChange({ ...formData, companyName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CRN (Commercial Registration Number)
              </label>
              <input
                type="text"
                value={formData.crn}
                onChange={(e) => onFormChange({ ...formData, crn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Approve
              </label>
              <input
                type="date"
                value={formData.dateApprove}
                onChange={(e) => onFormChange({ ...formData, dateApprove: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Expiry
              </label>
              <input
                type="date"
                value={formData.dateExpiry}
                onChange={(e) => onFormChange({ ...formData, dateExpiry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3">
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
              {editingCompany ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

