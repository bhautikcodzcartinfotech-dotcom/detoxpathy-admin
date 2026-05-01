"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { validateForm } from "@/utils/validation";
import { getAllBranches, getAllPlans, getUserOverview } from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import Dropdown from "@/utils/dropdown";

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

      {/* Buttons */}
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

export default UserForm;
