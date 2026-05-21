"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { API_BASE } from "@/Api/AllApi";

const ProductTable = ({ items, loading, onEdit, onDelete, currency = "₹" }) => {
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

  const formatPrice = (price) => {
    return `${currency}${Number(price).toLocaleString()}`;
  };

  const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      <div className="w-full overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Products"
          subtitle="Create a product to get started."
        />
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-linear-to-r from-yellow-400 to-amber-300">
            <tr>
              <th className="px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Product
              </th>
              <th className="hidden md:table-cell px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Base Price
              </th>
              <th className="px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Discounted Price
              </th>
              <th className="hidden sm:table-cell px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Bulk Discount (%)
              </th>
              <th className="px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Images
              </th>
              <th className="hidden lg:table-cell px-3 py-2.5 lg:px-4 lg:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th className="px-3 py-2.5 lg:px-4 lg:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((product) => (
              <tr
                key={product._id}
                className="hover:bg-yellow-50 transition-all duration-200 cursor-pointer"
              >
                <td className="px-3 py-3 lg:px-4 whitespace-normal text-xs lg:text-sm">
                  <div className="font-semibold text-gray-800">
                    {product.name}
                  </div>
                </td>
                <td className="hidden md:table-cell px-3 py-3 lg:px-4 whitespace-normal text-xs lg:text-sm">
                  <div className="text-gray-600">
                    {truncateText(product.description)}
                  </div>
                </td>
                <td className="px-3 py-3 lg:px-4 whitespace-nowrap text-xs lg:text-sm">
                  <div className="font-medium text-gray-800">
                    {formatPrice(product.basePrice)}
                  </div>
                </td>
                <td className="px-3 py-3 lg:px-4 whitespace-nowrap text-xs lg:text-sm">
                  <div className="font-medium text-green-600">
                    {formatPrice(product.discountedPrice)}
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 py-3 lg:px-4 whitespace-nowrap text-xs lg:text-sm">
                  <div className="font-medium text-blue-600">
                    {product.bulkDiscount}%
                  </div>
                </td>
                <td className="px-3 py-3 lg:px-4 whitespace-nowrap text-xs lg:text-sm">
                  <div className="flex items-center">
                    {product.images && product.images.length > 0 ? (
                      <div className="flex items-center">
                        <img
                          src={`${API_BASE}${product.images[0]}`}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg mr-2"
                          onError={(e) => {
                            e.target.style.display = 'none'; // hide broken image
                          }}
                        />
                        {product.images.length > 1 && (
                          <span className="text-xs text-gray-500">
                            +{product.images.length - 1} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No image</span>
                    )}
                  </div>
                </td>
                <td className="hidden lg:table-cell px-3 py-3 lg:px-4 whitespace-nowrap text-xs lg:text-sm">
                  <div className="text-gray-500">
                    {formatDate(product.createdAt)}
                  </div>
                </td>
                <td className="px-3 py-3 lg:px-4 text-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <ActionButton type="edit" onClick={() => onEdit(product)} />
                  <ActionButton
                    type="delete"
                    onClick={() =>
                      handleDeleteClick(product._id, product.name)
                    }
                  />
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
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default ProductTable;