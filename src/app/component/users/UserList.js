"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Button } from "@/utils/header";

import { useRouter } from "next/navigation";
import { getUserOverview } from "@/Api/AllApi";

const ThemedCheckbox = ({ checked, onChange, ariaLabel, disabled = false }) => {
  return (
    <label
      className={`inline-flex items-center select-none ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className={`w-5 h-5 rounded-md border border-teal-400 bg-white peer-checked:bg-gradient-to-r peer-checked:from-[#2A9D8F] peer-checked:to-[#64C1B1] peer-checked:border-teal-500 shadow-sm flex items-center justify-center transition-all ${disabled ? "bg-gray-100 border-gray-300" : ""
          }`}
      >
        <svg
          className={`w-3 h-3 text-white opacity-${checked ? 100 : 0
            } transition-opacity`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.435a1 1 0 111.414-1.414l3.01 3.01 6.657-6.657a1 1 0 011.333-.081z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </label>
  );
};

const UserList = ({ users, loading, onEdit, onDelete, onBulkDelete, onSuggest }) => {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    userId: null,
    userName: null,
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [planHistory, setPlanHistory] = useState([]);

  const handleDeleteClick = (userId, userName) => {
    setDeleteDialog({
      isOpen: true,
      userId,
      userName,
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.userId) {
      onDelete(deleteDialog.userId);
    }
    setDeleteDialog({
      isOpen: false,
      userId: null,
      userName: null,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      userId: null,
      userName: null,
    });
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const selectable = users.filter((u) => !u.isDeleted);
    setSelectedIds((prev) => {
      if (prev.size === selectable.length) return new Set();
      return new Set(selectable.map((u) => u._id));
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return setBulkDialogOpen(false);
    if (onBulkDelete) {
      await onBulkDelete(ids);
    } else {
      // Fallback: call onDelete for each
      for (const id of ids) {
        // Sequential to keep API happy
        // eslint-disable-next-line no-await-in-loop
        await onDelete(id);
      }
    }
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
  };

  const openHistory = async (user) => {
    try {
      setHistoryUser(user);
      setHistoryOpen(true);
      setHistoryLoading(true);
      const data = await getUserOverview(user._id);
      const list = Array.isArray(data?.planHistory) ? data.planHistory : [];
      setPlanHistory(list);
    } catch (e) {
      setPlanHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Users Found"
          subtitle="No users match your search criteria. Try adjusting your search or create a new user."
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto shadow-xl shadow-teal-900/5 rounded-2xl border border-gray-100 bg-white h-full">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100 bg-teal-50/30">
            <p className="text-sm text-teal-800 font-semibold">
              {selectedIds.size} selected
            </p>
            <Button
              onClick={() => setBulkDialogOpen(true)}
              variant="primary"
              className="px-4 py-2 text-sm"
            >
              Delete Selected
            </Button>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr>
              <th className="px-4 py-3 text-left">
                <ThemedCheckbox
                  checked={
                    selectedIds.size ===
                    users.filter((u) => !u.isDeleted).length &&
                    users.filter((u) => !u.isDeleted).length > 0
                  }
                  onChange={toggleAll}
                  ariaLabel="Select all"
                />
              </th>

              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Mobile
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                GSTIN
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Plan Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => {
              const isDeleted = Boolean(u.isDeleted);
              // Determine plan status - only Active or Hold
              const getPlanStatus = () => {
                if (isDeleted) {
                  return {
                    status: "Inactive",
                    color: "bg-red-100 text-red-700",
                  };
                }
                if (!u.activated || !u.plan) {
                  return {
                    status: "No Plan",
                    color: "bg-gray-100 text-gray-800",
                  };
                }
                if (u.planHoldDate && !u.planResumeDate) {
                  return {
                    status: "Hold",
                    color: "bg-amber-300 text-amber-800",
                  };
                }
                return {
                  status: "Active",
                  color: "bg-yellow-300 text-yellow-900",
                };
              };
              const planStatus = getPlanStatus();
              return (
                <tr
                  key={u._id}
                  className={`relative hover:bg-yellow-50 transition-all duration-200 cursor-pointer ${isDeleted ? "bg-red-50" : ""
                    }`}
                >
                  <td className="px-4 py-4">
                    <ThemedCheckbox
                      checked={selectedIds.has(u._id)}
                      onChange={() => toggleOne(u._id)}
                      ariaLabel={`Select ${u.name}`}
                      disabled={isDeleted}
                    />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">
                    {u.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {u.mobilePrefix} {u.mobileNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {u.gstin || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {u.branch?.name || u.branch || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {u.plan?.name ? `${u.plan.name} (₹${u.plan.price || 0})` : u.plan || "-"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${planStatus.color}`}
                    >
                      {planStatus.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <ActionButton
                        type="suggest"
                        onClick={() => onSuggest(u)}
                        disabled={isDeleted}
                        title="Suggest Program"
                      />
                      <ActionButton
                        type="edit"
                        onClick={() => onEdit(u)}
                        disabled={isDeleted}
                      />
                      <ActionButton
                        type="delete"
                        onClick={() => handleDeleteClick(u._id, u.name)}
                        disabled={isDeleted}
                      />
                      <ActionButton
                        type="view"
                        onClick={() => router.push(`/component/users/${u._id}/profile`)}
                        title="View Profile"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteDialog.userName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        isOpen={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Users"
        message={`Are you sure you want to delete ${selectedIds.size} selected user(s)? This will mark them as deleted.`}
        confirmText="Delete All"
        cancelText="Cancel"
        type="danger"
      />

      {/* Plan History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] sm:w-[600px] max-h-[80vh] rounded-2xl shadow-2xl border border-yellow-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Plan History
                </h3>
                <p className="text-sm text-gray-600">
                  {historyUser?.name}
                </p>
              </div>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setHistoryOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {historyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader />
                </div>
              ) : planHistory.length === 0 ? (
                <NotFoundCard
                  title="No Plan History"
                  subtitle="This user has no recorded plan changes."
                />
              ) : (
                <div className="space-y-3">
                  {planHistory.map((h) => (
                    <div
                      key={h._id}
                      className="flex items-center justify-between rounded-xl bg-amber-100 border border-amber-200 shadow p-3"
                    >
                      <div>
                        <div className="font-semibold text-gray-800">
                          {h.plan?.name || "Plan"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {h.plan?.days ? `${h.plan.days} days` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {h.createdAt
                          ? new Date(h.createdAt).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setHistoryOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserList;
