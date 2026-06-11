"use client";
import React, { useEffect, useState, useRef } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getBranchTime,
  getAllBranches,
  createBranchTime,
  updateBranchTime,
  listBranchTimeRequests,
  approveBranchTimeRequest,
  rejectBranchTimeRequest
} from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import BranchTimeForm from "./branchTimeForm";
import Dropdown from "@/utils/dropdown";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const BranchTimePage = () => {
  const { role, branches, permissions } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [branchTimeData, setBranchTimeData] = useState(null);
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (typeof window !== "undefined") {
      // Prioritize URL param, then localStorage
      const urlBranch = new URLSearchParams(window.location.search).get("branch");
      return urlBranch || localStorage.getItem('selectedBranchId') || "";
    }
    return "";
  });
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const urlDrawer = new URLSearchParams(window.location.search).get("drawer");
      return urlDrawer === "true";
    }
    return false;
  });
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const initialized = useRef(false);

  const updateUrlParams = (params) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (params.branch !== undefined) {
      if (params.branch) {
        newParams.set("branch", params.branch);
      } else {
        newParams.delete("branch");
      }
    }

    if (params.drawer !== undefined) {
      if (params.drawer === "true") {
        newParams.set("drawer", "true");
      } else {
        newParams.delete("drawer");
      }
    }

    const newUrl = `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  };

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

      const urlBranch = searchParams.get("branch");
      const urlDrawer = searchParams.get("drawer");

      if (urlBranch) {
        const branchExists = data.find(b => b._id === urlBranch);
        if (branchExists) {
          setSelectedBranchId(urlBranch);
        } else if (data.length > 0) {
          if (role === "subadmin" && branches.length > 0) {
            setSelectedBranchId(branches[0]);
          } else {
            const mainBranch = data.find(b => b.isMainBranch);
            const defaultBranch = mainBranch || data[0];
            if (defaultBranch) {
              setSelectedBranchId(defaultBranch._id);
            }
          }
        }
      } else if (data.length > 0 && !selectedBranchId) {
        if (role === "subadmin" && branches.length > 0) {
          setSelectedBranchId(branches[0]);
        } else {
          const mainBranch = data.find(b => b.isMainBranch);
          const defaultBranch = mainBranch || data[0];
          if (defaultBranch) {
            setSelectedBranchId(defaultBranch._id);
          }
        }
      }

      if (urlDrawer === "true") {
        setIsOpen(true);
      }

      initialized.current = true;
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

  const fetchRequests = async (branchId) => {
    if (role !== "Admin") return;
    try {
      const data = await listBranchTimeRequests(branchId || "");
      setRequests(data);
    } catch (e) {
      console.error("Failed to fetch requests", e);
    }
  };

  useEffect(() => {
    fetchAllBranches();
    if (role === "Admin") {
      fetchRequests();
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchBranchTimeData(selectedBranchId);
      if (role === "Admin") {
        fetchRequests(selectedBranchId);
        setSelectedRequestId(""); // Reset request selection when branch changes
        setIsRequestModalOpen(false);
      }
    } else {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (!initialized.current) return;
    updateUrlParams({ branch: selectedBranchId });
  }, [selectedBranchId]);

  useEffect(() => {
    if (!initialized.current) return;
    updateUrlParams({ drawer: isOpen ? "true" : "false" });
  }, [isOpen]);

  const handleRequestChange = (requestId) => {
    setSelectedRequestId(requestId);
    if (requestId) {
      const req = requests.find(r => r._id === requestId);
      if (req) {
        setIsRequestModalOpen(true);
      }
    } else {
      setIsRequestModalOpen(false);
    }
  };

  const closeRequestModal = () => {
    setIsRequestModalOpen(false);
    setSelectedRequestId("");
  };

  const handleApprove = async () => {
    if (!selectedRequestId) return;
    try {
      setActionLoading(true);
      await approveBranchTimeRequest(selectedRequestId);
      toast.success("Request approved and schedule updated!");
      setSelectedRequestId("");
      setIsRequestModalOpen(false);
      fetchRequests(selectedBranchId);
      fetchBranchTimeData(selectedBranchId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequestId) return;
    try {
      setActionLoading(true);
      await rejectBranchTimeRequest(selectedRequestId);
      toast.success("Request rejected");
      setSelectedRequestId("");
      setIsRequestModalOpen(false);
      fetchRequests(selectedBranchId);
      fetchBranchTimeData(selectedBranchId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      const payload = {
        branchId: selectedBranchId,
        availability: formData.availability
      };

      if (branchTimeData && !selectedRequestId) {
        // Update
        const res = await updateBranchTime(selectedBranchId, payload);
        if (role === "subadmin") {
          toast.success("Update request sent to admin for approval!");
        } else {
          toast.success("Branch time updated successfully!");
        }
      } else {
        // Create
        await createBranchTime(payload);
        if (role === "subadmin") {
          toast.success("Initialization request sent to admin for approval!");
        } else {
          toast.success("Branch time created successfully!");
        }
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
    <RoleGuard allow={["Admin", "subadmin"]} permission="show branch time page">
      <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-10 xl:px-18">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Branch Time Management</h1>
            {role === "Admin" && requests.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <p className="text-sm text-yellow-700 font-semibold">
                  {requests.length} Doctor {requests.length === 1 ? 'request' : 'requests'} pending approval
                </p>
              </div>
            )}
            {role === "Admin" && requests.length === 0 && (
               <p className="text-sm text-gray-400 mt-1 font-medium">All schedules are up to date</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {role === "Admin" && (
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3 w-[280px]">
                  <div className="flex-1">
                    <Dropdown
                      options={[
                        { label: "Time change requests", value: "" },
                        ...requests.map(r => ({
                          label: `${r.requestedBy?.username || 'Doctor'} - ${new Date(r.createdAt).toLocaleDateString()}`,
                          value: r._id
                        }))
                      ]}
                      value={selectedRequestId}
                      onChange={handleRequestChange}
                      placeholder="Time Change Requests"
                      className="border-none bg-transparent shadow-none"
                    />
                  </div>
                </div>

                <div className="w-[1px] h-8 bg-gray-200"></div>

                <div className="flex items-center gap-3 w-[220px]">
                  <div className="flex-1">
                    <Dropdown
                      options={allBranches.map(b => ({ label: b.name, value: b._id }))}
                      value={selectedBranchId}
                      onChange={(val) => setSelectedBranchId(val)}
                      placeholder="Select Branch"
                      className="border-none bg-transparent shadow-none"
                    />
                  </div>
                </div>
              </div>
            )}
            {selectedBranchId && !selectedRequestId && (role === "Admin" || permissions?.includes("manage branch time")) && (
              <Button onClick={() => setIsOpen(true)}>
                {branchTimeData ? "Update Time" : "Initialize Time"}
              </Button>
            )}
          </div>
        </div>

        {isRequestModalOpen && selectedRequestId && (() => {
          const req = requests.find(r => r._id === selectedRequestId);
          if (!req) return null;
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-amber-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Time Change Request</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                      Requested by: <span className="font-semibold text-amber-700">{req.requestedBy?.username || 'N/A'}</span> ({req.requestedBy?.email || 'N/A'})
                    </p>
                  </div>
                  <button
                    onClick={closeRequestModal}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Suggested Schedule</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {req.availability?.map((item, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 bg-gray-50/50">
                        <span className="text-sm font-bold text-[#134D41] uppercase tracking-wide">
                          {daysMap[item.day] || `Day ${item.day}`}
                        </span>
                        <div>
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Time Window</div>
                          <div className="text-xs font-semibold text-gray-800 bg-white px-2 py-1 rounded-lg border border-gray-100 inline-block">
                            {item.startTime} — {item.endTime}
                          </div>
                        </div>
                        {item.breakStartTime && item.breakEndTime ? (
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Break Time</div>
                            <div className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 inline-block">
                              {item.breakStartTime} — {item.breakEndTime}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Break Time</div>
                            <div className="text-xs font-medium text-gray-400">None</div>
                          </div>
                        )}
                        <div className="flex gap-4 border-t border-gray-100 pt-2 text-[11px]">
                          <div>
                            <span className="text-gray-400">Duration: </span>
                            <span className="font-bold text-gray-700">{item.slotDuration}m</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Buffer: </span>
                            <span className="font-bold text-gray-700">{item.bufferTime}m</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleReject}
                    loading={actionLoading}
                    className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApprove}
                    loading={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

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
                    {selectedRequestId ? "Requested Schedule" : "Active Schedule"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">
                    {selectedRequestId
                      ? `Requested by: ${requests.find(r => r._id === selectedRequestId)?.requestedBy?.username || 'N/A'}`
                      : `Updated: ${new Date(branchTimeData.updatedAt).toLocaleDateString()}`
                    }
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
            {branchTimeData ? (
              <Button onClick={() => setIsOpen(true)}>Update Schedule</Button>
            ) : (
              <Button onClick={() => setIsOpen(true)}>Initialize Schedule</Button>
            )}
          </div>
        )}

        <Drawer isOpen={isOpen} onClose={handleCancel}>
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">
              {branchTimeData ? "Update Schedule" : "Initialize Time"}
            </h2>
            <p className="text-sm text-gray-500 font-medium">Set the working windows and slot details for this branch.</p>
          </div>

          <BranchTimeForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={formLoading}
            initialValues={branchTimeData}
            submitLabel={branchTimeData ? "Save Changes" : "Create Schedule"}
            branchId={selectedBranchId}
          />
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default BranchTimePage;
