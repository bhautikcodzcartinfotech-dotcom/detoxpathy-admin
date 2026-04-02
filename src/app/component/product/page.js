"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "@/Api/AllApi";
import ProductForm from "./productForm";
import ProductTable from "./productTable";

const ProductPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [pagination, setPagination] = useState({
    start: 1,
    limit: 10,
    total: 0,
  });

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await getAllProducts({
        start: pagination.start,
        limit: pagination.limit,
      });
      setItems(Array.isArray(data) ? data : []);
      // TODO: Set total count when API provides it
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load products");
      toast.error(e?.response?.data?.message || "Failed to load products");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination.start, pagination.limit]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateProduct(editing._id, formData);
        toast.success("Product updated successfully!");
      } else {
        await addProduct(formData);
        toast.success("Product created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save product");
      toast.error(err?.response?.data?.message || "Failed to save product");
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
      await deleteProduct(id);
      await fetchList();
      toast.success("Product deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete product");
      toast.error(err?.response?.data?.message || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-18">
        <div className="flex items-center justify-between mb-4">
          <Header size="3xl">Products</Header>
          <Button onClick={() => setIsOpen(true)}>Create Product</Button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <ProductTable
          items={items}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Product" : "Create Product"}
            </h2>
          </div>
          <ProductForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsOpen(false);
              setEditing(null);
            }}
            loading={loading}
            initialValues={editing}
            submitLabel={editing ? "Update" : "Create"}
          />
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default ProductPage;