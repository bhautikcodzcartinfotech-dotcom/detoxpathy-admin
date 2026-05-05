"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import {
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getAllBranches
} from "@/Api/AllApi";
import StaffForm from "./component/StaffForm";
import StaffTable from "./component/StaffTable";
import StaffLeaveModal from "./component/StaffLeaveModal";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const StaffPage = () => {
  const { role, branches: userBranchIds, permissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedStaffForLeave, setSelectedStaffForLeave] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const fetchBranches = async () => {
    try {
      const data = await getAllBranches();
      let availableBranches = data || [];
      
      // Filter branches if user is subadmin
      if (role === "subadmin") {
        availableBranches = availableBranches.filter(b => userBranchIds.includes(b._id));
      }
      
      setBranches(availableBranches);
      
      if (availableBranches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(availableBranches[0]._id);
      }
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const fetchList = async (branchId) => {
    if (!branchId) return;
    try {
      setListLoading(true);
      const data = await getStaff(branchId);
      setStaffList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load staff");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [role, userBranchIds]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchList(selectedBranchId);
    }
  }, [selectedBranchId]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateStaff({
          staffId: editing._id,
          ...formData,
          branchId: selectedBranchId
        });
        toast.success("Staff updated successfully!");
      } else {
        await addStaff({
          ...formData,
          branchId: selectedBranchId
        });
        toast.success("Staff created successfully!");
      }
      await fetchList(selectedBranchId);
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save staff";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError("");
      await deleteStaff(id);
      await fetchList(selectedBranchId);
      toast.success("Staff deleted successfully!");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete staff";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManageLeave = (staff) => {
    setSelectedStaffForLeave(staff);
    setLeaveModalOpen(true);
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 mt-4">
          <Header size="3xl">Staff Management</Header>
          <div className="flex items-center gap-2">
            {/* Only show branch selector if there's more than one branch available */}
            {branches.length > 1 && (
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 outline-none cursor-pointer h-10"
              >
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            )}
            {/* If only one branch, just show the name as a label */}
            {branches.length === 1 && (
              <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-gray-600 h-10 flex items-center">
                Branch: {branches[0].name}
              </div>
            )}
            {(role === "Admin" || (role === "subadmin" && permissions?.includes("add staff"))) && (
              <Button onClick={() => { setEditing(null); setIsOpen(true); }}>Create</Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <StaffTable
          items={staffList}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onManageLeave={handleManageLeave}
          role={role}
          permissions={permissions}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Staff" : "Create Staff"}
            </h2>
          </div>
          <StaffForm
            onSubmit={handleCreateOrUpdate}
            onCancel={() => {
              setIsOpen(false);
              setEditing(null);
            }}
            loading={loading}
            initialValues={editing}
            submitLabel={editing ? "Update" : "Create"}
          />
        </Drawer>

        <StaffLeaveModal
          isOpen={leaveModalOpen}
          onClose={() => {
            setLeaveModalOpen(false);
            setSelectedStaffForLeave(null);
          }}
          staff={selectedStaffForLeave}
          onUpdate={() => fetchList(selectedBranchId)}
        />
      </div>
    </RoleGuard>
  );
};

export default StaffPage;
