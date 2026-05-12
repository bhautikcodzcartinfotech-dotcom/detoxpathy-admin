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
  const { role, branches, permissions } = useAuth();
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
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedReferrer, setSelectedReferrer] = useState("");

  const [selectedAgeRange, setSelectedAgeRange] = useState("");
  const [skipBodyMeasurement, setSkipBodyMeasurement] = useState("");


  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    inactive: 0,
    avgHeight: 0,
    maxHeight: 0,
    minHeight: 0,
    avgWeight: 0,
    maxWeight: 0,
    minWeight: 0,
    avgIdealWeight: 0
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

    const heights = users.map(u => parseFloat(u.height)).filter(h => !isNaN(h) && h > 0);
    const weights = users.map(u => parseFloat(u.weight)).filter(w => !isNaN(w) && w > 0);
    const idealWeights = users.map(u => parseFloat(u.idealWeight)).filter(w => !isNaN(w) && w > 0);

    const avgHeight = heights.length > 0 ? (heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1) : 0;
    const maxHeight = heights.length > 0 ? Math.max(...heights) : 0;
    const minHeight = heights.length > 0 ? Math.min(...heights) : 0;

    const avgWeight = weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : 0;
    const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
    const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
    const avgIdealWeight = idealWeights.length > 0 ? (idealWeights.reduce((a, b) => a + b, 0) / idealWeights.length).toFixed(1) : 0;

    setStats({ 
      total, 
      active, 
      completed, 
      inactive,
      avgHeight,
      maxHeight,
      minHeight,
      avgWeight,
      maxWeight,
      minWeight,
      avgIdealWeight
    });

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

  const calculateAge = (dob) => {
    if (!dob) return null;
    // Format could be DD/MM/YYYY or YYYY-MM-DD
    let birthDate;
    if (dob.includes("/")) {
      const parts = dob.split("/");
      if (parts.length !== 3) return null;
      birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
      birthDate = new Date(dob);
    }
    
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const applyFilters = (list, term, status, planId, date, planHistoryType, language, gender, city, state, country, skipBody, referrer, ageRange) => {


    const base = Array.isArray(list) ? list : [];
    let data = base;

    // Filter by age range
    if (ageRange) {
      data = data.filter((u) => {
        const age = calculateAge(u.dob);
        if (age === null) return false;
        
        const [min, max] = ageRange.split("-").map(n => n === "+" ? Infinity : Number(n));
        if (ageRange.endsWith("+")) {
          return age >= min;
        }
        return age >= min && age <= max;
      });
    }

    // Filter by referrer (Include the referrer themselves + their referees)
    if (referrer) {
      data = data.filter((u) => u.usedReferralCode === referrer || u.referralCode === referrer);
    }

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

    // Filter by gender
    if (gender) {
      data = data.filter((u) => u.gender === gender);
    }

    // Filter by city
    if (city) {
      data = data.filter((u) =>
        u.city && u.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Filter by state
    if (state) {
      data = data.filter((u) =>
        u.state && u.state.toLowerCase().includes(state.toLowerCase())
      );
    }

    // Filter by country
    if (country) {
      data = data.filter((u) =>
        u.country && u.country.toLowerCase().includes(country.toLowerCase())
      );
    }

    // Filter by body measurement (Skip Body Measurement)
    if (skipBody === "skip") {
      data = data.filter((u) => {
        const hasMeasurement = 
          (u.waist && u.waist != "0" && u.waist != 0) || 
          (u.hip && u.hip != "0" && u.hip != 0) || 
          (u.chest && u.chest != "0" && u.chest != 0) || 
          (u.thigh && u.thigh != "0" && u.thigh != 0) || 
          (u.biceps && u.biceps != "0" && u.biceps != 0);
        return !hasMeasurement;
      });
    } else if (skipBody === "provided") {
      data = data.filter((u) => {
        const hasMeasurement = 
          (u.waist && u.waist != "0" && u.waist != 0) || 
          (u.hip && u.hip != "0" && u.hip != 0) || 
          (u.chest && u.chest != "0" && u.chest != 0) || 
          (u.thigh && u.thigh != "0" && u.thigh != 0) || 
          (u.biceps && u.biceps != "0" && u.biceps != 0);
        return hasMeasurement;
      });
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
      selectedLanguage,
      selectedGender,
      selectedCity,
      selectedState,
      selectedCountry,
      skipBodyMeasurement,
      selectedReferrer,
      selectedAgeRange


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
        selectedLanguage,
        selectedGender,
        selectedCity,
        selectedState,
        selectedCountry,
        skipBodyMeasurement,
        selectedReferrer,
        selectedAgeRange


      )
    );
  }, [
    filter,
    selectedPlan,
    selectedDate,
    planHistoryFilter,
    selectedLanguage,
    selectedGender,
    selectedCity,
    selectedState,
    selectedCountry,
    skipBodyMeasurement,
    selectedReferrer,
    selectedAgeRange,


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
      <div className="w-full h-full px-8 lg:px-12 py-6 bg-gray-50/50">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <Header size="4xl">Users & Patients</Header>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Manage all registered users and program assignments</p>
          </div>
          {(role === "Admin" || (role === "subadmin" && permissions?.includes("create user"))) && (
            <Button onClick={() => setIsOpen(true)}>
              Add New Patient
            </Button>
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

        {/* Physical Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Height Stats */}
          <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-500 shadow-lg shadow-blue-900/5 transition-all hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Height Statistics (cm)</p>
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Average</p>
                <p className="text-2xl font-black text-gray-900">{stats.avgHeight}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1 text-center">Lowest</p>
                <p className="text-2xl font-black text-red-500 text-center">{stats.minHeight}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1 text-right">Highest</p>
                <p className="text-2xl font-black text-green-600 text-right">{stats.maxHeight}</p>
              </div>
            </div>
          </div>

          {/* Weight Stats */}
          <div className="bg-white p-6 rounded-2xl border-l-4 border-indigo-500 shadow-lg shadow-indigo-900/5 transition-all hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Weight Statistics (kg)</p>
              <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase font-bold tracking-tighter">Avg Actual</p>
                <p className="text-2xl font-black text-gray-900">{stats.avgWeight}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase font-bold tracking-tighter">Avg Ideal</p>
                <p className="text-2xl font-black text-blue-600">{stats.avgIdealWeight}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase font-bold tracking-tighter">Lowest</p>
                <p className="text-2xl font-black text-red-500">{stats.minWeight}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase font-bold tracking-tighter text-right">Highest</p>
                <p className="text-2xl font-black text-green-600 text-right">{stats.maxWeight}</p>
              </div>
            </div>

          </div>
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
            selectedGender={selectedGender}
            onGenderChange={setSelectedGender}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            selectedState={selectedState}
            onStateChange={setSelectedState}
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            skipBodyMeasurement={skipBodyMeasurement}
            onSkipBodyMeasurementChange={setSkipBodyMeasurement}


            referrerOptions={users
              .filter((u) => u.referralCode)
              .map((u) => ({
                label: `${u.name} ${u.surname || ""} (${u.referralCode})`,
                value: u.referralCode,
              }))}
            selectedReferrer={selectedReferrer}
            onReferrerChange={setSelectedReferrer}
            selectedAgeRange={selectedAgeRange}
            onAgeRangeChange={setSelectedAgeRange}
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
