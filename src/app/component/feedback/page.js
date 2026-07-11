"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import toast from "react-hot-toast";
import { getAllFeedbacks, bulkApproveFeedbacks } from "@/Api/AllApi";
import FeedbackTable from "./feedbackTable";
import Dropdown from "@/utils/dropdown";

const FeedbackPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showApproved, setShowApproved] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

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

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [showApproved, dateFilter, selectedDate]);

  const handleSelectChange = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const dateFilterOptions = [
    { label: "All Dates", value: "all" },
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Selected Day", value: "selected" },
  ];

  const filteredItems = items.filter(item => {
    // 1. Filter by approval status
    if (item.isProductApproved !== showApproved) return false;

    // 2. Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);

      if (dateFilter === "today") {
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        return itemDate >= startOfToday && itemDate < startOfTomorrow;
      }
      
      if (dateFilter === "yesterday") {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        return itemDate >= startOfYesterday && itemDate < startOfToday;
      }
      
      if (dateFilter === "week") {
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
        const startOfNextWeek = new Date(startOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
        return itemDate >= startOfWeek && itemDate < startOfNextWeek;
      }
      
      if (dateFilter === "month") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return itemDate >= startOfMonth && itemDate < startOfNextMonth;
      }
      
      if (dateFilter === "selected" && selectedDate) {
        const [year, month, day] = selectedDate.split("-").map(Number);
        const startOfSelected = new Date(year, month - 1, day);
        const endOfSelected = new Date(year, month - 1, day + 1);
        return itemDate >= startOfSelected && itemDate < endOfSelected;
      }
    }

    return true;
  });
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(paginatedItems.map((item) => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await bulkApproveFeedbacks(selectedIds, "product", true);
      toast.success(`${selectedIds.length} product feedbacks approved!`);
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

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-4 lg:px-18 py-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <Header className="size-4xl">User Feedbacks</Header>
                <p className="text-gray-500 mt-1">Manage and approve user testimonials.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {/* Date Filter Dropdown */}
                <div className="w-full sm:w-48">
                    <Dropdown
                        options={dateFilterOptions}
                        value={dateFilter}
                        onChange={setDateFilter}
                        placeholder="All Dates"
                    />
                </div>

                {/* Selected Date Picker Input */}
                {dateFilter === "selected" && (
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 bg-white transition-all focus:border-[#134D41] focus:ring-4 focus:ring-[#134D41]/5 outline-none cursor-pointer h-10"
                    />
                )}

                <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                    <button 
                        onClick={() => { setShowApproved(false); setSelectedIds([]); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!showApproved ? "bg-white shadow-sm text-[#134D41]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Pending Product
                    </button>
                    <button 
                        onClick={() => { setShowApproved(true); setSelectedIds([]); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${showApproved ? "bg-white shadow-sm text-[#134D41]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Approved Product
                    </button>
                </div>

                {selectedIds.length > 0 && !showApproved && (
                    <button
                        onClick={handleBulkApprove}
                        className="bg-[#134D41] text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 shrink-0"
                    >
                        Approve Selected ({selectedIds.length})
                    </button>
                )}
            </div>
        </div>

        <FeedbackTable
          items={paginatedItems}
          loading={loading}
          selectedIds={selectedIds}
          onSelectChange={handleSelectChange}
          onSelectAll={handleSelectAll}
        />

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <Button
              variant="secondary"
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-sm font-bold text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default FeedbackPage;
