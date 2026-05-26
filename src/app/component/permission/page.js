"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import { ActionButton } from "@/utils/actionbutton";
import { getRolePermissionsApi, updateRolePermissionsApi, deleteRolePermissionApi } from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const PERMISSION_GROUPS = [
  {
    category: "User Management",
    permissions: [
      { label: "Create User", value: "create user" },
      { label: "Edit User", value: "edit user" },
      { label: "Delete User", value: "delete user" },
    ]
  },
  {
    category: "Page Access",
    permissions: [
      { label: "Show Users Page", value: "show users page" },
      { label: "Show Appointments Page", value: "show appointments page" },
      { label: "Show Branch Time Page", value: "show branch time page" },
      { label: "Show Reports Page", value: "show reports page" },
      { label: "Show Supports Page", value: "show supports page" },
      { label: "Show Notes Page", value: "show notes page" },
      { label: "Show Videos Page", value: "show videos page" },
      { label: "Show Categories Page", value: "show categories page" },
      { label: "Show Stock Page", value: "show stock page" },
      { label: "Show Supplier Page", value: "show supplier page" },
      { label: "Show Logs Page", value: "show Logs page" },
      { label: "Show Contact Page", value: "show contact page" },
      { label: "Show Contact Categories", value: "show contact categories" },
      { label: "Show Feedback Page", value: "show feedback page" },
      { label: "Show App References", value: "show app reference page" },
      { label: "Show Order Page", value: "show order page" },
      { label: "Show Branches Page", value: "show branches page" },
      { label: "Show Staff Page", value: "show staff page" },
      { label: "Show Accounting Page", value: "show accounting page" },
      { label: "Show Complaints Page", value: "show complaints page" },
      { label: "Show GST Reports Page", value: "show gst reports page" },
      { label: "Show Medical Condition Page", value: "show medical condition page" },
      { label: "Show Messages Page", value: "show messages page" },
      { label: "Show Party Page", value: "show party page" },
      { label: "Show Permissions Page", value: "show permissions page" },
      { label: "Show Plans Page", value: "show plans page" },
      { label: "Show Products Page", value: "show products page" },
      { label: "Show Questions Page", value: "show questions page" },
      { label: "Show Settings Page", value: "show settings page" },
      { label: "Show Subadmin Page", value: "show subadmin page" },
      { label: "Show User Chat Page", value: "show user chat page" },
    ]
  },
  {
    category: "Inventory",
    permissions: [
      { label: "Manage Inventory", value: "manage inventory" },
      { label: "Manage Video", value: "manage video" },
      { label: "Manage Category", value: "manage category" },
      { label: "Manage Supplier", value: "manage supplier" },
      { label: "Edit Supplier", value: "edit supplier" },
      { label: "Delete Supplier", value: "delete supplier" },
      { label: "Manage Expense Entry", value: "manage expense entry" },
      { label: "Manage Purchase Entry", value: "manage purchase entry" },
      { label: "Manage Stock Transfer", value: "manage stock transfer" },
    ]
  },
  {
    category: "Orders",
    permissions: [
      { label: "Create Order", value: "create order" },
      { label: "Update Order Status", value: "update order status" },
      { label: "Edit Order", value: "edit order" },
      { label: "Delete Order", value: "delete order" },
    ]
  },
  {
    category: "Staff Management",
    permissions: [
      { label: "Add Staff", value: "add staff" },
      { label: "Edit Staff", value: "edit staff" },
      { label: "Delete Staff", value: "delete staff" },
      { label: "Manage Staff Leave", value: "manage staff leave" },
    ]
  },
  {
    category: "Appointment Management",
    permissions: [
      { label: "Join Appointment Call", value: "join appointment call" },
      { label: "Reschedule Appointment", value: "reschedule appointment" },
      { label: "Cancel Appointment", value: "cancel appointment" },
      { label: "Create Appointment", value: "create appointment" },
      { label: "Edit Appointment", value: "edit appointment" },
      { label: "Approve Appointment", value: "approve appointment" },
    ]
  },
  {
    category: "Branch Time",
    permissions: [
      { label: "Manage Branch Time", value: "manage branch time" },
      { label: "Approve Branch Time Requests", value: "approve branch time requests" },
    ]
  },
  {
    category: "Branch Management",
    permissions: [
      { label: "Create Branch", value: "create branch" },
      { label: "Edit Branch", value: "edit branch" },
      { label: "Delete Branch", value: "delete branch" },
    ]
  },
  {
    category: "Category Management",
    permissions: [
      { label: "Create Category", value: "create category" },
      { label: "Edit Category", value: "edit category" },
      { label: "Delete Category", value: "delete category" },
    ]
  },
  {
    category: "Contact Management",
    permissions: [
      { label: "Create Contact", value: "create contact" },
      { label: "Edit Contact", value: "edit contact" },
      { label: "Delete Contact", value: "delete contact" },
      { label: "Create Contact Category", value: "create contact category" },
      { label: "Edit Contact Category", value: "edit contact category" },
      { label: "Delete Contact Category", value: "delete contact category" },
    ]
  },
  {
    category: "FAQ Management",
    permissions: [
      { label: "Create FAQ", value: "create faq" },
      { label: "Edit FAQ", value: "edit faq" },
      { label: "Delete FAQ", value: "delete faq" },
    ]
  },
  {
    category: "Medical Condition Management",
    permissions: [
      { label: "Create Medical Condition", value: "create medical condition" },
      { label: "Edit Medical Condition", value: "edit medical condition" },
      { label: "Delete Medical Condition", value: "delete medical condition" },
    ]
  },
  {
    category: "Message Management",
    permissions: [
      { label: "Create Message", value: "create message" },
      { label: "Edit Message", value: "edit message" },
      { label: "Delete Message", value: "delete message" },
    ]
  },
  {
    category: "Party Management",
    permissions: [
      { label: "Create Party", value: "create party" },
      { label: "Edit Party", value: "edit party" },
      { label: "Delete Party", value: "delete party" },
    ]
  },
  {
    category: "Plan Management",
    permissions: [
      { label: "Create Plan", value: "create plan" },
      { label: "Edit Plan", value: "edit plan" },
      { label: "Delete Plan", value: "delete plan" },
    ]
  },
  {
    category: "Product Management",
    permissions: [
      { label: "Create Product", value: "create product" },
      { label: "Edit Product", value: "edit product" },
      { label: "Delete Product", value: "delete product" },
    ]
  },
  {
    category: "Question Management",
    permissions: [
      { label: "Create Question", value: "create question" },
      { label: "Edit Question", value: "edit question" },
      { label: "Delete Question", value: "delete question" },
    ]
  },
  {
    category: "Subadmin Management",
    permissions: [
      { label: "Create Subadmin", value: "create subadmin" },
      { label: "Edit Subadmin", value: "edit subadmin" },
      { label: "Delete Subadmin", value: "delete subadmin" },
      { label: "Manage Subadmin Leave", value: "manage subadmin leave" },
    ]
  },
  {
    category: "User Chat Management",
    permissions: [
      { label: "Send Chat Message", value: "send chat message" },
      { label: "Transfer Appointment", value: "transfer appointment" },
      { label: "Delete Chat Message", value: "delete chat message" },
    ]
  },
  {
    category: "Accounting & Reports",
    permissions: [
      { label: "Manage Accounting", value: "manage accounting" },
      { label: "Manage GST Reports", value: "manage gst reports" },
      { label: "Manage Complaints", value: "manage complaints" },
    ]
  },
  {
    category: "Settings",
    permissions: [
      { label: "Manage Settings", value: "manage settings" },
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
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    roleName: null,
  });

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

  const handleDeleteClick = (roleName) => {
    setDeleteDialog({
      isOpen: true,
      roleName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.roleName) {
      try {
        await deleteRolePermissionApi(deleteDialog.roleName);
        await fetchList();
        toast.success("Role deleted successfully");
      } catch (err) {
        toast.error("Failed to delete role");
      }
    }
    setDeleteDialog({
      isOpen: false,
      roleName: null,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      roleName: null,
    });
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]} permission="show staff page">
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
                    <td className="p-4 font-bold text-gray-800 capitalize">
                      {roleObj.role === "Sub Admin" ? "Doctor" : roleObj.role}
                    </td>
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
                            onClick={() => handleDeleteClick(roleObj.role)}
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
            <p className="text-gray-500 mt-2 font-bold uppercase tracking-wider">Role: {editing?.role === "Sub Admin" ? "Doctor" : editing?.role}</p>
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

        <ConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Role"
          message={`Are you sure you want to delete the role "${deleteDialog.roleName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </RoleGuard>
  );
};

export default PermissionPage;
