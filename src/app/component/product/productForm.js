"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";
import { API_BASE, getSetting, resolveImageUrl } from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";

const ProductForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const { role } = useAuth();
  const [currency, setCurrency] = useState("₹");
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    discountedPrice: "",
    bulkDiscount: "",
    hsnCode: "",
    gstPercentage: "",
    unit: "",
    weight: "",
    isForKit: false,
    images: null, // FileList for new uploads
  });
  const [existingImages, setExistingImages] = useState([]); // For displaying existing images when editing
  const [imagesToRemove, setImagesToRemove] = useState([]); // Track images to remove
  const [errors, setErrors] = useState({});

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
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        description: initialValues.description || "",
        basePrice: initialValues.basePrice ?? "",
        discountedPrice: initialValues.discountedPrice ?? "",
        bulkDiscount: initialValues.bulkDiscount ?? "",
        hsnCode: initialValues.hsnCode || "",
        gstPercentage: initialValues.gstPercentage ?? "",
        unit: initialValues.unit || "",
        weight: initialValues.weight ?? 0,
        isForKit: initialValues.isForKit ?? false,
        images: null,
      });
      setExistingImages(Array.isArray(initialValues.images) ? initialValues.images : []);
      setImagesToRemove([]);
      setErrors({});
    } else {
      setForm({
        name: "",
        description: "",
        basePrice: "",
        discountedPrice: "",
        bulkDiscount: "",
        hsnCode: "",
        gstPercentage: "",
        unit: "",
        weight: "",
        isForKit: false,
        images: null,
      });
      setExistingImages([]);
      setImagesToRemove([]);
      setErrors({});
    }
  }, [initialValues]);

  const validate = () => {
    const required = (label) => (v) => (v === undefined || v === null || v === "") ? `${label} is required.` : null;
    const number = (label) => (v) => (v !== "" && v !== null && v !== undefined) && isNaN(Number(v)) ? `${label} must be a number.` : null;
    const positive = (label) => (v) => (v !== "" && v !== null && v !== undefined) && Number(v) <= 0 ? `${label} must be positive.` : null;
    const nonNegative = (label) => (v) => (v !== "" && v !== null && v !== undefined) && Number(v) < 0 ? `${label} cannot be negative.` : null;

    const errs = validateForm({
      name: {
        value: form.name,
        rules: [required("Product name")],
      },
      description: {
        value: form.description,
        rules: [required("Description")],
      },
      basePrice: {
        value: form.basePrice,
        rules: [required("Base price"), number("Base price"), positive("Base price")],
      },
      discountedPrice: {
        value: form.discountedPrice,
        rules: [number("Discounted price")],
      },
      bulkDiscount: {
        value: form.bulkDiscount,
        rules: [number("Bulk Discount"), nonNegative("Bulk Discount")],
      },
      hsnCode: {
        value: form.hsnCode,
        rules: [required("HSN Code")],
      },
      gstPercentage: {
        value: form.gstPercentage,
        rules: [required("GST Percentage"), number("GST Percentage")],
      },
      unit: {
        value: form.unit,
        rules: [required("Unit")],
      },
      weight: {
        value: form.weight,
        rules: [required("Weight"), number("Weight"), nonNegative("Weight")],
      },
    });

    // Validate images - at least one image required (new upload or existing after removal)
    const hasNewImages = form.images && form.images.length > 0;
    const remainingExistingImages = existingImages.filter(img => !imagesToRemove.includes(img));
    const hasExistingImages = remainingExistingImages.length > 0;
    if (!hasNewImages && !hasExistingImages) {
      errs.images = "At least one image is required.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRemoveExistingImage = (imagePath) => {
    setImagesToRemove(prev => [...prev, imagePath]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('basePrice', form.basePrice);
    formData.append('discountedPrice', form.discountedPrice);
    formData.append('bulkDiscount', form.bulkDiscount);
    formData.append('hsnCode', form.hsnCode);
    formData.append('gstPercentage', form.gstPercentage);
    formData.append('unit', form.unit);
    formData.append('weight', form.weight);
    formData.append('isForKit', form.isForKit);

    // Add images to remove
    if (imagesToRemove.length > 0) {
      imagesToRemove.forEach(imagePath => {
        formData.append('imagesToRemove', imagePath);
      });
    }

    // Add image files if selected
    if (form.images) {
      Array.from(form.images).forEach((file, index) => {
        formData.append('images', file);
      });
    }

    await onSubmit(formData);
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Product Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) =>
            setForm((f) => ({ ...f, name: e.target.value }))
          }
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter product name"
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
          placeholder="Enter product description"
          rows={4}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Base Price ({currency})
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.basePrice}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setForm((f) => ({ ...f, basePrice: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="500"
          />
          {errors.basePrice && (
            <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Discounted Price ({currency})
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.discountedPrice}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setForm((f) => ({ ...f, discountedPrice: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="400"
          />
          {errors.discountedPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.discountedPrice}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            HSN Code
          </label>
          <input
            type="text"
            value={form.hsnCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, hsnCode: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="HSN Code"
          />
          {errors.hsnCode && (
            <p className="text-red-500 text-sm mt-1">{errors.hsnCode}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            GST %
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.gstPercentage}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setForm((f) => ({ ...f, gstPercentage: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="18"
          />
          {errors.gstPercentage && (
            <p className="text-red-500 text-sm mt-1">{errors.gstPercentage}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Unit
          </label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) =>
              setForm((f) => ({ ...f, unit: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="Pcs, Kg, etc."
          />
          {errors.unit && (
            <p className="text-red-500 text-sm mt-1">{errors.unit}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Weight (grams)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.weight}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setForm((f) => ({ ...f, weight: value }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="e.g. 500"
          />
          {errors.weight && (
            <p className="text-red-500 text-sm mt-1">{errors.weight}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Bulk Discount (%)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={form.bulkDiscount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
              setForm((f) => ({ ...f, bulkDiscount: value }));
            }
          }}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="10"
        />
        {errors.bulkDiscount && (
          <p className="text-red-500 text-sm mt-1">{errors.bulkDiscount}</p>
        )}
      </div>

      {role === "Admin" && (
        <div className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id="isForKit"
            checked={form.isForKit}
            onChange={(e) => setForm(f => ({ ...f, isForKit: e.target.checked }))}
            className="w-5 h-5 border-2 border-yellow-400 rounded bg-white checked:bg-yellow-500 checked:border-yellow-500 focus:ring-yellow-400 transition-all cursor-pointer"
          />
          <label htmlFor="isForKit" className="font-semibold text-gray-700 cursor-pointer select-none">
            Is For Kit
          </label>
        </div>
      )}

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Product Images
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setForm(f => ({ ...f, images: e.target.files }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
        />
        <div className="mt-1 text-xs text-gray-500">
          You can select multiple images at once (hold Ctrl/Cmd to select multiple files, up to 10 files total)
        </div>
        {form.images && form.images.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            {form.images.length} file(s) selected
          </div>
        )}
        {existingImages.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">Existing Images:</p>
            <div className="flex flex-wrap gap-2">
              {existingImages
                .filter(image => image && image.trim() !== '' && !imagesToRemove.includes(image))
                .map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={resolveImageUrl(image)}
                      alt={`Existing ${index + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                      onError={(e) => {
                        e.target.src = "/image/placeholder.avif";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(image)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
        {errors.images && (
          <p className="text-red-500 text-sm mt-1">{errors.images}</p>
        )}
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

export default ProductForm;