"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { getAllProducts, API_BASE } from "@/Api/AllApi";
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
    products: [] // Array of { productId, quantity }
  });
  const [allProducts, setAllProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts({ start: 1, limit: 100 });
        const prods = Array.isArray(data?.products) ? data.products : [];
        setAllProducts(prods);
        setProductOptions(prods.map(p => ({ label: p.name, value: p._id })));
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        description: initialValues.description || "",
        duration: initialValues.duration || "",
        products: Array.isArray(initialValues.products) 
          ? initialValues.products.map(p => ({ 
              productId: p.productId?._id || p.productId, 
              quantity: p.quantity 
            })) 
          : []
      });
    } else {
      setForm({
        name: "",
        description: "",
        duration: "",
        products: [{ productId: "", quantity: 1 }]
      });
    }
    setErrors({});
  }, [initialValues]);

  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.description) errs.description = "Description is required";
    if (!form.duration) errs.duration = "Duration is required";
    
    if (form.products.length === 0) {
      errs.products = "At least one product is required";
    } else {
      form.products.forEach((p, index) => {
        if (!p.productId) {
          errs[`product_${index}`] = "Product is required";
        }
        if (!p.quantity || p.quantity <= 0) {
          errs[`quantity_${index}`] = "Quantity must be greater than 0";
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const handleAddProduct = () => {
    setForm(prev => ({
      ...prev,
      products: [...prev.products, { productId: "", quantity: 1 }]
    }));
  };

  const handleRemoveProduct = (index) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleProductChange = (index, productId) => {
    const updatedProducts = [...form.products];
    updatedProducts[index].productId = productId;
    setForm(prev => ({ ...prev, products: updatedProducts }));
  };

  const handleQuantityChange = (index, quantity) => {
    const updatedProducts = [...form.products];
    updatedProducts[index].quantity = parseInt(quantity) || 0;
    setForm(prev => ({ ...prev, products: updatedProducts }));
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
        <div className="flex justify-between items-center mb-2">
          <label className="font-semibold text-gray-700">Products</label>
          <button
            type="button"
            onClick={handleAddProduct}
            className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg font-bold hover:bg-yellow-200 transition"
          >
            + Add Product
          </button>
        </div>
        
        <div className="space-y-3">
          {form.products.map((prod, index) => (
            <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex-1">
                <Dropdown
                  options={productOptions}
                  value={prod.productId}
                  onChange={(val) => handleProductChange(index, val)}
                  label={null}
                />
                {prod.productId && (
                  <div className="mt-2 flex items-center gap-2 bg-white/50 p-1.5 rounded-lg border border-yellow-200">
                    {allProducts.find(p => p._id === prod.productId)?.images?.[0] ? (
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 shadow-sm">
                        <img 
                          src={`${API_BASE}${allProducts.find(p => p._id === prod.productId).images[0]}`} 
                          alt="product"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">NA</div>
                    )}
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {allProducts.find(p => p._id === prod.productId)?.name}
                    </span>
                  </div>
                )}
                {errors[`product_${index}`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`product_${index}`]}</p>
                )}
              </div>
              <div className="w-24">
                <input
                  type="number"
                  value={prod.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Qty"
                  min="1"
                />
                {errors[`quantity_${index}`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`quantity_${index}`]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveProduct(index)}
                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        {errors.products && <p className="text-red-500 text-sm mt-1">{errors.products}</p>}
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
