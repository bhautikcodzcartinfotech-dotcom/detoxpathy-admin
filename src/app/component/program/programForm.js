"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { API_BASE } from "@/Api/AllApi";
import Dropdown from "@/utils/dropdown";

const ProgramForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: ""
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        description: initialValues.description || "",
        duration: initialValues.duration || "",
        price: initialValues.price || ""
      });
    } else {
      setForm({
        name: "",
        description: "",
        duration: "",
        price: ""
      });
    }
    setErrors({});
  }, [initialValues]);

  const validate = (overrideDuration) => {
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.description) errs.description = "Description is required";
    
    const dVal = overrideDuration !== undefined ? overrideDuration : form.duration;

    if (!dVal) {
      errs.duration = "Duration is required";
    } else if (!/^\d+(-\d+)?\s+days$/i.test(dVal.trim())) {
      errs.duration = "Duration must exactly follow the format '30-45 days' or '30 days'";
    }

    if (!form.price) errs.price = "Price is required";
    else if (isNaN(form.price) || Number(form.price) < 0) errs.price = "Enter a valid positive number";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auto-append " days" if missing
    const currentDuration = form.duration.trim();
    let finalDuration = currentDuration;
    
    if (currentDuration && /^\d+(-\d+)?$/.test(currentDuration)) {
      finalDuration = `${currentDuration} days`;
      setForm(f => ({ ...f, duration: finalDuration }));
    }

    if (!validate(finalDuration)) return;
    
    onSubmit({ ...form, duration: finalDuration });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Program Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="Enter program name"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="Enter program description"
          rows={3}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Duration (e.g., 30-45 days)
        </label>
        <input
          type="text"
          value={form.duration}
          onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="1-15 days"
        />
        {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Price (₹)
        </label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="Enter price"
          min="0"
        />
        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition font-semibold"
        >
          Cancel
        </button>
        <TimeButton loading={loading}>{submitLabel}</TimeButton>
      </div>
    </form>
  );
};

export default ProgramForm;
