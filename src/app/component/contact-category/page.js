"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getAllContactCategories,
  createContactCategory,
  updateContactCategory,
  deleteContactCategory,
} from "@/Api/AllApi";
import ContactCategoryForm from "./contactCategoryForm";
import ContactCategoryTable from "./contactCategoryTable";

const ContactCategoryPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await getAllContactCategories();
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

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateContactCategory(editing._id, formData);
        toast.success("Category updated successfully!");
      } else {
        await createContactCategory(formData);
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
      await deleteContactCategory(id);
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
      <div className="w-full h-full px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <Header size="3xl"> Contact Categories</Header>
          <Button onClick={() => setIsOpen(true)}>Create</Button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <ContactCategoryTable
          items={items}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Category" : "Create Category"}
            </h2>
          </div>
          <ContactCategoryForm
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

export default ContactCategoryPage;
