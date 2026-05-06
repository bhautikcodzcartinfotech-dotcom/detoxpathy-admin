"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm, validateEmail } from "@/utils/validation";

const BranchForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    email: "",
    latitude: "",
    longitude: "",
    mobilePrefix: "+91",
    mobileNumber: "",
    isMainBranch: false,
    isStateHeadBranch: false,
    isFranchise: false,
    gstin: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name ?? "",
        address: initialValues.address ?? "",
        city: initialValues.city ?? "",
        state: initialValues.state ?? "",
        pincode: initialValues.pincode ?? "",
        email: initialValues.email ?? "",
        latitude: initialValues.latitude ?? "",
        longitude: initialValues.longitude ?? "",
        mobilePrefix: initialValues.mobilePrefix ?? "+91",
        mobileNumber: initialValues.mobileNumber ?? "",
        isMainBranch: initialValues.isMainBranch ?? false,
        isStateHeadBranch: initialValues.isStateHeadBranch ?? false,
        isFranchise: initialValues.isFranchise ?? false,
        gstin: initialValues.gstin ?? "",
      });
      setErrors({});
    } else {
      setForm({
        name: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        email: "",
        latitude: "",
        longitude: "",
        mobilePrefix: "+91",
        mobileNumber: "",
        isMainBranch: false,
        isStateHeadBranch: false,
        isFranchise: false,
        gstin: "",
      });
      setErrors({});
    }
  }, [initialValues]);

  const validate = () => {
    const required = (label) => (v) => !v ? `${label} is required.` : null;
    const numberRule = (label) => (v) => {
      if (!v) return null; // Allow empty for optional fields
      const num = Number(v);
      return isNaN(num) ? `${label} must be a valid number.` : null;
    };
    const pincodeRule = (v) => {
      if (!v) return "Pincode is required.";
      const num = Number(v);
      if (isNaN(num)) return "Pincode must be a valid number.";
      if (v.length !== 6) return "Pincode must be 6 digits.";
      return null;
    };
    const mobileRule = (v) => {
      if (!v) return "Mobile number is required.";
      const num = Number(v);
      if (isNaN(num)) return "Mobile number must be a valid number.";
      // Require exactly 10 digits
      if (String(v).length !== 10)
        return "Mobile number must be exactly 10 digits.";
      return null;
    };
    const latitudeRule = (v) => {
      if (!v) return null; // Optional field
      const num = Number(v);
      if (isNaN(num)) return "Latitude must be a valid number.";
      if (num < -90 || num > 90) return "Latitude must be between -90 and 90.";
      return null;
    };
    const longitudeRule = (v) => {
      if (!v) return null; // Optional field
      const num = Number(v);
      if (isNaN(num)) return "Longitude must be a valid number.";
      if (num < -180 || num > 180)
        return "Longitude must be between -180 and 180.";
      return null;
    };

    const errs = validateForm({
      name: { value: form.name, rules: [required("Name")] },
      email: { value: form.email, rules: [validateEmail] },
      city: { value: form.city, rules: [required("City")] },
      state: { value: form.state, rules: [required("State")] },
      pincode: { value: form.pincode, rules: [pincodeRule] },
      mobilePrefix: {
        value: form.mobilePrefix,
        rules: [required("Mobile prefix")],
      },
      mobileNumber: {
        value: form.mobileNumber,
        rules: [mobileRule],
      },
      latitude: {
        value: form.latitude,
        rules: [latitudeRule],
      },
      longitude: {
        value: form.longitude,
        rules: [longitudeRule],
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="Branch name"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="demo@gmail.com"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          GSTIN
        </label>
        <input
          type="text"
          value={form.gstin}
          onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="GSTIN"
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Address
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="House/Street, Area"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="City"
          />
          {errors.city && (
            <p className="text-red-500 text-sm mt-1">{errors.city}</p>
          )}
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            State
          </label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="State"
          />
          {errors.state && (
            <p className="text-red-500 text-sm mt-1">{errors.state}</p>
          )}
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Pincode *
          </label>
          <input
            type="number"
            value={form.pincode}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 6) {
                setForm((f) => ({ ...f, pincode: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="400001"
            maxLength={6}
          />
          {errors.pincode && (
            <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Latitude <span className="text-gray-500 text-sm">(Optional)</span>
          </label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) =>
              setForm((f) => ({ ...f, latitude: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="19.0760"
            min="-90"
            max="90"
          />
          {errors.latitude && (
            <p className="text-red-500 text-sm mt-1">{errors.latitude}</p>
          )}
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Longitude <span className="text-gray-500 text-sm">(Optional)</span>
          </label>
          <input
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) =>
              setForm((f) => ({ ...f, longitude: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="72.8777"
            min="-180"
            max="180"
          />
          {errors.longitude && (
            <p className="text-red-500 text-sm mt-1">{errors.longitude}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Prefix
          </label>
          <input
            type="text"
            value={form.mobilePrefix}
            onChange={(e) =>
              setForm((f) => ({ ...f, mobilePrefix: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="+91"
          />
          {errors.mobilePrefix && (
            <p className="text-red-500 text-sm mt-1">{errors.mobilePrefix}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block mb-1 font-semibold text-gray-700">
            Mobile *
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={form.mobileNumber}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              if (onlyDigits.length <= 10) {
                setForm((f) => ({ ...f, mobileNumber: onlyDigits }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="9123456789"
          />
          {errors.mobileNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.mobileNumber}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <label className="block mb-1 font-semibold text-gray-700">
            isFranchise
          </label>
          <input
            type="checkbox"
            checked={form.isFranchise}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm((f) => ({
                ...f,
                isFranchise: checked,
                ...(checked && { isMainBranch: false, isStateHeadBranch: false }),
              }));
            }}
            className="w-5 h-5 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500 focus:ring-2"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="block mb-1 font-semibold text-gray-700">
            Main Branch
          </label>
          <input
            type="checkbox"
            checked={form.isMainBranch}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm((f) => ({
                ...f,
                isMainBranch: checked,
                ...(checked && { isFranchise: false }),
              }));
            }}
            className="w-5 h-5 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500 focus:ring-2"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="block mb-1 font-semibold text-gray-700">
            State Head Branch
          </label>
          <input
            type="checkbox"
            checked={form.isStateHeadBranch}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm((f) => ({
                ...f,
                isStateHeadBranch: checked,
                ...(checked && { isFranchise: false }),
              }));
            }}
            className="w-5 h-5 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500 focus:ring-2"
          />
        </div>
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

export default BranchForm;
