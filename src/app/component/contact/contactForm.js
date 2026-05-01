"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";
import { API_BASE } from "@/Api/AllApi";

const ContactForm = ({
  onSubmit,
  onCancel,
  loading,
  categories = [],
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    name: "",
    mobileNo: "",
    categoryId: "",
    description: "",
    image: null,
  });
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        mobileNo: initialValues.mobileNo || "",
        categoryId: initialValues.categoryId?._id || initialValues.categoryId || "",
        description: initialValues.description || "",
        image: null,
      });
      setPreview(initialValues.image ? (initialValues.image.startsWith('http') ? initialValues.image : `${API_BASE}${initialValues.image.startsWith('/') ? initialValues.image : '/' + initialValues.image}`) : null);
      setErrors({});
    } else {
      setForm({
        name: "",
        mobileNo: "",
        categoryId: "",
        description: "",
        image: null,
      });
      setPreview(null);
      setErrors({});
    }
  }, [initialValues]);

  const validate = () => {
    const required = (label) => (v) => !v ? `${label} is required.` : null;
    const errs = validateForm({
      name: {
        value: form.name,
        rules: [required("Name")],
      },
      mobileNo: {
        value: form.mobileNo,
        rules: [required("Mobile number")],
      },
      categoryId: {
        value: form.categoryId,
        rules: [required("Category")],
      },
      description: {
        value: form.description,
        rules: [required("Description")],
      },
    });


    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((f) => ({ ...f, image: file }));
      setPreview(URL.createObjectURL(file));
    }
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
          placeholder="Contact Name"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Mobile Number</label>
        <input
          type="text"
          value={form.mobileNo}
          onChange={(e) => setForm((f) => ({ ...f, mobileNo: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Mobile Number"
        />
        {errors.mobileNo && <p className="text-red-500 text-sm mt-1">{errors.mobileNo}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Category</label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Short description"
          rows={3}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
        {preview && (
          <div className="mt-2">
            <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-yellow-400" />
          </div>
        )}
        {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
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

export default ContactForm;
