"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const BranchTable = ({ items, loading, onEdit, onDelete }) => {
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const normalizeAddress = (addr) => {
    if (!addr) return "-";
    const s = String(addr);
    // Convert CRLF and escaped \n into real newlines
    return s.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
  };

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
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Branches"
          subtitle="Create a branch to get started."
        />
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Pincode
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((b) => (
              <tr
                key={b._id}
                className="hover:bg-yellow-50 transition-all duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{b.name}</span>
                    <div className="flex gap-1 mt-1">
                      {b.isFranchise && (
                        <span className="px-2 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded-full font-bold uppercase">
                          Franchise
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-700 align-top">
                  {expanded[b._id] ? (
                    <div
                      className="whitespace-pre-wrap break-words max-w-none"
                      title={normalizeAddress(b.address)}
                    >
                      {normalizeAddress(b.address)}
                    </div>
                  ) : (
                    <div className="relative max-w-[320px] overflow-hidden whitespace-nowrap text-ellipsis align-baseline">
                      <span title={normalizeAddress(b.address)}>
                        {normalizeAddress(b.address)}
                      </span>
                      {b.address && b.address.length > 24 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(b._id);
                          }}
                          className="absolute right-0 top-0 h-full px-1 text-xs text-yellow-700 hover:text-yellow-800 bg-gradient-to-l from-white via-white/80 to-transparent"
                          aria-label="Show full address"
                          title="Show full address"
                        >
                          ...
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {b.city}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {b.state}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {b.pincode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {b.email || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {b.updatedAt
                    ? new Date(b.updatedAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <ActionButton type="edit" onClick={() => onEdit(b)} />
                    <ActionButton
                      type="delete"
                      onClick={() => handleDeleteClick(b._id, b.name || "Branch")}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((b) => (
          <div
            key={b._id}
            className="bg-white rounded-2xl shadow-md border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  {b.name}
                  <div className="flex gap-1">
                    {b.isFranchise && (
                      <span className="px-1.5 py-0.5 text-[8px] bg-orange-100 text-orange-700 rounded-full font-bold uppercase">
                        F
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                  {normalizeAddress(b.address)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ActionButton type="edit" onClick={() => onEdit(b)} />
                <ActionButton
                  type="delete"
                  onClick={() => handleDeleteClick(b._id, b.name || "Branch")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div>
                <div className="text-gray-500">City</div>
                <div className="text-gray-800 font-medium">{b.city}</div>
              </div>
              <div>
                <div className="text-gray-500">State</div>
                <div className="text-gray-800 font-medium">{b.state}</div>
              </div>
              <div>
                <div className="text-gray-500">Pincode</div>
                <div className="text-gray-800 font-medium">{b.pincode}</div>
              </div>
              <div>
                <div className="text-gray-500">Email</div>
                <div className="text-gray-800 font-medium">
                  {b.email || "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Updated</div>
                <div className="text-gray-800 font-medium">
                  {b.updatedAt
                    ? new Date(b.updatedAt).toLocaleDateString()
                    : "-"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Branch"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default BranchTable;
