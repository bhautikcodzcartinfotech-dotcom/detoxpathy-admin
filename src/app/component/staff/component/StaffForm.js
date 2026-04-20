"use client";
import React, { useState, useEffect } from "react";

const StaffForm = ({ onSubmit, onCancel, loading, initialValues, submitLabel }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || "",
        email: initialValues.email || "",
        phone: initialValues.phone || "",
        role: initialValues.role || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputClasses = "w-full p-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:outline-none text-sm transition-all";
  const labelClasses = "block text-sm font-bold text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClasses}>Full Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          minLength={10}
          maxLength={10}
          pattern="[0-9]{10}"
          title="Please enter exactly 10 digits"
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Role</label>
        <input
          type="text"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
          className={inputClasses}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-all disabled:opacity-50"
        >
          {loading ? "Processing..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default StaffForm;
