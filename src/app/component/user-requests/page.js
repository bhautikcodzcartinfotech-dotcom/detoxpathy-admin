"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import toast from "react-hot-toast";
import { getAllMobileNumberChangeRequests, handleMobileNumberChangeRequest } from "@/Api/AllApi";
import UserRequestTable from "./userRequestTable";

const UserRequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAllMobileNumberChangeRequests();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load user requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (requestId, action, adminComment = "") => {
    try {
      setLoading(true);
      await handleMobileNumberChangeRequest(requestId, {
        status: action === "approve" ? "Approved" : "Rejected",
        adminComment
      });
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"} successfully!`);
      await fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-4 lg:px-18 py-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Header className="size-4xl">User Requests</Header>
            <p className="text-gray-500 mt-1">Manage user mobile number change requests.</p>
          </div>
        </div>

        <UserRequestTable
          items={items}
          loading={loading}
          onAction={handleAction}
        />
      </div>
    </RoleGuard>
  );
};

export default UserRequestsPage;
