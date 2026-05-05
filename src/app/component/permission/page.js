"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import { ActionButton } from "@/utils/actionbutton";
import { listSubAdmins, updateSubAdminPermissions } from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";

const PERMISSION_GROUPS = [
  {
    category: "Staff Management",
    permissions: [
      { label: "Add Staff", value: "add staff" },
      { label: "Edit Staff", value: "edit staff" },
      { label: "Delete Staff", value: "delete staff" },
    ]
  },
  {
    category: "User Management",
    permissions: [
      { label: "Create User", value: "create user" },
    ]
  },
  {
    category: "Page Access",
    permissions: [
      { label: "Show Logs Page", value: "show Logs page" },
      { label: "Show Contact Page", value: "show contact page" },
      { label: "Show Contact Categories", value: "show contact categories" },
      { label: "Show Feedback Page", value: "show feedback page" },
      { label: "Show App References", value: "show app reference page" },
    ]
  },
];

const PermissionPage = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await listSubAdmins();
      setSubAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load sub admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleEdit = (admin) => {
    setEditing(admin);
    setPermissions(admin.permissions || []);
    setIsOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaveLoading(true);
      await updateSubAdminPermissions(editing._id, permissions);
      await fetchList();
      toast.success("Permissions updated successfully");
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <Header size="3xl">Manage Permissions</Header>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Role</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : subAdmins.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">No doctors or sub-doctors found.</td>
                </tr>
              ) : (
                subAdmins.map((admin) => (
                  <tr key={admin._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4">{admin.username}</td>
                    <td className="p-4">{admin.email}</td>
                    <td className="p-4 capitalize">{admin.adminType}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <ActionButton
                          type="edit"
                          onClick={() => handleEdit(admin)}
                          title="Edit Permissions"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              Update Permissions
            </h2>
            <p className="text-gray-500 mt-2">For {editing?.username}</p>
          </div>
          
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.category} className="border rounded-xl p-4 bg-gray-50/30">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    {group.category}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {group.permissions.map((perm) => (
                      <label key={perm.value} className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:border-yellow-400 transition-colors shadow-sm min-h-[50px]">
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPermissions([...permissions, perm.value]);
                            } else {
                              setPermissions(permissions.filter(p => p !== perm.value));
                            }
                          }}
                          className="w-5 h-5 flex-shrink-0 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded transition-all cursor-pointer"
                        />
                        <span className="text-gray-700 font-medium text-sm leading-tight">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button
                variant="secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <TimeButton loading={saveLoading}>Save Permissions</TimeButton>
            </div>
          </form>
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default PermissionPage;
