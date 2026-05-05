"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";

const PartyForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: "",
    gstin: "",
    type: "Supplier",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        mobile: initialValues.mobile || "",
        address: initialValues.address || "",
        gstin: initialValues.gstin || "",
        type: initialValues.type || "Supplier",
      });
    } else {
      setForm({
        name: "",
        mobile: "",
        address: "",
        gstin: "",
        type: "Supplier",
      });
    }
    setErrors({});
  }, [initialValues]);

  const validate = () => {
    const required = (label) => (v) => !v ? `${label} is required.` : null;
    const mobile = (label) => (v) => !/^\d{10}$/.test(v) ? `${label} must be 10 digits.` : null;

    const errs = validateForm({
      name: {
        value: form.name,
        rules: [required("Name")],
      },
      mobile: {
        value: form.mobile,
        rules: [required("Mobile"), mobile("Mobile")],
      },
      address: {
        value: form.address,
        rules: [required("Address")],
      },
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">


      <div>
        <label className="block mb-1 font-semibold text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter name"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Mobile</label>
        <input
          type="text"
          value={form.mobile}
          onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="10 digit mobile number"
        />
        {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Address</label>
        <textarea
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter address"
          rows={3}
        />
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">GSTIN</label>
        <input
          type="text"
          value={form.gstin}
          onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="GSTIN (Optional)"
        />
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

export default PartyForm;
