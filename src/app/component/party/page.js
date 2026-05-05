"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { getAllParties, createParty, updateParty, deleteParty } from "@/Api/AllApi";
import PartyTable from "./partyTable";
import PartyForm from "./partyForm";
import Drawer from "@/utils/formanimation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const PartyPage = () => {
  const { role, permissions } = useAuth();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [search, setSearch] = useState("");

  const fetchParties = async () => {
    try {
      setLoading(true);
      const data = await getAllParties();
      setParties(data);
    } catch (error) {
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setLoading(true);
      if (editingParty) {
        await updateParty(editingParty._id, formData);
        toast.success("Record updated successfully");
      } else {
        await createParty(formData);
        toast.success("Record created successfully");
      }
      setIsDrawerOpen(false);
      setEditingParty(null);
      fetchParties();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteParty(id);
        toast.success("Record deleted");
        fetchParties();
      } catch (error) {
        toast.error("Delete failed");
      }
    }
  };

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile.includes(search) ||
    (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Supplier Master</h1>
          <p className="text-gray-500 text-sm">Manage Suppliers</p>
        </div>
        {(role === "Admin" || (role === "subadmin" && permissions?.includes("manage supplier"))) && (
          <button
            onClick={() => {
              setEditingParty(null);
              setIsDrawerOpen(true);
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-sm"
          >
            <FiPlus size={20} /> Add Supplier
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          />
        </div>
      </div>

      <PartyTable
        parties={filteredParties}
        onEdit={(party) => {
          setEditingParty(party);
          setIsDrawerOpen(true);
        }}
        onDelete={handleDelete}
        role={role}
        permissions={permissions}
      />

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">{editingParty ? "Edit Supplier" : "Add Supplier"}</h2>
        </div>
        <PartyForm
          onSubmit={handleCreateOrUpdate}
          onCancel={() => setIsDrawerOpen(false)}
          loading={loading}
          initialValues={editingParty}
          submitLabel={editingParty ? "Update" : "Create"}
        />
      </Drawer>
    </div>
  );
};

export default PartyPage;
