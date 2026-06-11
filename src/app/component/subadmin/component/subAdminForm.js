"use client";
import React, { useMemo, useState, useEffect } from "react";
import TimeButton from "@/utils/timebutton";
import { Button } from "@/utils/header";
import {
  validateEmail,
  validatePassword,
  validateForm,
} from "@/utils/validation";
import { getAllBranches } from "@/Api/AllApi";
import Dropdown from "../../../../utils/dropdown"; // import your dropdown

const PERMISSION_GROUPS = [
  {
    category: "Staff Management",
    permissions: [
      { label: "Add Staff", value: "add staff" },
      { label: "Edit Staff", value: "edit staff" },
      { label: "Delete Staff", value: "delete staff" },
    ]
  },
  {
    category: "User Management",
    permissions: [
      { label: "Create User", value: "create user" },
    ]
  },
  {
    category: "Page Access",
    permissions: [
      { label: "Show Logs Page", value: "show Logs page" },
      { label: "Show Contact Page", value: "show contact page" },
      { label: "Show Contact Categories", value: "show contact categories" },
      { label: "Show Feedback Page", value: "show feedback page" },
      { label: "Show App References", value: "show app reference page" },
    ]
  },
];

const SubAdminForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    username: "",
    nickname: "",
    email: "",
    password: "",
    image: null,
    branchId: "", // <-- store selected branch id here
    commission: 0,
    role: "doctor",
  });
  const [formErrors, setFormErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  // Prefill on edit
  useEffect(() => {
    if (initialValues) {
      setForm((prev) => ({
        ...prev,
        username: initialValues.username || "",
        nickname: initialValues.nickname || "",
        email: initialValues.email || "",
        password: "",
        image: null,
        branchId:
          Array.isArray(initialValues.branch) && initialValues.branch.length
            ? typeof initialValues.branch[0] === "string"
              ? initialValues.branch[0]
              : initialValues.branch[0]?._id
            : "",
        commission: initialValues.commission || 0,
        role: initialValues.adminType === "Sub Doctor" ? "sub doctor" : "doctor",
      }));
      setFormErrors({});
    } else {
      setForm({
        username: "",
        nickname: "",
        email: "",
        password: "",
        image: null,
        branchId: "",
        commission: 0,
        role: "doctor",
      });
      setFormErrors({});
    }
  }, [initialValues]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const list = await getAllBranches();
        setBranches(Array.isArray(list) ? list : []);
      } catch (e) {
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  const validate = () => {
    const errors = validateForm({
      username: {
        value: form.username,
        rules: [(v) => (!v ? "Username is required." : null)],
      },
      email: { value: form.email, rules: [validateEmail] },
      password: {
        value: form.password,
        rules: [(v) => validatePassword(v, 6)],
      },
      branchId: {
        value: form.branchId,
        rules: [(v) => (!v ? "Branch is required." : null)],
      },
      commission: {
        value: form.commission,
        rules: [(v) => (v < 0 ? "Commission cannot be negative." : null)],
      },
      role: {
        value: form.role,
        rules: [(v) => (!v ? "Role is required." : null)],
      },
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
    setForm({
      username: "",
      nickname: "",
      email: "",
      password: "",
      image: null,
      branchId: "",
      commission: 0,
      role: "doctor",
    });
    setFormErrors({});
  };

  const branchOptions = branches.map((b) => ({
    label: b.name,
    value: b._id,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Username */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Username
        </label>
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          placeholder="Enter Username"
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
        {formErrors.username && (
          <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>
        )}
      </div>

      {/* Nickname */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Nickname
        </label>
        <input
          type="text"
          value={form.nickname}
          onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
          placeholder="Enter Nickname"
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="john@company.com"
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
        {formErrors.email && (
          <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="At least 6 characters"
            className="w-full border border-yellow-400 rounded-xl p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-yellow-600 focus:outline-none transition"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {formErrors.password && (
          <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
        )}
      </div>

      {/* Role dropdown */}
      <div>
        <Dropdown
          label="Role"
          options={[
            { label: "Doctor", value: "doctor" },
            { label: "Sub Doctor", value: "sub doctor" },
          ]}
          value={form.role}
          onChange={(val) => setForm((f) => ({ ...f, role: val }))}
        />
        {formErrors.role && (
          <p className="text-red-500 text-sm mt-1">{formErrors.role}</p>
        )}
      </div>

      {/* Branch dropdown */}
      <div>
        <Dropdown
          label="Branch"
          options={branchOptions}
          value={form.branchId}
          onChange={(val) => setForm((f) => ({ ...f, branchId: val }))}
        />
        {formErrors.branchId && (
          <p className="text-red-500 text-sm mt-1">{formErrors.branchId}</p>
        )}
      </div>

      {/* Commission */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Commission (%)
        </label>
        <input
          type="number"
          value={form.commission}
          onChange={(e) =>
            setForm((f) => ({ ...f, commission: e.target.value }))
          }
          placeholder="Enter Commission Percentage"
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
        {formErrors.commission && (
          <p className="text-red-500 text-sm mt-1">{formErrors.commission}</p>
        )}
      </div>

      {/* Image */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Image (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))
          }
          className="w-full border border-yellow-400 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <TimeButton loading={loading}>{submitLabel}</TimeButton>
      </div>
    </form>
  );
};

export default SubAdminForm;
