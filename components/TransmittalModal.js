"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

const CLINICS = [
  "PDS Manila",
  "PDS Cebu",
  "PDS Davao",
  "PDS Iloilo",
  "PDS Cagayan de Oro",
  "Medisense Manila",
  "Medisense Makati",
  "Medisense Cebu",
  "Medisense Davao",
  "Medisense Cagayan de Oro",
  "Medisense Iloilo",
  "Medisense Bacolod",
  "Medisense Zamboanga",
  "Medisense Dumaguete",
  "Medisense Pampanga",
  "Medisense Pangasinan",
  "Medisense La Union"
];

const FINDINGS = [
  "For Medical",
  "Pending",
  "FTW"
];

const PAYMENTS = [
  "Billed Agency",
  "Applicant PD"
];

export default function TransmittalModal({ show, editingTransmittal, formData, error, onClose, onSubmit, onFormChange, editingMode = "pending" }) {
  const [applicants, setApplicants] = useState([]);
  const [applicantIdsWithTransmittal, setApplicantIdsWithTransmittal] = useState(new Set());
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState("");
  const [showApplicantDropdown, setShowApplicantDropdown] = useState(false);
  const applicantDropdownRef = useRef(null);
  const [findingsSearch, setFindingsSearch] = useState("");
  const [showFindingsDropdown, setShowFindingsDropdown] = useState(false);
  const findingsDropdownRef = useRef(null);
  const [clinicSearch, setClinicSearch] = useState("");
  const [showClinicDropdown, setShowClinicDropdown] = useState(false);
  const clinicDropdownRef = useRef(null);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const paymentDropdownRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Initialize search values with existing data
      const selectedApplicant = applicants.find(a => a._id === formData.applicantId);
      setApplicantSearch(selectedApplicant ? selectedApplicant.name : "");
      setFindingsSearch(formData.findings || "");
      setClinicSearch(formData.clinic || "");
      setPaymentSearch(formData.payment || "");

      // Fetch applicants and transmittals when modal opens so we can
      // exclude applicants that already have a transmittal.
      setLoadingApplicants(true);
      Promise.all([
        fetch("/api/admin/applicants", { credentials: 'include' }).then((r) => r.json()),
        fetch("/api/admin/transmittals", { credentials: 'include' }).then((r) => r.json())
      ])
        .then(([appData, transData]) => {
          if (appData.applicants) {
            setApplicants(appData.applicants);
            const selected = appData.applicants.find(a => a._id === formData.applicantId);
            if (selected) setApplicantSearch(selected.name);
          }

          // `transData` can be either an array (older responses) or
          // an object like { transmittals: [...] } (current API).
          const transList = Array.isArray(transData)
            ? transData
            : (transData && Array.isArray(transData.transmittals) ? transData.transmittals : []);
          if (transList.length > 0) {
            const ids = new Set();
            transList.forEach((t) => {
              if (t.applicantId) ids.add(String(t.applicantId));
            });
            setApplicantIdsWithTransmittal(ids);
          }
        })
        .catch((err) => {
          console.error("Failed to load applicants or transmittals:", err);
        })
        .finally(() => setLoadingApplicants(false));
    }
  }, [show, formData.applicantId, formData.findings, formData.clinic, formData.payment]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (applicantDropdownRef.current && !applicantDropdownRef.current.contains(event.target)) {
        setShowApplicantDropdown(false);
      }
      if (findingsDropdownRef.current && !findingsDropdownRef.current.contains(event.target)) {
        setShowFindingsDropdown(false);
      }
      if (clinicDropdownRef.current && !clinicDropdownRef.current.contains(event.target)) {
        setShowClinicDropdown(false);
      }
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {
        setShowPaymentDropdown(false);
      }
    }

    if (showApplicantDropdown || showFindingsDropdown || showClinicDropdown || showPaymentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showApplicantDropdown, showFindingsDropdown, showClinicDropdown, showPaymentDropdown]);

  // Filter applicants based on search and exclude those with transmittals
  const filteredApplicants = applicants
    .filter((applicant) => {
      // If editing an existing transmittal, allow the currently selected applicant
      if (formData.applicantId && String(applicant._id) === String(formData.applicantId)) return true;
      // Otherwise only include applicants that do NOT already have a transmittal
      if (applicantIdsWithTransmittal && applicantIdsWithTransmittal.has(String(applicant._id))) return false;
      return true;
    })
    .filter(applicant =>
      applicant.name.toLowerCase().includes(applicantSearch.toLowerCase())
    );

  // Filter findings based on search
  const filteredFindings = FINDINGS.filter(finding =>
    finding.toLowerCase().includes(findingsSearch.toLowerCase())
  );

  // Filter clinics based on search
  const filteredClinics = CLINICS.filter(clinic =>
    clinic.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  // Filter payments based on search
  const filteredPayments = PAYMENTS.filter(payment =>
    payment.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  const handleApplicantSelect = (applicant) => {
    onFormChange({ ...formData, applicantId: applicant._id });
    setApplicantSearch(applicant.name);
    setShowApplicantDropdown(false);
  };

  const handleFindingsSelect = (finding) => {
    onFormChange({ ...formData, findings: finding });
    setFindingsSearch(finding);
    setShowFindingsDropdown(false);
  };

  const handleClinicSelect = (clinic) => {
    onFormChange({ ...formData, clinic });
    setClinicSearch(clinic);
    setShowClinicDropdown(false);
  };

  const handlePaymentSelect = (payment) => {
    onFormChange({ ...formData, payment });
    setPaymentSearch(payment);
    setShowPaymentDropdown(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white/95 rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
              Transmittal
            </p>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingTransmittal ? "Edit Transmittal" : "Create Transmittal"}
            </h2>
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
          <div className="relative" ref={applicantDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Applicant *
            </label>
            <input
              type="text"
              value={applicantSearch}
              onChange={(e) => {
                setApplicantSearch(e.target.value);
                setShowApplicantDropdown(true);
                if (!e.target.value) {
                  onFormChange({ ...formData, applicantId: "" });
                }
              }}
              onFocus={() => {
                setShowApplicantDropdown(true);
              }}
              placeholder="Type to search applicant..."
              disabled={loadingApplicants}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {loadingApplicants && (
              <p className="mt-1 text-xs text-gray-500">Loading applicants...</p>
            )}
            {showApplicantDropdown && !loadingApplicants && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredApplicants.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">No applicants found</div>
                ) : (
                  filteredApplicants.map((applicant) => (
                    <button
                      key={applicant._id}
                      type="button"
                      onClick={() => handleApplicantSelect(applicant)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {applicant.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Conditional fields based on editingMode */}
          {editingMode === 'process' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    id="medicalCert"
                    type="checkbox"
                    checked={Boolean(formData.medicalCert)}
                    onChange={(e) => onFormChange({ ...formData, medicalCert: e.target.checked })}
                    className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                  />
                  <label htmlFor="medicalCert" className="text-sm text-gray-700">Medical Cert</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="vaccineCert"
                    type="checkbox"
                    checked={Boolean(formData.vaccineCert)}
                    onChange={(e) => onFormChange({ ...formData, vaccineCert: e.target.checked })}
                    className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                  />
                  <label htmlFor="vaccineCert" className="text-sm text-gray-700">Vaccine Cert</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date EMed Uploaded</label>
                <input
                  type="datetime-local"
                  value={formData.dateOfEmedUploaded || ''}
                  onChange={(e) => onFormChange({ ...formData, dateOfEmedUploaded: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    id="biometric"
                    type="checkbox"
                    checked={Boolean(formData.biometric)}
                    onChange={(e) => onFormChange({ ...formData, biometric: e.target.checked })}
                    className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                  />
                  <label htmlFor="biometric" className="text-sm text-gray-700">Biometric</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="stampVisa"
                    type="checkbox"
                    checked={Boolean(formData.stampVisa)}
                    onChange={(e) => onFormChange({ ...formData, stampVisa: e.target.checked })}
                    className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                  />
                  <label htmlFor="stampVisa" className="text-sm text-gray-700">Stamp Visa</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Insurance</label>
                <input
                  type="date"
                  value={formData.dateOfInsurance || ''}
                  onChange={(e) => onFormChange({ ...formData, dateOfInsurance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="waiver"
                  type="checkbox"
                  checked={Boolean(formData.waiver)}
                  onChange={(e) => onFormChange({ ...formData, waiver: e.target.checked })}
                  className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                />
                <label htmlFor="waiver" className="text-sm text-gray-700">Waiver</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="remed"
                  type="checkbox"
                  checked={Boolean(formData.remed)}
                  onChange={(e) => onFormChange({ ...formData, remed: e.target.checked })}
                  className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                />
                <label htmlFor="remed" className="text-sm text-gray-700">Remed</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => onFormChange({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
                />
              </div>
            </>
          ) : editingMode === 'encode' ? (
            <>
              <div className="relative" ref={findingsDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                <input
                  type="text"
                  value={findingsSearch}
                  onChange={(e) => {
                    setFindingsSearch(e.target.value);
                    setShowFindingsDropdown(true);
                    if (!e.target.value) {
                      onFormChange({ ...formData, findings: "" });
                    }
                  }}
                  onFocus={() => setShowFindingsDropdown(true)}
                  placeholder="Type to search findings..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none"
                />
                {showFindingsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredFindings.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No findings found</div>
                    ) : (
                      filteredFindings.map((finding) => (
                        <button key={finding} type="button" onClick={() => handleFindingsSelect(finding)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">{finding}</button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="waiver"
                  type="checkbox"
                  checked={Boolean(formData.waiver)}
                  onChange={(e) => onFormChange({ ...formData, waiver: e.target.checked })}
                  className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                />
                <label htmlFor="waiver" className="text-sm text-gray-700">Waiver</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="remed"
                  type="checkbox"
                  checked={Boolean(formData.remed)}
                  onChange={(e) => onFormChange({ ...formData, remed: e.target.checked })}
                  className="h-4 w-4 text-[#0d8c40] border-gray-300 rounded"
                />
                <label htmlFor="remed" className="text-sm text-gray-700">Remed</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Remarks</label>
                <textarea value={formData.clinicRemarks} onChange={(e) => onFormChange({ ...formData, clinicRemarks: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea value={formData.remarks} onChange={(e) => onFormChange({ ...formData, remarks: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
              </div>
            </>
          ) : (
            // Default (pending / create) - show existing fields
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Medical</label>
                  <input type="date" value={formData.dateOfMedical} onChange={(e) => onFormChange({ ...formData, dateOfMedical: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Expiration</label>
                  <input type="date" value={formData.medicalExpiration} onChange={(e) => onFormChange({ ...formData, medicalExpiration: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
                </div>
              </div>

              <div className="relative" ref={findingsDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                <input type="text" value={findingsSearch} onChange={(e) => { setFindingsSearch(e.target.value); setShowFindingsDropdown(true); if (!e.target.value) { onFormChange({ ...formData, findings: "" }); } }} onFocus={() => setShowFindingsDropdown(true)} placeholder="Type to search findings..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
                {showFindingsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredFindings.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No findings found</div>
                    ) : (
                      filteredFindings.map((finding) => (
                        <button key={finding} type="button" onClick={() => handleFindingsSelect(finding)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">{finding}</button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Remarks</label>
                <textarea value={formData.clinicRemarks} onChange={(e) => onFormChange({ ...formData, clinicRemarks: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
              </div>

              <div className="relative" ref={clinicDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                <input type="text" value={clinicSearch} onChange={(e) => { setClinicSearch(e.target.value); setShowClinicDropdown(true); if (!e.target.value) { onFormChange({ ...formData, clinic: "" }); } }} onFocus={() => setShowClinicDropdown(true)} placeholder="Type to search clinic..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
                {showClinicDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredClinics.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No clinics found</div>
                    ) : (
                      filteredClinics.map((clinic) => (
                        <button key={clinic} type="button" onClick={() => handleClinicSelect(clinic)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">{clinic}</button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="relative" ref={paymentDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                <input type="text" value={paymentSearch} onChange={(e) => { setPaymentSearch(e.target.value); setShowPaymentDropdown(true); if (!e.target.value) { onFormChange({ ...formData, payment: "" }); } }} onFocus={() => setShowPaymentDropdown(true)} placeholder="Type to search payment..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
                {showPaymentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPayments.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No payments found</div>
                    ) : (
                      filteredPayments.map((payment) => (
                        <button key={payment} type="button" onClick={() => handlePaymentSelect(payment)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">{payment}</button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea value={formData.remarks} onChange={(e) => onFormChange({ ...formData, remarks: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d8c40] focus:border-transparent outline-none" />
              </div>
            </>
          )}

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
              {editingTransmittal ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

