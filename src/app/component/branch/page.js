"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getAllBranches,
  createBranchApi,
  updateBranchById,
  deleteBranchById,
} from "@/Api/AllApi";
import BranchForm from "./branchForm";
import BranchTable from "./branchTable";
import SearchComponent from "@/components/SearchComponent";

const BranchPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await getAllBranches();
      const branchData = Array.isArray(data) ? data : [];
      setItems(branchData);
      setFilteredItems(branchData);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load branches");
      toast.error(e?.response?.data?.message || "Failed to load branches");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSearch = (term) => {
    setSearchLoading(true);

    if (!term) {
      setFilteredItems(items);
      setSearchLoading(false);
      return;
    }

    const filtered = items.filter((branch) => {
      const searchTerm = term.toLowerCase();
      return (
        branch.name?.toLowerCase().includes(searchTerm) ||
        branch.city?.toLowerCase().includes(searchTerm) ||
        branch.state?.toLowerCase().includes(searchTerm) ||
        branch.country?.toLowerCase().includes(searchTerm) ||
        branch.email?.toLowerCase().includes(searchTerm) ||
        branch.pincode?.toString().includes(searchTerm)
      );
    });

    setFilteredItems(filtered);
    setSearchLoading(false);
  };

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateBranchById(editing._id, formData);
        toast.success("Branch updated successfully!");
      } else {
        await createBranchApi(formData);
        toast.success("Branch created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save branch");
      toast.error(err?.response?.data?.message || "Failed to save branch");
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
      await deleteBranchById(id);
      await fetchList();
      toast.success("Branch deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete branch");
      toast.error(err?.response?.data?.message || "Failed to delete branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <Header size="3xl">Branches</Header>
          <div className="sm:shrink-0">
            <Button onClick={() => setIsOpen(true)}>Create</Button>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <SearchComponent
          onSearch={handleSearch}
          searchLoading={searchLoading}
          searchPlaceholder="Search by name, city, state, email, or pincode..."
        />

        {!listLoading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredItems.length} of {items.length} branches
          </div>
        )}

        <BranchTable
          items={filteredItems}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Branch" : "Create Branch"}
            </h2>
          </div>
          <BranchForm
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

export default BranchPage;
