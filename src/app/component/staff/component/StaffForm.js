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

  const inputClasses = "w-full p-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 focus:outline-none text-sm transition-all shadow-sm bg-gray-50 focus:bg-white";
  const labelClasses = "block text-sm font-bold text-gray-700 mb-1.5 ml-1";

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
        <label className={labelClasses}>Phone Number</label>
        <input
          type="tel"
          name="phone"
          placeholder="10 digit number"
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
        <label className={labelClasses}>Staff Role</label>
        <input
          type="text"
          name="role"
          placeholder="e.g. Sales Executive"
          value={formData.role}
          onChange={handleChange}
          required
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
