"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";
import { API_BASE } from "@/Api/AllApi";

const ProductForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    discountedPrice: "",
    branchPrice: "",
    images: null, // FileList for new uploads
  });
  const [existingImages, setExistingImages] = useState([]); // For displaying existing images when editing
  const [imagesToRemove, setImagesToRemove] = useState([]); // Track images to remove
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        description: initialValues.description || "",
        basePrice: initialValues.basePrice || "",
        discountedPrice: initialValues.discountedPrice || "",
        branchPrice: initialValues.branchPrice || "",
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
        branchPrice: "",
        images: null,
      });
      setExistingImages([]);
      setImagesToRemove([]);
      setErrors({});
    }
  }, [initialValues]);

  const validate = () => {
    const required = (label) => (v) => !v ? `${label} is required.` : null;
    const number = (label) => (v) => isNaN(Number(v)) ? `${label} must be a number.` : null;
    const positive = (label) => (v) => Number(v) <= 0 ? `${label} must be positive.` : null;

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
        rules: [required("Discounted price"), number("Discounted price"), positive("Discounted price")],
      },
      branchPrice: {
        value: form.branchPrice,
        rules: [required("Branch price"), number("Branch price"), positive("Branch price")],
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
    formData.append('branchPrice', form.branchPrice);

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
            Base Price
          </label>
          <input
            type="number"
            value={form.basePrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, basePrice: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="500"
            min="0"
            step="0.01"
          />
          {errors.basePrice && (
            <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-semibold text-gray-700">
            Discounted Price
          </label>
          <input
            type="number"
            value={form.discountedPrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountedPrice: e.target.value }))
            }
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="400"
            min="0"
            step="0.01"
          />
          {errors.discountedPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.discountedPrice}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">
          Branch Price
        </label>
        <input
          type="number"
          value={form.branchPrice}
          onChange={(e) =>
            setForm((f) => ({ ...f, branchPrice: e.target.value }))
          }
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="350"
          min="0"
          step="0.01"
        />
        {errors.branchPrice && (
          <p className="text-red-500 text-sm mt-1">{errors.branchPrice}</p>
        )}
      </div>

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
                .filter(image => image && image.trim() !== '' && image.startsWith('/') && !imagesToRemove.includes(image))
                .map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={`${API_BASE}${image}`}
                      alt={`Existing ${index + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.src = ''; // Clear src to prevent further requests
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