"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { Button } from "@/utils/header";

const CouponForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    couponCode: "",
    expiry: "",
    limit: "",
    discountValue: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        couponCode: initialValues.couponCode || "",
        expiry: initialValues.expiry ? initialValues.expiry.slice(0, 10) : "",
        limit: initialValues.limit != null ? initialValues.limit : "",
        discountValue: initialValues.discountValue != null ? initialValues.discountValue : "",
      });
    } else {
      setForm({ couponCode: "", expiry: "", limit: "", discountValue: "" });
    }
    setErrors({});
  }, [initialValues]);

  const validate = () => {
    const errs = {};
    if (!form.couponCode.trim()) errs.couponCode = "Coupon code is required";
    if (!form.expiry) errs.expiry = "Expiry date is required";
    if (!form.limit || Number(form.limit) < 1) errs.limit = "Limit must be at least 1";
    if (form.discountValue === "" || Number(form.discountValue) <= 0 || Number(form.discountValue) > 100)
      errs.discountValue = "Discount must be between 1 and 100";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      couponCode: form.couponCode.toUpperCase().trim(),
      expiry: form.expiry,
      limit: Number(form.limit),
      discountValue: Number(form.discountValue),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Coupon Code</label>
        <input
          type="text"
          value={form.couponCode}
          onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition uppercase tracking-widest font-bold"
          placeholder="e.g. TRIAL99"
        />
        {errors.couponCode && <p className="text-amber-600 text-sm mt-1">{errors.couponCode}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Expiry Date</label>
        <input
          type="date"
          value={form.expiry}
          onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
        {errors.expiry && <p className="text-amber-600 text-sm mt-1">{errors.expiry}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Usage Limit</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={form.limit}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setForm((f) => ({ ...f, limit: value }));
          }}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="How many times can this be used?"
        />
        {errors.limit && <p className="text-amber-600 text-sm mt-1">{errors.limit}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Discount (%)</label>
        <input
          type="text"
          inputMode="decimal"
          value={form.discountValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
              setForm((f) => ({ ...f, discountValue: value }));
            }
          }}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="e.g. 30 for 30% off"
        />
        {errors.discountValue && <p className="text-amber-600 text-sm mt-1">{errors.discountValue}</p>}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <TimeButton loading={loading}>{submitLabel}</TimeButton>
      </div>
    </form>
  );
};

export default CouponForm;
