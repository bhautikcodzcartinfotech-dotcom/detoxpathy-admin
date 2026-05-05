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
import Dropdown from "@/utils/dropdown";
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
      <div className="w-full h-full px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 mt-6">
          <Header size="3xl">Staff Management</Header>
          <div className="flex items-center gap-3">
            {/* Branch selector using the modern Dropdown component */}
            {branches.length > 1 && (
              <div className="w-48">
                <Dropdown
                  options={branches.map(b => ({ label: b.name, value: b._id }))}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  placeholder="Select Branch"
                />
              </div>
            )}
            {/* If only one branch, just show the name as a label */}
            {branches.length === 1 && (
              <div className="px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-700 shadow-sm flex items-center">
                Branch: {branches[0].name}
              </div>
            )}
            {(role === "Admin" || (role === "subadmin" && permissions?.includes("add staff"))) && (
              <Button onClick={() => { setEditing(null); setIsOpen(true); }}>Create Staff</Button>
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
