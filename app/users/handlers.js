// Utility functions for user management

export const getRoleBadgeColor = (role) => {
  const colors = {
    admin: "bg-red-100 text-red-800",
    hr: "bg-blue-100 text-blue-800",
    bio: "bg-purple-100 text-purple-800",
    ro: "bg-green-100 text-green-800",
    receptionist: "bg-amber-100 text-amber-800",
    staff: "bg-gray-100 text-gray-800"
  };
  return colors[role] || colors.staff;
};

export const filterUsers = (users, searchTerm) => {
  return users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const getInitialFormData = () => ({
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "staff",
  profilePicture: ""
});

export const getUserFormData = (user) => ({
  username: user.username || "",
  password: "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  email: user.email || "",
  phoneNumber: user.phoneNumber || "",
  role: user.role || "staff",
  profilePicture: user.profilePicture || ""
});

// API functions
export const loadUsers = async (setUsers, setError, setLoading) => {
  try {
    const response = await fetch("/api/admin/users", {
      credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
      setUsers(data.users);
    } else {
      setError(data.error || "Failed to load users");
    }
  } catch (err) {
    setError("Failed to load users");
  } finally {
    setLoading(false);
  }
};

export const deleteUser = async (userId, onSuccess, onError) => {
  if (!confirm("Are you sure you want to delete this user?")) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/users?_id=${userId}`, {
      method: "DELETE",
      credentials: 'include'
    });

    const data = await response.json();
    if (response.ok) {
      onSuccess();
    } else {
      onError(data.error || "Failed to delete user");
    }
  } catch (err) {
    onError("Failed to delete user");
  }
};

export const submitUser = async (editingUser, formData, onSuccess, onError) => {
  const url = "/api/admin/users";
  const method = editingUser ? "PUT" : "POST";
  const body = editingUser
    ? { _id: editingUser._id, ...formData }
    : formData;

  // Don't send password if it's empty during edit
  if (editingUser && !formData.password) {
    delete body.password;
  }

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

