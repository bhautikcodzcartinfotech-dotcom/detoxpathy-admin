"use client";
import React, { useEffect, useState } from "react";
import {
  getAllPlans,
  getSuggestedProgram,
  suggestProgram,
  updateSuggestedProgram,
  deleteSuggestedProgram,
  API_BASE,
} from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import Loader from "@/utils/loader";
import toast from "react-hot-toast";

const ProgramSuggestionForm = ({ user, onCancel, onSave }) => {
  const [programs, setPrograms] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSuggestion, setExistingSuggestion] = useState(null);
  
  // Search states
  const [programSearch, setProgramSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Get all plans
        const allProgs = await getAllPlans();
        setPrograms(Array.isArray(allProgs) ? allProgs : []);

        // 2. Get current suggestions for this user (and all products)
        try {
          const response = await getSuggestedProgram(user._id);
          const suggestion = response?.suggestion;
          const products = response?.products || [];
          
          setAvailableProducts(products);

          if (suggestion) {
            setExistingSuggestion(suggestion);
            
            // Set current program
            const currentProgramId = suggestion.plans?._id || suggestion.plans || "";
            setSelectedProgramId(currentProgramId);

            // Set current products
            if (suggestion.products && Array.isArray(suggestion.products)) {
              const currentProductIds = suggestion.products.map(p => p._id || p);
              setSelectedProductIds(currentProductIds);
            }
          }
        } catch (err) {
          // If no suggestion found, it's fine
          setExistingSuggestion(null);
          setSelectedProgramId("");
          setSelectedProductIds([]);
        }
      } catch (err) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user._id]);

  const handleProgramSelect = (programId) => {
    setSelectedProgramId((prev) => (prev === programId ? "" : programId));
  };

  const handleProductToggle = (productId) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const handleSave = async () => {
    if (!selectedProgramId && selectedProductIds.length === 0) {
      toast.error("Please select at least a program or a product");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId: user._id,
        planId: selectedProgramId,
        products: selectedProductIds
      };

      if (existingSuggestion) {
        await updateSuggestedProgram(user._id, payload);
        toast.success("Suggestions updated successfully!");
      } else {
        await suggestProgram(payload);
        toast.success("Suggestions saved successfully!");
      }
      if (onSave) onSave();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save suggestions");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSuggestion) return;
    if (!window.confirm("Are you sure you want to remove all suggestions?"))
      return;

    try {
      setSaving(true);
      await deleteSuggestedProgram(user._id);
      toast.success("Suggestions removed!");
      setExistingSuggestion(null);
      setSelectedProgramId("");
      setSelectedProductIds([]);
      if (onSave) onSave();
    } catch (err) {
      toast.error("Failed to delete suggestions");
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const filteredPrograms = programs.filter(p => 
    p.name?.toLowerCase().includes(programSearch.toLowerCase())
  );

  const filteredProducts = availableProducts.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) return <div className="h-64 flex items-center justify-center text-yellow-500"><Loader /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6 pr-1">
        
        {/* Program Selection */}
        <section>
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Select Health Program</h3>
            </div>
            
            {/* Program Search */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search programs..." 
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                className="w-full sm:w-80 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Choose a plan to suggest to <strong>{user.name}</strong>.
          </p>

          {filteredPrograms.length === 0 ? (
            <div className="text-center py-6 text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">
              {programSearch ? "No matching programs found." : "No programs available."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredPrograms.map((program) => {
                const isSelected = selectedProgramId === program._id;
                return (
                  <div
                    key={program._id}
                    onClick={() => handleProgramSelect(program._id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${isSelected
                        ? "border-yellow-400 bg-yellow-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-yellow-200"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-yellow-500 bg-yellow-500" : "border-gray-300 bg-white"
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-transparent"}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm">{program.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {program.days} Days
                        </span>
                        <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded text-green-700 font-bold">
                          ₹{program.price}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Product Selection */}
        <section className="pt-6 border-t border-gray-100">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-400 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Suggest Products</h3>
            </div>

            {/* Product Search */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search products..." 
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full sm:w-80 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Select products to recommend.
          </p>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-6 text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">
              {productSearch ? "No matching products found." : "No products available."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredProducts.map((product) => {
                const isSelected = selectedProductIds.includes(product._id);
                return (
                  <div
                    key={product._id}
                    onClick={() => handleProductToggle(product._id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${isSelected
                        ? "border-teal-400 bg-teal-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-teal-100"
                      }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-teal-500 border-teal-500" : "border-gray-300 bg-white"
                        }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{product.name}</span>
                      <span className="text-[10px] font-bold text-teal-600">₹{product.discountedPrice || product.basePrice}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 flex-shrink-0">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <TimeButton loading={saving} onClick={handleSave}>
            Save Suggestions
          </TimeButton>
        </div>
      </div>
    </div>
  );
};

export default ProgramSuggestionForm;
