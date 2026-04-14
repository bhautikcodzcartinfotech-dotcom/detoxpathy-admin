"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getBranchTime,
  getAllBranches,
  createBranchTime,
  updateBranchTime
} from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import BranchTimeForm from "./branchTimeForm";

const BranchTimePage = () => {
  const { role, branches } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [branchTimeData, setBranchTimeData] = useState(null);
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const daysMap = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };

  const fetchAllBranches = async () => {
    try {
      const data = await getAllBranches();
      setAllBranches(data);
      if (data.length > 0 && !selectedBranchId) {
        if (role === "subadmin" && branches.length > 0) {
          setSelectedBranchId(branches[0]);
        } else {
          const defaultBranch = role === "Admin" ? data.find(b => b.isMainBranch) : data[0];
          if (defaultBranch) {
            setSelectedBranchId(defaultBranch._id);
          } else {
            setSelectedBranchId(data[0]._id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranchTimeData = async (branchId) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const data = await getBranchTime(branchId);
      setBranchTimeData(data);
    } catch (e) {
      console.error(e);
      setBranchTimeData(null);
      // Only show error if it's not a 404 (not found)
      if (e?.response?.status !== 404) {
        toast.error(e?.response?.data?.message || "Failed to load branch time");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchBranchTimeData(selectedBranchId);
    } else {
      setLoading(false);
    }
  }, [selectedBranchId]);

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      const payload = {
        branchId: selectedBranchId,
        availability: formData.availability
      };

      if (branchTimeData) {
        // Update
        await updateBranchTime(selectedBranchId, payload);
        toast.success("Branch time updated successfully!");
      } else {
        // Create
        await createBranchTime(payload);
        toast.success("Branch time created successfully!");
      }

      await fetchBranchTimeData(selectedBranchId);
      setIsOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save branch time");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex flex-col gap-1">
            <Header size="3xl">Branch Time</Header>
            {branchTimeData && (
              <p className="text-xs text-gray-400">Manage operational hours for your branch</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {role === "Admin" && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Branch</label>
                <span className="p-1 text-sm font-semibold text-gray-700">
                  {allBranches.find((b) => b._id === selectedBranchId)?.name || "Loading..."}
                </span>
              </div>
            )}
            {branchTimeData && (role !== "Admin" || allBranches.find((b) => b._id === selectedBranchId)?.isMainBranch) && (
              <Button onClick={() => setIsOpen(true)}>Update Time</Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : branchTimeData ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#e6f4f1] text-[#134d41] flex items-center justify-center font-bold text-xl shrink-0">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Active Schedule
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">
                    Updated: {new Date(branchTimeData.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {branchTimeData.availability?.map((item, idx) => (
                <div key={idx} className="border-b md:border-r border-gray-200 p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-[#134D41] uppercase tracking-wide">
                      {daysMap[item.day] || `Day ${item.day}`}
                    </span>
                  </div>
                  
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Time Window</div>
                    <div className="text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-block">
                      {item.startTime} — {item.endTime}
                    </div>
                  </div>

                  {item.breakStartTime && item.breakEndTime ? (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Break Time</div>
                      <div className="text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 inline-block">
                        {item.breakStartTime} — {item.breakEndTime}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Break Time</div>
                      <div className="text-sm font-medium text-gray-400">None</div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-6 mt-1 border-t border-gray-100 pt-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Duration</div>
                      <div className="text-sm font-bold text-gray-800">{item.slotDuration} mins</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Buffer</div>
                      <div className="text-sm font-bold text-gray-800">{item.bufferTime} mins</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center max-w-2xl mx-auto mt-10">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6 mx-auto">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No Configuration Found</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">It looks like the operational hours haven't been set for this branch yet.</p>
            {(role !== "Admin" || allBranches.find((b) => b._id === selectedBranchId)?.isMainBranch) && (
              <Button onClick={() => setIsOpen(true)}>Initialize Schedule</Button>
            )}
          </div>
        )}

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">
              {branchTimeData ? "Update Schedule" : "Initialize Time"}
            </h2>
            <p className="text-sm text-gray-500 font-medium">Set the working windows and slot details for this branch.</p>
          </div>

          <BranchTimeForm
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            loading={formLoading}
            initialValues={branchTimeData}
            submitLabel={branchTimeData ? "Save Changes" : "Create Schedule"}
          />
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default BranchTimePage;
