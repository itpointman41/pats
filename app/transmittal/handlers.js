// Utility functions for transmittal management
import Swal from 'sweetalert2';

export const getInitialFormData = () => ({
  applicantId: "",
  dateOfMedical: "",
  medicalExpiration: "",
  findings: "",
  clinicRemarks: "",
  clinic: "",
  payment: "",
  remarks: "",
  // Process-related fields
  medicalCert: false,
  vaccineCert: false,
  dateOfEmedUploaded: "",
  biometric: false,
  stampVisa: false,
  dateOfInsurance: "",
  waiver: false,
  remed: false
});

export const getTransmittalFormData = (transmittal) => ({
  applicantId: transmittal.applicantId || "",
  dateOfMedical: transmittal.dateOfMedical 
    ? new Date(transmittal.dateOfMedical).toISOString().split('T')[0]
    : "",
  medicalExpiration: transmittal.medicalExpiration
    ? new Date(transmittal.medicalExpiration).toISOString().split('T')[0]
    : "",
  findings: transmittal.findings || "",
  clinicRemarks: transmittal.clinicRemarks || "",
  clinic: transmittal.clinic || "",
  payment: transmittal.payment || "",
  remarks: transmittal.remarks || "",
  medicalCert: Boolean(transmittal.medicalCert),
  vaccineCert: Boolean(transmittal.vaccineCert),
  dateOfEmedUploaded: transmittal.dateOfEmedUploaded || "",
  biometric: Boolean(transmittal.biometric),
  stampVisa: Boolean(transmittal.stampVisa),
  dateOfInsurance: transmittal.dateOfInsurance || "",
  waiver: Boolean(transmittal.waiver),
  remed: Boolean(transmittal.remed)
});

// API functions
export const loadTransmittals = async (setTransmittals, setError, setLoading) => {
  try {
    const response = await fetch("/api/admin/transmittals", {
      credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
      setTransmittals(data.transmittals);
    } else {
      setError(data.error || "Failed to load transmittals");
    }
  } catch (err) {
    setError("Failed to load transmittals");
  } finally {
    setLoading(false);
  }
};

export const deleteTransmittal = async (transmittalId, onSuccess, onError) => {
  try {
    const result = await Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this transmittal? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Delete',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return; // user cancelled

    const response = await fetch(`/api/admin/transmittals?_id=${transmittalId}`, {
      method: "DELETE",
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      await Swal.fire('Deleted!', 'The transmittal has been deleted.', 'success');
      onSuccess();
    } else {
      await Swal.fire('Error', data.error || 'Failed to delete transmittal', 'error');
      onError(data.error || 'Failed to delete transmittal');
    }
  } catch (err) {
    await Swal.fire('Error', 'Failed to delete transmittal', 'error');
    onError('Failed to delete transmittal');
  }
};

export const submitTransmittal = async (editingTransmittal, formData, onSuccess, onError) => {
  try {
    const url = "/api/admin/transmittals";
    const method = editingTransmittal ? "PUT" : "POST";
    const body = editingTransmittal
      ? { _id: editingTransmittal._id, ...formData }
      : formData;

    // Convert date strings to Date objects or null
    const processedBody = {
      ...body,
      dateOfMedical: body.dateOfMedical ? new Date(body.dateOfMedical).toISOString() : null,
      medicalExpiration: body.medicalExpiration ? new Date(body.medicalExpiration).toISOString() : null,
      dateOfEmedUploaded: body.dateOfEmedUploaded ? new Date(body.dateOfEmedUploaded).toISOString() : null,
      dateOfInsurance: body.dateOfInsurance ? new Date(body.dateOfInsurance).toISOString() : null
    };

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(processedBody),
      credentials: 'include'
    });

    const data = await response.json();
    if (response.ok) {
      onSuccess();
    } else {
      onError(data.error || "Operation failed");
    }
  } catch (err) {
    onError("Operation failed");
  }
};

// Update transmittal fields (e.g., status, findings). `updates` can be a string (status) or an object of fields.
export const updateTransmittalStatus = async (transmittalId, updates, onSuccess, onError) => {
  try {
    let body = { _id: transmittalId };
    if (typeof updates === 'string') {
      body.status = updates;
    } else if (typeof updates === 'object' && updates !== null) {
      body = { ...body, ...updates };
    }

    const response = await fetch('/api/admin/transmittals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (response.ok) {
      onSuccess && onSuccess();
    } else {
      onError && onError(data.error || 'Failed to update transmittal');
    }
  } catch (err) {
    onError && onError('Failed to update transmittal');
  }
};
