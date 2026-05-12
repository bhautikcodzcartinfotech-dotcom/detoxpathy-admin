"use client";
import { useState } from "react";
import { ActionButton } from "@/utils/actionbutton";
import NotFoundCard from "@/components/NotFoundCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const PlanTable = ({ plans, onEdit, onDelete, currency = "₹" }) => {
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });

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
  if (!plans || plans.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Plans"
          subtitle="Create a plan to get started."
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Bulk Discount (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((p) => (
              <tr
                key={p._id}
                className="hover:bg-yellow-50 transition-all duration-200 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">
                  {p.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {currency}{p.price || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {p.bulkDiscount || 0}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {p.days}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  <p className="text-sm">{p.description}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <ActionButton type="edit" onClick={() => onEdit(p)} />
                    <ActionButton
                      type="delete"
                      onClick={() => handleDeleteClick(p._id, p.name || "Plan")}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Plan"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default PlanTable;
