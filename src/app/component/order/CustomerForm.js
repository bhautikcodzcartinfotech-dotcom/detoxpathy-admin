"use client";
import React, { useState } from "react";
import { Button } from "@/utils/header";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";
import Dropdown from "@/utils/dropdown";

const CustomerForm = ({ onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    name: "",
    mobilePrefix: "+91",
    mobileNumber: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const required = (label) => (v) => (!v || String(v).trim() === "" ? `${label} is required.` : null);
    const prefixRule = (v) => (/^\+\d{1,4}$/.test(v || "") ? null : "Enter valid prefix like +91 or +1");
    const mobileRule = (v) => (/^\d{10}$/.test(v || "") ? null : "Enter valid 10-digit mobile number");
    const errs = validateForm({
      name: { value: form.name, rules: [required("Name")] },
      mobilePrefix: { value: form.mobilePrefix, rules: [required("Mobile prefix"), prefixRule] },
      mobileNumber: { value: form.mobileNumber, rules: [required("Mobile number"), mobileRule] },
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: form.name.trim(),
      mobilePrefix: form.mobilePrefix.trim(),
      mobileNumber: form.mobileNumber.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block mb-2 font-semibold text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
          placeholder="Enter customer name"
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block mb-2 font-semibold text-gray-700">Prefix</label>
          <input
            type="text"
            value={form.mobilePrefix}
            onChange={(e) => setForm((prev) => ({ ...prev, mobilePrefix: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
          />
          {errors.mobilePrefix && <p className="text-sm text-red-600 mt-1">{errors.mobilePrefix}</p>}
        </div>
        <div className="col-span-2">
          <label className="block mb-2 font-semibold text-gray-700">Mobile Number</label>
          <input
            type="text"
            maxLength={10}
            value={form.mobileNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setForm((prev) => ({ ...prev, mobileNumber: value }));
            }}
            className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
            placeholder="Enter 10-digit mobile number"
          />
          {errors.mobileNumber && <p className="text-sm text-red-600 mt-1">{errors.mobileNumber}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <TimeButton loading={loading} type="submit">
          Save Customer
        </TimeButton>
      </div>
    </form>
  );
};

export default CustomerForm;
