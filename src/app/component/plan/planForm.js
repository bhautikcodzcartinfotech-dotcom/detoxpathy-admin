"use client";
import { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { getSetting, API_HOST } from "@/Api/AllApi";
import { validateForm } from "@/utils/validation";

const PlanForm = ({
  initialData,
  onSubmit,
  onClose,
  submitLabel = "Save",
  loading = false,
  title = "Plan",
}) => {
  const [currency, setCurrency] = useState("₹");
  const [form, setForm] = useState({
    name: "",
    description: "",
    days: "",
    price: "",
    bulkDiscount: "",
    weight: "",
    notificationDays: [],
    planCode: "",
    image: null,
  });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await getSetting();
        let settingsData;
        if (response && response.data) {
          settingsData = response.data;
        } else if (response && response.setting) {
          settingsData = response.setting;
        } else if (response && response._id) {
          settingsData = response;
        }
        if (settingsData && settingsData.currency) {
          setCurrency(settingsData.currency);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    fetchCurrency();
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        days: initialData.days ?? "",
        price: initialData.price ?? "",
        bulkDiscount: initialData.bulkDiscount ?? "",
        weight: initialData.weight ?? 0,
        notificationDays: initialData.notificationDays || [],
        planCode: initialData.planCode || "",
        image: null,
      });
      if (initialData.image) {
        setImagePreview(`${API_HOST}/${initialData.image}`);
      } else {
        setImagePreview("");
      }
    } else {
      setForm({
        name: "",
        description: "",
        days: "",
        price: "",
        bulkDiscount: "",
        weight: "",
        notificationDays: [],
        planCode: "",
        image: null,
      });
      setImagePreview("");
    }
    setErrors({});
  }, [initialData]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, image: file }));
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      if (initialData && initialData.image) {
        setImagePreview(`${API_HOST}/${initialData.image}`);
      } else {
        setImagePreview("");
      }
    }
  };

  const validate = () => {
    const required = (label) => (v) => (!v ? `${label} is required` : null);
    const positiveNumberRule = (label) => (v) => {
      if (v === undefined || v === null || v === "")
        return `${label} is required`;
      const num = Number(v);
      if (isNaN(num)) return `${label} must be a valid number`;
      if (num < 0) return `${label} cannot be negative`;
      return null;
    };
    const optionalNonNegativeNumber = (label) => (v) => {
      if (v === undefined || v === null || v === "") return null;
      const num = Number(v);
      if (isNaN(num)) return `${label} must be a valid number`;
      if (num < 0) return `${label} cannot be negative`;
      return null;
    };
    const optionalFourDigitRule = (label) => (v) => {
      if (!v) return null;
      if (!/^\d{4}$/.test(v)) return `${label} must be exactly 4 digits`;
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
      bulkDiscount: {
        value: form.bulkDiscount,
        rules: [optionalNonNegativeNumber("Bulk Discount")],
      },
      weight: { value: form.weight, rules: [positiveNumberRule("Weight")] },
      planCode: { value: form.planCode, rules: [required("Plan Code"), optionalFourDigitRule("Plan Code")] },
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
      price: Number(form.price),
      bulkDiscount:
        form.bulkDiscount === "" ? 0 : Number(form.bulkDiscount),
      weight: Number(form.weight) || 0,
      notificationDays: form.notificationDays,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-3xl font-bold text-yellow-600 mb-6 text-center">
        {initialData ? `Update ${title}` : `Create ${title}`}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">Name *</label>
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
          <label className="block mb-1 font-semibold text-gray-700">Plan Code *</label>
          <input
            type="text"
            maxLength={4}
            value={form.planCode}
            onChange={(e) => setForm((f) => ({ ...f, planCode: e.target.value }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="e.g. 1234"
          />
          {errors.planCode && (
            <p className="text-red-500 text-sm mt-1">{errors.planCode}</p>
          )}
        </div>
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
          placeholder="Plan description"
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Days *
          </label>
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

        <div className="col-span-full">
          <label className="block mb-2 font-bold text-gray-800 text-sm">
            Select which days trigger an appointment reminder (24 hours before
            each):
          </label>
          <div className="bg-[#e9f5f2] p-6 rounded-[20px] border border-[#d1e9e3] shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-6 gap-x-4">
              {Array.from(
                { length: Number(form.days) || 0 },
                (_, i) => i + 1,
              ).map((day) => (
                <label
                  key={day}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={form.notificationDays?.includes(day)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newDays = checked
                          ? [...(form.notificationDays || []), day].sort(
                            (a, b) => a - b,
                          )
                          : (form.notificationDays || []).filter(
                            (d) => d !== day,
                          );
                        setForm({ ...form, notificationDays: newDays });
                      }}
                      className="w-5 h-5 border-2 border-gray-300 rounded bg-white checked:bg-green-600 checked:border-green-600 focus:ring-green-500 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col -mt-1">
                    {/* <span className="text-[15px] font-semibold text-gray-600 group-hover:text-green-700 transition-colors">Day</span> */}
                    <span className="text-[15px] font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                      {day}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {(Number(form.days) || 0) === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-4">
                Enter plan days above to configure reminders
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Price ({currency}) *
          </label>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Bulk Discount (%) (optional)
          </label>
          <input
            type="number"
            value={form.bulkDiscount}
            onChange={(e) => {
              const value = e.target.value;

              setForm((f) => ({
                ...f,
                bulkDiscount: value === "" ? "" : Number(value),
              }));
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="e.g. 10"
            min="0"
          />
          {errors.bulkDiscount && (
            <p className="text-red-500 text-sm mt-1">{errors.bulkDiscount}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Weight (grams) *
          </label>
          <input
            type="number"
            value={form.weight}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
                setForm((f) => ({ ...f, weight: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="e.g. 1500"
            min="0"
          />
          {errors.weight && (
            <p className="text-red-500 text-sm mt-1">{errors.weight}</p>
          )}
        </div>
      </div>

      {/* Plan Image Upload */}
      <div className="space-y-2">
        <label className="block font-semibold text-gray-700">Plan Image</label>
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-yellow-400/60 rounded-xl bg-yellow-50/30">
          {imagePreview ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-yellow-300 shadow-sm flex-shrink-0 bg-white">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, image: null }));
                  setImagePreview("");
                }}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-yellow-300 bg-white flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
              <svg className="w-8 h-8 text-yellow-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-bold text-yellow-600/60 mt-1">NO IMAGE</span>
            </div>
          )}
          <div className="flex-1 w-full">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-yellow-500 file:text-white hover:file:bg-yellow-600 file:cursor-pointer transition cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">Recommended size: Square (e.g. 500x500px). JPG, PNG, WEBP.</p>
          </div>
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
