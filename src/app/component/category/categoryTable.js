"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";

import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

const CategoryTable = ({ items, loading, onEdit, onDelete, onReorder }) => {
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });

  const testimonialCategories = items?.filter((c) => c.type === 1) || [];
  const sessionCategories = items?.filter((c) => c.type === 2) || [];

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

  const renderTable = (data, title) => (
    <div className="mb-6">
      <h2 className="text-lg font-bold py-2">{title}</h2>

      {data.length === 0 ? (
        <NotFoundCard
          title={`No ${title}`}
          subtitle="Create one to get started."
        />
      ) : (
        <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <Reorder.Group
              as="tbody"
              axis="y"
              values={data}
              onReorder={(newOrder) => onReorder(newOrder, data[0]?.type)}
              className="divide-y divide-gray-200"
            >
              {data.map((c) => (
                <Reorder.Item
                  as="tr"
                  key={c._id}
                  value={c}
                  className="hover:bg-yellow-50 bg-white cursor-grab active:cursor-grabbing"
                >
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {c.categoryTitle}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <ActionButton type="edit" onClick={() => onEdit(c)} />
                    <ActionButton
                      type="delete"
                      onClick={() =>
                        handleDeleteClick(c._id, c.categoryTitle)
                      }
                    />
                  </td>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      {renderTable(testimonialCategories, "Testimonial Categories")}
      {renderTable(sessionCategories, "Session Categories")}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default CategoryTable;
