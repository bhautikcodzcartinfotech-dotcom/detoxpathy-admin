"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import { useAuth } from "@/contexts/AuthContext";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getAllCategoriesApi,
  createCategoryApi,
  updateCategoryById,
  deleteCategoryById,
  reorderCategoriesApi,
} from "@/Api/AllApi";
import CategoryForm from "./categoryForm";
import CategoryTable from "./categoryTable";

const CategoryPage = () => {
  const { role, permissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await getAllCategoriesApi();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load categories");
      toast.error(e?.response?.data?.message || "Failed to load categories");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleReorder = async (reorderedItems, type) => {
    try {
      const newIndexData = reorderedItems.map((item, index) => ({
        _id: item._id,
        index: index
      }));

      await reorderCategoriesApi(newIndexData);
      
      setItems(prev => {
        const otherTypeItems = prev.filter(item => item.type !== type);
        const updatedReorderedItems = reorderedItems.map((item, index) => ({
          ...item,
          index: index
        }));
        return [...otherTypeItems, ...updatedReorderedItems].sort((a, b) => a.index - b.index);
      });
      
      toast.success("Order updated successfully!");
    } catch (err) {
      console.error("Failed to reorder:", err);
      toast.error("Failed to update order");
      fetchList(); // Reset to server state on error
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateCategoryById(editing._id, formData);
        toast.success("Category updated successfully!");
      } else {
        await createCategoryApi(formData);
        toast.success("Category created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save category");
      toast.error(err?.response?.data?.message || "Failed to save category");
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
      await deleteCategoryById(id);
      await fetchList();
      toast.success("Category deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete category");
      toast.error(err?.response?.data?.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-8 lg:px-12 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <Header size="4xl">Categories</Header>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Manage your session and testimonial tags</p>
          </div>
          {(role === "Admin" || (role === "subadmin" && permissions?.includes("manage category"))) && (
            <Button onClick={() => setIsOpen(true)}>
              Create New Category
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <CategoryTable
          items={items}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Category" : "Create Category"}
            </h2>
          </div>
          <CategoryForm
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

export default CategoryPage;
