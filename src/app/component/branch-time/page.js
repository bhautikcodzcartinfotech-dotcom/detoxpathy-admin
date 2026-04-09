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
          setSelectedBranchId(data[0]._id);
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
                <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
                >
                    <option value="">Choose Branch</option>
                    {allBranches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                        {branch.name}
                    </option>
                    ))}
                </select>
                </div>
            )}
            {branchTimeData && (
                <Button onClick={() => setIsOpen(true)}>Update Time</Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : branchTimeData ? (
          <div className="bg-white shadow-2xl rounded-[2rem] overflow-hidden border border-gray-100">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-white to-orange-50/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Active Schedule</h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium italic">Configure session durations and buffer periods</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-2xl text-yellow-700">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Day of Week</th>
                    <th className="px-8 py-5 text-center">Window</th>
                    <th className="px-8 py-5 text-center">Slot Config</th>
                    <th className="px-8 py-5 text-right whitespace-nowrap">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {branchTimeData.availability?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-yellow-50/10 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                            <span className="font-bold text-gray-700 text-lg">{daysMap[item.day] || `Day ${item.day}`}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                            <span className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 border border-gray-200 whitespace-nowrap">
                                {item.startTime}
                            </span>
                            <div className="w-4 h-0.5 bg-gray-200 rounded-full"></div>
                            <span className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 border border-gray-200 whitespace-nowrap">
                                {item.endTime}
                            </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter mb-1">Duration</span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100">
                                    {item.slotDuration}m
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter mb-1">Buffer</span>
                                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-sm font-bold border border-green-100">
                                    {item.bufferTime}m
                                </span>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right whitespace-nowrap">
                         <span className="text-xs font-medium text-gray-300 italic">
                             {new Date(branchTimeData.updatedAt).toLocaleDateString()}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-2xl rounded-[3rem] p-16 text-center border border-gray-100 flex flex-col items-center max-w-2xl mx-auto mt-10">
            <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-8 animate-pulse">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-4">No Configuration Found</h3>
            <p className="text-gray-500 mb-10 max-w-sm text-lg leading-relaxed font-medium">It looks like the operational hours haven't been set for this branch yet.</p>
            <Button onClick={() => setIsOpen(true)} className="px-10 py-4 text-lg">Initialize Schedule</Button>
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
