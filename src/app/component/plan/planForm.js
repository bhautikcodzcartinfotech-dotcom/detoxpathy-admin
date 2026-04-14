"use client";
import { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";

const PlanForm = ({
  initialData,
  onSubmit,
  onClose,
  submitLabel = "Save",
  loading = false,
  title = "Plan",
}) => {
  const [form, setForm] = useState({ name: "", description: "", days: "", price: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        days: initialData.days ?? "",
        price: initialData.price ?? "",
      });
    } else {
      setForm({ name: "", description: "", days: "", price: "" });
    }
    setErrors({});
  }, [initialData]);

  const validate = () => {
    const required = (label) => (v) => !v ? `${label} is required` : null;
    const positiveNumberRule = (label) => (v) => {
      // Allow 0 for price if it's not strictly required to be > 0, but usually we want some validation
      if (v === undefined || v === null || v === "") return `${label} is required`;
      const num = Number(v);
      if (isNaN(num)) return `${label} must be a valid number`;
      if (num < 0) return `${label} cannot be negative`;
      return null;
    };
    const errs = validateForm({
      name: { value: form.name, rules: [required("Name")] },
      description: {
        value: form.description,
        rules: [required("Description")],
      },
      days: { value: form.days, rules: [positiveNumberRule("Days")] },
      price: { value: form.price, rules: [positiveNumberRule("Price")] },
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ 
      ...form, 
      days: Number(form.days),
      price: Number(form.price)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-3xl font-bold text-yellow-600 mb-6 text-center">
        {initialData ? `Update ${title}` : `Create ${title}`}
      </h2>
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Plan name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          rows={3}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">Days *</label>
          <input
            type="number"
            value={form.days}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (!isNaN(value) && Number(value) > 0)) {
                setForm((f) => ({ ...f, days: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="e.g. 30"
            min="1"
          />
          {errors.days && (
            <p className="text-red-500 text-sm mt-1">{errors.days}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">Price *</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
                setForm((f) => ({ ...f, price: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="e.g. 999"
            min="0"
          />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition font-semibold"
        >
          Cancel
        </button>
        <TimeButton type="submit" loading={loading}>
          {submitLabel}
        </TimeButton>
      </div>
    </form>
  );
};

export default PlanForm;
