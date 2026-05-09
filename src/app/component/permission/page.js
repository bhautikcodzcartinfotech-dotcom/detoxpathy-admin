"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import { ActionButton } from "@/utils/actionbutton";
import { getRolePermissionsApi, updateRolePermissionsApi, deleteRolePermissionApi } from "@/Api/AllApi";
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
      { label: "Show Order Page", value: "show order page" },
    ]
  },
];

const PermissionPage = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [isAddingRole, setIsAddingRole] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await getRolePermissionsApi();
      setRoles(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Please enter a role name");
      return;
    }
    try {
      setSaveLoading(true);
      await updateRolePermissionsApi(newRoleName.trim(), []);
      setNewRoleName("");
      setIsAddingRole(false);
      await fetchList();
      toast.success("New role created successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create role");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (roleObj) => {
    setEditing(roleObj);
    setPermissions(roleObj.permissions || []);
    setIsOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaveLoading(true);
      await updateRolePermissionsApi(editing.role, permissions);
      await fetchList();
      toast.success("Role permissions updated successfully");
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update role permissions");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <Header size="3xl">Manage Role Permissions</Header>
          <Button 
            onClick={() => setIsAddingRole(!isAddingRole)}
            variant={isAddingRole ? "secondary" : "primary"}
          >
            {isAddingRole ? "Cancel" : "+ Add New Role"}
          </Button>
        </div>

        {isAddingRole && (
          <div className="mb-6 p-6 bg-white rounded-2xl border-2 border-teal-100 shadow-xl shadow-teal-900/5 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">New Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Sales Executive, Manager"
                  className="w-full p-3.5 rounded-xl border border-gray-200 focus:border-[#134D41] focus:ring-4 focus:ring-[#134D41]/5 focus:outline-none text-sm transition-all"
                />
              </div>
              <Button 
                onClick={handleAddRole} 
                disabled={saveLoading}
                className="w-full sm:w-auto h-[50px] px-10"
              >
                {saveLoading ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#134D41]">
              <tr className="text-[11px] font-black text-white uppercase tracking-widest">
                <th className="px-6 py-4">Role Name</th>
                <th className="px-6 py-4">Permissions Count</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">No roles found.</td>
                </tr>
              ) : (
                roles.map((roleObj, idx) => (
                  <tr key={roleObj.role || idx} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-800 capitalize">{roleObj.role}</td>
                    <td className="p-4">
                      <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-semibold">
                        {roleObj.permissions?.length || 0} Permissions
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <ActionButton
                          type="edit"
                          onClick={() => handleEdit(roleObj)}
                          title="Edit Role Permissions"
                        />
                        {!['Sub Admin', 'Sub Doctor'].includes(roleObj.role) && (
                          <ActionButton
                            type="delete"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete the role "${roleObj.role}"?`)) {
                                try {
                                  // We can reuse the update API with a special flag or just delete if it exists in DB
                                  // For now, let's assume we need a delete API. 
                                  // I'll add a delete API to AllApi and backend.
                                  await deleteRolePermissionApi(roleObj.role);
                                  await fetchList();
                                  toast.success("Role deleted successfully");
                                } catch (err) {
                                  toast.error("Failed to delete role");
                                }
                              }
                            }}
                            title="Delete Role"
                          />
                        )}
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
            <h2 className="text-3xl font-bold text-[#134D41]">
              Update Role Permissions
            </h2>
            <p className="text-gray-500 mt-2 font-bold uppercase tracking-wider">Role: {editing?.role}</p>
          </div>
          
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.category} className="border rounded-xl p-4 bg-gray-50/30">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                    {group.category}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {group.permissions.map((perm) => (
                      <label key={perm.value} className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:border-teal-500 transition-colors shadow-sm min-h-[50px]">
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
                          className="w-5 h-5 flex-shrink-0 text-teal-600 focus:ring-teal-500 border-gray-300 rounded transition-all cursor-pointer"
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
              <TimeButton loading={saveLoading}>Save Role Permissions</TimeButton>
            </div>
          </form>
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default PermissionPage;
