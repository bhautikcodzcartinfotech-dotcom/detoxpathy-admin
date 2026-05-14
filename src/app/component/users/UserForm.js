"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";
import { getAllBranches, getAllPlans, getUserOverview } from "@/Api/AllApi";
import { API_HOST } from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import Dropdown from "@/utils/dropdown";
import { Button } from "@/utils/header";

const UserForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const { role, branches: myBranches } = useAuth();
  const [form, setForm] = useState({
    name: "",
    mobilePrefix: "+91",
    mobileNumber: "",
    branchId: "",
    planId: "",
    gstin: "",
    usedReferralCode: "",
    planCurrentDay: 1,
    image: null,
    before_front: null,
    before_side: null,
    after_front: null,
    after_side: null,
    waist: "",
    hip: "",
    chest: "",
    thigh: "",
    biceps: "",
  });
  const [errors, setErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planHistory, setPlanHistory] = useState([]);

  // Fetch branches & plans
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchList, planList] = await Promise.all([
          getAllBranches(),
          getAllPlans(),
        ]);
        setBranches(Array.isArray(branchList) ? branchList : []);
        setPlans(Array.isArray(planList) ? planList : []);
      } catch (err) {
        console.error("Error fetching dropdown data", err);
      }
    };
    fetchData();
  }, []);

  // Prefill on edit and auto-select branch for subadmin
  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        mobilePrefix: initialValues.mobilePrefix || "+91",
        mobileNumber: initialValues.mobileNumber || "",
        branchId: initialValues.branch?._id || initialValues.branch || "",
        planId: initialValues.plan?._id || initialValues.plan || "",
        gstin: initialValues.gstin || "",
        usedReferralCode: initialValues.usedReferralCode || "",
        planCurrentDay: initialValues.planCurrentDay || 1,
        waist: initialValues.waist || "",
        hip: initialValues.hip || "",
        chest: initialValues.chest || "",
        thigh: initialValues.thigh || "",
        biceps: initialValues.biceps || "",
      });
      setErrors({});

      // Fetch plan history when editing to disable all previously assigned plans
      const fetchPlanHistory = async () => {
        try {
          if (initialValues._id) {
            const overview = await getUserOverview(initialValues._id);
            const history = Array.isArray(overview?.planHistory)
              ? overview.planHistory
              : [];
            setPlanHistory(history);
          }
        } catch (err) {
          console.error("Error fetching plan history:", err);
          setPlanHistory([]);
        }
      };
      fetchPlanHistory();
    } else {
      setForm({
        name: "",
        mobilePrefix: "+91",
        mobileNumber: "",
        branchId:
          role === "subadmin" && Array.isArray(myBranches) && myBranches.length
            ? myBranches[0]
            : "",
        planId: "",
        gstin: "",
        usedReferralCode: "",
        planCurrentDay: 1,
      });
      setErrors({});
      setPlanHistory([]);
    }
  }, [initialValues, role, myBranches]);

  const validate = () => {
    const mobileRule = (v) =>
      !/^\d{10}$/.test(v || "") ? "Enter valid 10-digit mobile" : null;
    const required = (label) => (v) => !v ? `${label} is required.` : null;
    const errs = validateForm({
      name: { value: form.name, rules: [required("Name")] },
      mobilePrefix: {
        value: form.mobilePrefix,
        rules: [required("Mobile prefix")],
      },
      mobileNumber: {
        value: form.mobileNumber,
        rules: [required("Mobile number"), mobileRule],
      },
      branchId: { value: form.branchId, rules: [required("Branch")] },
      planId: { value: form.planId, rules: [required("Plan")] },
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const branchOptions = branches
    .filter((b) => (role === "subadmin" ? myBranches.includes(b._id) : true))
    .map((b) => ({ label: b.name, value: b._id }));

  // Get all plan IDs from plan history (all previously assigned plans)
  const getAllAssignedPlanIds = () => {
    const planIds = new Set();

    // Add current plan if exists
    const currentPlanId = initialValues?.plan?._id || initialValues?.plan;
    if (currentPlanId) {
      planIds.add(currentPlanId);
    }

    // Add all plans from plan history
    if (Array.isArray(planHistory)) {
      planHistory.forEach((historyItem) => {
        const planId = historyItem?.plan?._id || historyItem?.plan;
        if (planId) {
          planIds.add(planId);
        }
      });
    }

    return Array.from(planIds);
  };

  // Disable all previously assigned plans when updating
  const disabledPlanValues = initialValues ? getAllAssignedPlanIds() : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter name"
        />
        {errors.name && (
          <p className="text-amber-600 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Mobile */}
      <div className="grid grid-cols-3 gap-3">
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
          />
          {errors.mobilePrefix && (
            <p className="text-amber-600 text-sm mt-1">{errors.mobilePrefix}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className="block mb-1 font-semibold text-gray-700">
            Mobile
          </label>
          <input
            type="text"
            value={form.mobileNumber}
            maxLength={10}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 10) {
                setForm((f) => ({ ...f, mobileNumber: val }));
              }
            }}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="10-digit number"
          />
          {errors.mobileNumber && (
            <p className="text-amber-600 text-sm mt-1">{errors.mobileNumber}</p>
          )}
        </div>
      </div>

      {/* Branch Dropdown */}
      <div>
        <Dropdown
          label="Branch"
          options={branchOptions}
          value={form.branchId}
          onChange={(val) => setForm((f) => ({ ...f, branchId: val }))}
          disabled={role === "subadmin"}
        />
        {errors.branchId && (
          <p className="text-amber-600 text-sm mt-1">{errors.branchId}</p>
        )}
      </div>

      {/* Plan Dropdown */}
      <div>
        <Dropdown
          label="Plan"
          options={plans.map((p) => ({
            label: `${p.name} (₹${p.price || 0})`,
            value: p._id,
            disabled: disabledPlanValues.includes(p._id),
          }))}
          value={form.planId}
          onChange={(val) => setForm((f) => ({ ...f, planId: val }))}
          showCheckbox
          disabledValues={disabledPlanValues}
        />
        {errors.planId && (
          <p className="text-amber-600 text-sm mt-1">{errors.planId}</p>
        )}
        {initialValues && disabledPlanValues.length > 0 && (
          <p className="text-gray-500 text-xs mt-1">
            Previously assigned plans are disabled. Select a new plan to update.
          </p>
        )}
      </div>

      {/* Plan Current Day */}
      {initialValues && (
        <div>
          <label className="block mb-1 font-semibold text-gray-700">Current Plan Day</label>
          <input
            type="number"
            min="1"
            max={plans.find(p => p._id === form.planId)?.days || 90}
            value={form.planCurrentDay}
            onChange={(e) => setForm(f => ({ ...f, planCurrentDay: parseInt(e.target.value) || 1 }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="Enter current day"
          />
          <p className="text-gray-500 text-[10px] mt-1 font-medium uppercase tracking-wider">
            Adjust the user's progress through their current program
          </p>
        </div>
      )}

      {/* GSTIN */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">GSTIN (Optional)</label>
        <input
          type="text"
          value={form.gstin}
          onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter GSTIN"
        />
      </div>

      {/* Used Referral Code */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Used Referral Code (Optional)</label>
        <input
          type="text"
          value={form.usedReferralCode}
          onChange={(e) => setForm((f) => ({ ...f, usedReferralCode: e.target.value.toUpperCase() }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter Referral Code (e.g. A1B2C3D4E5F6)"
        />
        <p className="text-gray-500 text-xs mt-1">
          Provide the code of the person who referred this user.
        </p>
      </div>
      
      {/* Body Measurements */}
      <div className="border-t border-gray-100 pt-6">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Body Measurements (inch)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Waist</label>
            <input
              type="text"
              value={form.waist}
              onChange={(e) => setForm(f => ({ ...f, waist: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hip</label>
            <input
              type="text"
              value={form.hip}
              onChange={(e) => setForm(f => ({ ...f, hip: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chest</label>
            <input
              type="text"
              value={form.chest}
              onChange={(e) => setForm(f => ({ ...f, chest: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thigh</label>
            <input
              type="text"
              value={form.thigh}
              onChange={(e) => setForm(f => ({ ...f, thigh: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Biceps</label>
            <input
              type="text"
              value={form.biceps}
              onChange={(e) => setForm(f => ({ ...f, biceps: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Transformation Photos */}
      <div className="border-t border-gray-100 pt-6">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Transformation Photos
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Photos */}
          <div className="space-y-4 p-4 bg-red-50/30 rounded-2xl border border-red-100">
            <div className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Before Photos</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Front View</label>
                {initialValues?.before?.front && (
                  <img 
                    src={initialValues.before.front.startsWith('http') ? initialValues.before.front : `${API_HOST}/${initialValues.before.front}`} 
                    alt="Current Front" 
                    className="w-20 h-20 object-cover rounded-lg mb-2 border border-red-200"
                  />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setForm(f => ({ ...f, before_front: e.target.files[0] }))}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Side View</label>
                {initialValues?.before?.side && (
                  <img 
                    src={initialValues.before.side.startsWith('http') ? initialValues.before.side : `${API_HOST}/${initialValues.before.side}`} 
                    alt="Current Side" 
                    className="w-20 h-20 object-cover rounded-lg mb-2 border border-red-200"
                  />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setForm(f => ({ ...f, before_side: e.target.files[0] }))}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
              </div>
            </div>
          </div>

          {/* After Photos */}
          <div className="space-y-4 p-4 bg-teal-50/30 rounded-2xl border border-teal-100">
            <div className="text-xs font-black text-teal-600 uppercase tracking-widest mb-2">After Photos</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Front View</label>
                {initialValues?.after?.front && (
                  <img 
                    src={initialValues.after.front.startsWith('http') ? initialValues.after.front : `${API_HOST}/${initialValues.after.front}`} 
                    alt="Current Front" 
                    className="w-20 h-20 object-cover rounded-lg mb-2 border border-teal-200"
                  />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setForm(f => ({ ...f, after_front: e.target.files[0] }))}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Side View</label>
                {initialValues?.after?.side && (
                  <img 
                    src={initialValues.after.side.startsWith('http') ? initialValues.after.side : `${API_HOST}/${initialValues.after.side}`} 
                    alt="Current Side" 
                    className="w-20 h-20 object-cover rounded-lg mb-2 border border-teal-200"
                  />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setForm(f => ({ ...f, after_side: e.target.files[0] }))}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <TimeButton loading={loading}>{submitLabel}</TimeButton>
      </div>
    </form>
  );
};

export default UserForm;
