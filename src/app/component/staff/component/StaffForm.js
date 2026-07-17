"use client";
import React, { useState, useEffect } from "react";
import { getRolePermissionsApi, getAllBranches } from "@/Api/AllApi";
import Dropdown from "@/utils/dropdown";
import toast from "react-hot-toast";

const StaffForm = ({ onSubmit, onCancel, loading, initialValues, submitLabel }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    branchIds: [],
  });
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRolePermissionsApi();
        setRoles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load roles", err);
      }
    };
    const fetchBranches = async () => {
      try {
        const data = await getAllBranches();
        setBranches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    };
    fetchRoles();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.username || initialValues.name || "",
        email: initialValues.email || "",
        role: initialValues.adminType || initialValues.role || "",
        password: "", // Keep password empty on edit
        branchIds:
          Array.isArray(initialValues.branch)
            ? initialValues.branch.map(b => typeof b === "string" ? b : b._id)
            : [],
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "",
        password: "",
        branchIds: [],
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.branchIds.length === 0) {
      toast.error("Please select at least one branch");
      return;
    }
    onSubmit(formData);
  };

  const inputClasses = "w-full p-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 focus:outline-none text-sm transition-all shadow-sm bg-gray-50 focus:bg-white";
  const labelClasses = "block text-sm font-bold text-gray-700 mb-1.5 ml-1";

  const roleOptions = roles
    .filter(r => !['Sub Admin', 'Sub Doctor'].includes(r.role))
    .map(r => ({ label: r.role, value: r.role }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClasses}>Full Name</label>
        <input
          type="text"
          name="name"
          placeholder="Enter staff name"
          value={formData.name}
          onChange={handleChange}
          required
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Email Address</label>
        <input
          type="email"
          name="email"
          placeholder="staff@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          className={inputClasses}
        />
      </div>

      <div>
        <Dropdown
          label="Staff Role"
          options={roleOptions}
          value={formData.role}
          onChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
          placeholder="Select staff role"
        />
      </div>

      {/* Branch Selection Checkboxes */}
      <div>
        <label className={labelClasses}>Branches</label>
        <div className="grid grid-cols-2 gap-3 mt-1.5">
          {branches.map((branch) => {
            const isChecked = formData.branchIds.includes(branch._id);
            return (
              <label
                key={branch._id}
                className={`flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer transition-all duration-300 shadow-sm min-h-[50px] ${
                  isChecked
                    ? "border-yellow-400 ring-2 ring-yellow-400/10 bg-yellow-50/10 scale-[1.01]"
                    : "border-gray-200 hover:border-yellow-400/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const nextIds = e.target.checked
                      ? [...formData.branchIds, branch._id]
                      : formData.branchIds.filter((id) => id !== branch._id);
                    setFormData((prev) => ({ ...prev, branchIds: nextIds }));
                  }}
                  className="w-5 h-5 flex-shrink-0 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded cursor-pointer transition-all"
                />
                <span className="text-gray-700 font-semibold text-sm leading-tight">
                  {branch.name}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClasses}>Password {initialValues && "(Leave blank to keep current)"}</label>
        <input
          type="password"
          name="password"
          placeholder="Enter password"
          value={formData.password}
          onChange={handleChange}
          required={!initialValues}
          className={inputClasses}
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-sm hover:from-yellow-500 hover:to-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-yellow-200/50 active:scale-95"
        >
          {loading ? "Processing..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default StaffForm;
