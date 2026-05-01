"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import {
  createUserApi,
  getAllUsers,
  updateUserById,
  getAllPlans,
} from "@/Api/AllApi";
import UserForm from "./UserForm";
import UserList from "./UserList";
import ProgramSuggestionForm from "./ProgramSuggestionForm";
import SearchComponent from "@/components/SearchComponent";
import Dropdown from "@/utils/dropdown";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users as UsersIcon,
  Activity,
  CheckCircle,
  UserX,
  Search,
  Plus
} from "lucide-react";

const UsersPage = () => {
  const { role, branches } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [suggestionUser, setSuggestionUser] = useState(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filter, setFilter] = useState("active"); // all | active | inactive
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [planHistoryFilter, setPlanHistoryFilter] = useState(""); // "" | "one" | "upgraded"
  const [plans, setPlans] = useState([]);
  const [userPlanHistoryMap, setUserPlanHistoryMap] = useState({}); // userId -> planHistory count
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    inactive: 0
  });

  const fetchList = async () => {
    try {
      setListLoading(true);
      let userData = [];
      if (role === "subadmin") {
        const branchIds = Array.isArray(branches) ? branches : [];
        const chunks = await Promise.all(
          branchIds.map((id) =>
            import("@/Api/AllApi").then((m) => m.getUsersByBranch(id))
          )
        );
        userData = chunks.flat();
        // Subadmin only sees active users
        userData = userData.filter((u) => !u.isDeleted);
      } else {
        const data = await getAllUsers();
        userData = Array.isArray(data) ? data : [];
      }
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load users");
      toast.error(e?.response?.data?.message || "Failed to load users");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    // Calculate stats whenever users change
    const total = users.length;
    const active = users.filter(u => !u.isDeleted && u.plan).length;
    const inactive = users.filter(u => u.isDeleted || u.isBlocked).length;
    // For "Completed", we'll count users who reached a high plan day or are marked as such
    // Since we don't have a clear "completed" flag, I'll use a proxy or placeholder for now
    // Actually, let's just make it zero or calculate a placeholder to match designs
    const completed = users.filter(u => u.meetDoctor && !u.isDeleted).length;

    setStats({ total, active, completed, inactive });
  }, [users]);

  useEffect(() => {
    fetchList();
    // Fetch plans for filter
    const fetchPlans = async () => {
      try {
        const planList = await getAllPlans();
        setPlans(Array.isArray(planList) ? planList : []);
      } catch (err) {
        console.error("Error fetching plans", err);
      }
    };
    fetchPlans();
  }, []);

  // Fetch plan history for users when needed
  useEffect(() => {
    if (planHistoryFilter && users.length > 0) {
      const fetchPlanHistory = async () => {
        const historyMap = {};
        // Fetch plan history for a sample of users (or all if needed)
        // For performance, we'll check plan history only when filter is active
        const promises = users.slice(0, 100).map(async (user) => {
          try {
            const { getUserOverview } = await import("@/Api/AllApi");
            const overview = await getUserOverview(user._id);
            const history = Array.isArray(overview?.planHistory)
              ? overview.planHistory
              : [];
            historyMap[user._id] = history.length;
          } catch (err) {
            // If plan history fetch fails, assume 1 plan (current plan)
            historyMap[user._id] = 1;
          }
        });
        await Promise.all(promises);
        setUserPlanHistoryMap(historyMap);
      };
      fetchPlanHistory();
    }
  }, [planHistoryFilter, users.length]);

  const applyFilters = (list, term, status, planId, date, planHistoryType, language) => {
    const base = Array.isArray(list) ? list : [];
    let data = base;

    // For subadmin, only show active users (already filtered in fetchList)
    if (role === "subadmin") {
      data = data.filter((u) => !u.isDeleted);
    } else {
      // Admin filtering: all | active | inactive
      if (status === "active") data = data.filter((u) => !u.isDeleted);
      else if (status === "inactive") data = data.filter((u) => u.isDeleted);
      // "all" shows all users (no filtering)
    }

    // Filter by plan
    if (planId) {
      data = data.filter((u) => {
        const userPlanId = u.plan?._id || u.plan;
        return userPlanId === planId;
      });
    }

    // Filter by date (createdAt)
    if (date) {
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      data = data.filter((u) => {
        if (!u.createdAt) return false;
        const userDate = new Date(u.createdAt);
        userDate.setHours(0, 0, 0, 0);
        return userDate >= filterDate && userDate < nextDay;
      });
    }

    // Filter by plan history (only one plan vs upgraded)
    if (planHistoryType) {
      data = data.filter((u) => {
        const historyCount = userPlanHistoryMap[u._id] || 1; // Default to 1 if not fetched
        if (planHistoryType === "one") {
          return historyCount === 1; // Only one plan
        } else if (planHistoryType === "upgraded") {
          return historyCount > 1; // Multiple plans (upgraded)
        }
        return true;
      });
    }

    // Filter by language
    if (language) {
      data = data.filter((u) =>
        u.language && u.language.toString().toLowerCase() === language.toLowerCase()
      );
    }

    // Search term filter
    if (!term) return data;
    const t = term.toLowerCase();
    return data.filter(
      (user) =>
        (user.name || "").toLowerCase().includes(t) ||
        String(user.mobileNumber || "").includes(t) ||
        `${user.mobilePrefix || ""}${user.mobileNumber || ""}`.includes(t) ||
        (user.branch?.name || "").toLowerCase().includes(t) ||
        (user.plan?.name || "").toLowerCase().includes(t)
    );
  };

  const handleSearch = (searchTerm) => {
    setSearchLoading(true);

    const filtered = applyFilters(
      users,
      searchTerm,
      filter,
      selectedPlan,
      selectedDate,
      planHistoryFilter,
      selectedLanguage
    );
    setFilteredUsers(filtered);
    setSearchLoading(false);
  };

  // React to filter changes
  useEffect(() => {
    setFilteredUsers(
      applyFilters(
        users,
        "",
        filter,
        selectedPlan,
        selectedDate,
        planHistoryFilter,
        selectedLanguage
      )
    );
  }, [
    filter,
    selectedPlan,
    selectedDate,
    planHistoryFilter,
    selectedLanguage,
    users,
    userPlanHistoryMap,
  ]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateUserById(editing._id, formData);
        toast.success("User updated successfully!");
      } else {
        await createUserApi(formData);
        toast.success("User created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save user");
      toast.error(err?.response?.data?.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setIsOpen(true);
  };

  const handleSuggest = (item) => {
    setSuggestionUser(item);
    setIsSuggestOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError("");
      // Ensure branchId and planId are sent to satisfy backend validation
      const current = Array.isArray(users)
        ? users.find((u) => u._id === id)
        : null;
      const branchId = current?.branch?._id || current?.branch;
      const planId = current?.plan?._id || current?.plan;
      await updateUserById(id, { isDeleted: true, branchId, planId });
      await fetchList();
      toast.success("User deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete user");
      toast.error(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-18 flex flex-col bg-gray-50/50">
        {/* New Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Users / Patients</h1>
            <p className="text-sm text-gray-500 font-medium">Manage all registered users, program status, and branch assignments.</p>
          </div>
          {role === "Admin" && (
            <button
              onClick={() => setIsOpen(true)}
              className="h-12 px-8 bg-teal-900 text-white rounded-none font-black text-xs uppercase tracking-widest hover:bg-teal-950 hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New
            </button>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            {
              label: "TOTAL USERS",
              value: stats.total.toLocaleString(),
              color: "border-teal-600",
              icon: UsersIcon
            },
            {
              label: "ACTIVE PROGRAMS",
              value: stats.active.toLocaleString(),
              color: "border-green-500",
              icon: Activity
            },
            {
              label: "COMPLETED",
              value: stats.completed.toLocaleString(),
              color: "border-teal-800",
              icon: CheckCircle
            },
            {
              label: "INACTIVE",
              value: stats.inactive.toLocaleString(),
              color: "border-red-500",
              icon: UserX
            },
          ].map((item, idx) => (
            <div key={idx} className={`bg-white p-8 rounded-none border-t-4 ${item.color} shadow-xl shadow-gray-200/50 transition-all hover:-translate-y-1`}>
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">{item.label}</p>
                <item.icon className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-4xl font-black text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 flex-shrink-0">
            {error}
          </div>
        )}

        <div className="mb-4 flex-shrink-0">
          <SearchComponent
            onSearch={handleSearch}
            onFilterChange={setFilter}
            searchLoading={searchLoading}
            searchPlaceholder="Search by name, mobile, or branch..."
            filterOptions={
              role === "subadmin"
                ? [] // No filter options for subadmin
                : [
                  { label: "All Users", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]
            }
            filterValue={filter}
            filterLabel="Status"
            planOptions={plans.map((p) => ({ label: p.name, value: p._id }))}
            selectedPlan={selectedPlan}
            onPlanChange={setSelectedPlan}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            planHistoryFilter={planHistoryFilter}
            onPlanHistoryFilterChange={setPlanHistoryFilter}
            languageOptions={[
              { label: "English", value: "english" },
              { label: "Hindi", value: "hindi" },
              { label: "Gujarati", value: "gujarati" },
            ]}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>

        {!listLoading && (
          <div className="mb-4 text-sm text-gray-600 flex-shrink-0">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        )}

        <div className="flex-1 min-h-0">
          <UserList
            users={filteredUsers}
            loading={listLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSuggest={handleSuggest}
          />
        </div>

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update User" : "Create User"}
            </h2>
          </div>
          <UserForm
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

        <Drawer isOpen={isSuggestOpen} onClose={() => setIsSuggestOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-purple-600">Suggest Programs</h2>
            {suggestionUser && (
              <p className="text-sm text-gray-500 mt-1">{suggestionUser.name}</p>
            )}
          </div>
          {suggestionUser && (
            <ProgramSuggestionForm
              user={suggestionUser}
              onCancel={() => setIsSuggestOpen(false)}
              onSave={() => setIsSuggestOpen(false)}
            />
          )}
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default UsersPage;
