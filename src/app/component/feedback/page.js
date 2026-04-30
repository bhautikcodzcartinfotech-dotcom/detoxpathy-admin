"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import toast from "react-hot-toast";
import { getAllFeedbacks, bulkApproveFeedbacks } from "@/Api/AllApi";
import FeedbackTable from "./feedbackTable";

const FeedbackPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showApproved, setShowApproved] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAllFeedbacks();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectChange = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredItems.map((item) => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await bulkApproveFeedbacks(selectedIds, true);
      toast.success(`${selectedIds.length} feedbacks approved!`);
      setSelectedIds([]);
      await fetchData();
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e?.message || "Failed to approve feedbacks";
      toast.error(errorMsg);
      console.error("Approval error:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => item.isApproved === showApproved);

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-4 lg:px-18 py-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">User Feedbacks</h1>
                <p className="text-gray-500 mt-1">Manage and approve user testimonials.</p>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => { setShowApproved(false); setSelectedIds([]); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!showApproved ? "bg-white shadow-sm text-[#134D41]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Pending
                    </button>
                    <button 
                        onClick={() => { setShowApproved(true); setSelectedIds([]); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${showApproved ? "bg-white shadow-sm text-[#134D41]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Approved
                    </button>
                </div>

                {selectedIds.length > 0 && !showApproved && (
                    <button
                        onClick={handleBulkApprove}
                        className="bg-[#134D41] text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                        Approve Selected ({selectedIds.length})
                    </button>
                )}
            </div>
        </div>

        <FeedbackTable
          items={filteredItems}
          loading={loading}
          selectedIds={selectedIds}
          onSelectChange={handleSelectChange}
          onSelectAll={handleSelectAll}
        />
      </div>
    </RoleGuard>
  );
};

export default FeedbackPage;
