"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Calendar } from "lucide-react";
import toast from "react-hot-toast";

const StaffTable = ({ items, loading, onEdit, onDelete, onManageLeave, role, permissions }) => {
  const router = useRouter();
  const { impersonate } = useAuth();
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });
  const [loginLoading, setLoginLoading] = useState(null);

  const handleDeleteClick = (itemId, itemName) => {
    setDeleteDialog({
      isOpen: true,
      itemId,
      itemName,
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.itemId) {
      onDelete(deleteDialog.itemId);
    }
    setDeleteDialog({
      isOpen: false,
      itemId: null,
      itemName: null,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      itemId: null,
      itemName: null,
    });
  };

  const handleLoginAsStaff = async (staff) => {
    try {
      setLoginLoading(staff._id);
      const email = staff.email;
      const password = staff.originalPassword || staff.password;

      if (!email || !password) {
        throw new Error("Staff email/password not available");
      }

      const result = await impersonate(email, password);
      if (result?.success) {
        toast.success(`Logged in as ${staff.username}`);
        router.push("/dashboard");
      } else {
        throw new Error(result?.error || "Login failed");
      }
    } catch (error) {
      console.error("Staff direct login error:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to login as staff");
    } finally {
      setLoginLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-yellow-50 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.username || item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{item.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700">
                      {item.adminType || item.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      {(role === "Admin" || (role === "subadmin" && permissions?.includes("add staff"))) && (
                        <ActionButton
                          type="calendar"
                          onClick={() => onManageLeave(item)}
                          title="Manage Leaves"
                        />
                      )}
                      {(role === "Admin" || (role === "subadmin" && permissions?.includes("edit staff"))) && (
                        <ActionButton type="edit" onClick={() => onEdit(item)} />
                      )}
                      {(role === "Admin" || (role === "subadmin" && permissions?.includes("delete staff"))) && (
                        <ActionButton
                          type="delete"
                          onClick={() => handleDeleteClick(item._id, item.username || item.name || "Staff Member")}
                        />
                      )}
                      {role === "Admin" && (
                        <ActionButton
                          type="login"
                          onClick={() => handleLoginAsStaff(item)}
                          disabled={loginLoading === item._id}
                          title="Login as this staff"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium bg-gray-50/30">
                    No staff members found for this branch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Staff Member"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default StaffTable;
