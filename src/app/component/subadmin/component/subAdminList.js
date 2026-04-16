"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import { ActionButton } from "@/utils/actionbutton";
import NotFoundCard from "@/components/NotFoundCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import toast from "react-hot-toast";
import { FiLogIn } from "react-icons/fi";

const SubAdminList = ({ subAdmins, onEdit, onDelete, loading = false }) => {
  const router = useRouter();
  const { login } = useAuth();
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

  const handleLoginAsSubAdmin = async (subAdmin) => {
    try {
      setLoginLoading(subAdmin._id);

      // Use regular admin login API with subadmin credentials
      const email = subAdmin.email;
      const password = subAdmin.originalPassword || subAdmin.password;

      if (!email || !password) {
        throw new Error("Subadmin email/password not available");
      }

      const result = await login(email, password);

      if (!result?.success) {
        throw new Error(result?.error || "Login failed");
      }

      toast.success(`Logged in as ${subAdmin.username}`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Subadmin direct login error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to login as subadmin"
      );
    } finally {
      setLoginLoading(null);
    }
  };
  if (loading) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          loading
          title="Loading"
          subtitle="Fetching sub admins..."
        />
      </div>
    );
  }

  if (!subAdmins || subAdmins.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Sub Admins"
          subtitle="Create a sub admin to get started."
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Header */}
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Branches
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Commission (%)
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {subAdmins.length > 0 ? (
              subAdmins.map((sa) => (
                <tr
                  key={sa._id}
                  className="hover:bg-yellow-50 transition-all duration-200 cursor-pointer"
                >
                  {/* Image */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sa.image ? (
                      <img
                        src={`${API_BASE}/${sa.image}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">
                    {sa.username}
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {sa.email}
                  </td>

                  {/* Branches */}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {Array.isArray(sa.branch) && sa.branch.length
                      ? sa.branch.map((b) => b.name).join(", ")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {sa.commission ?? 0}%
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-center space-x-2">
                    <ActionButton type="edit" onClick={() => onEdit(sa)} />
                    <ActionButton
                      type="delete"
                      onClick={() =>
                        handleDeleteClick(sa._id, sa.name || "Sub Admin")
                      }
                    />
                    <button
                      onClick={() => handleLoginAsSubAdmin(sa)}
                      disabled={loginLoading === sa._id}
                      className="bg-gradient-to-tr from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      title="Login as this subadmin"
                    >
                      {loginLoading === sa._id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FiLogIn size={20} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-gray-500 text-sm"
                >
                  No Sub Admins
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub Admin"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default SubAdminList;
