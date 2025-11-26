// Utility functions for applicant management

export const filterApplicants = (applicants, searchTerm) => {
  return applicants.filter(applicant =>
    applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (applicant.position && applicant.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (applicant.company && applicant.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (applicant.ro && applicant.ro.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (applicant.phoneNumber && applicant.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );
};

export const getInitialFormData = () => ({
  name: "",
  position: "",
  company: "",
  ro: "",
  phoneNumber: ""
});

export const getApplicantFormData = (applicant) => ({
  name: applicant.name || "",
  position: applicant.position || "",
  company: applicant.company || "",
  ro: applicant.ro || "",
  phoneNumber: applicant.phoneNumber || ""
});

// API functions
export const loadApplicants = async (setApplicants, setError, setLoading) => {
  try {
    const response = await fetch("/api/admin/applicants", {
      credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
      setApplicants(data.applicants);
    } else {
      setError(data.error || "Failed to load applicants");
    }
  } catch (err) {
    setError("Failed to load applicants");
  } finally {
    setLoading(false);
  }
};

export const deleteApplicant = async (applicantId, onSuccess, onError) => {
  try {
    const response = await fetch(`/api/admin/applicants?_id=${applicantId}`, {
      method: "DELETE",
      credentials: 'include'
    });

    const data = await response.json();
    if (response.ok) {
      onSuccess();
    } else {
      onError(data.error || "Failed to delete applicant");
    }
  } catch (err) {
    onError("Failed to delete applicant");
  }
};

export const submitApplicant = async (editingApplicant, formData, onSuccess, onError) => {
  const url = "/api/admin/applicants";
  const method = editingApplicant ? "PUT" : "POST";
  const body = editingApplicant
    ? { _id: editingApplicant._id, ...formData }
    : formData;

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

