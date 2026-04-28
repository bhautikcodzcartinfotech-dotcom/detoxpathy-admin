"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { API_BASE } from "@/Api/AllApi";

const ContactTable = ({ items, loading, onEdit, onDelete }) => {
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
    handleDeleteCancel();
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

  return (
    <div className="mb-6">
      {items.length === 0 ? (
        <NotFoundCard
          title="No Contacts"
          subtitle="Add one to get started."
        />
      ) : (
        <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-yellow-50 bg-white">
                  <td className="px-6 py-4">
                    <img
                      src={item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image.startsWith('/') ? item.image : '/' + item.image}`) : "/image/detoxpathy.png"}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      onError={(e) => (e.target.src = "/image/detoxpathy.png")}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.mobileNo}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.categoryId?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <ActionButton
                      type="delete"
                      onClick={() =>
                        handleDeleteClick(item._id, item.name)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ContactTable;
