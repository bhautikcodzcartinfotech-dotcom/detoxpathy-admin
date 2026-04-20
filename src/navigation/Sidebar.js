"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MdAssignment,
  MdCategory,
  MdChat,
  MdDashboard,
  MdDeviceHub,
  MdPeople,
  MdPerson,
  MdVideoLibrary,
  MdQuiz,
  MdSettings,
  MdHistory,
  MdShoppingCart,
  MdAccessTime,
  MdCalendarMonth,
  MdGroups,
} from "react-icons/md";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { FiMessageCircle, FiLogOut } from "react-icons/fi";

import { useAuth } from "../contexts/AuthContext";
import Image from "next/image";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const { role, isImpersonating, exitImpersonation } = useAuth();

  const linkClasses = (path) =>
    `flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"
    } py-3 rounded-xl text-sm font-medium transition-all duration-300 ${pathname === path
      ? "bg-[#134D41] text-white shadow-lg transform scale-105"
      : "text-gray-700 hover:bg-[#134D41]/10 hover:text-[#134D41] hover:shadow-md hover:transform hover:scale-105"
    }`;

  return (
    <aside
      className={`${isCollapsed ? "w-16" : "w-64"
        } bg-white shadow-2xl border-r border-gray-200 flex flex-col h-screen overflow-hidden transition-all duration-300 backdrop-blur-sm fixed left-0 top-0 z-10`}
    >
      {/* Logo + Toggle */}
      <div className="p-5 border-b border-[#134D41]/20 flex items-center justify-between bg-[#134D41]">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className=""></div>
              <div className="relative">
                <Image
                  src="/image/detoxpathy.png"
                  alt="fatEndfit Logo"
                  width={150}
                  height={50}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        ) : (
          <div></div>
        )}
        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsCollapsed((v) => !v)}
          className={`p-2 rounded-lg hover:bg-white/10 text-white transition-all duration-200 hover:shadow-md hover:scale-105 ${isCollapsed ? "mx-auto" : "ml-2"
            }`}
        >
          {isCollapsed ? (
            <MdChevronRight size={20} />
          ) : (
            <MdChevronLeft size={20} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 flex flex-col gap-6 ${isCollapsed ? "px-2" : "px-4"
          } min-h-0 py-5 overflow-y-auto transition-all duration-300`}
      >
        {/* Section: Main */}
        <div>
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Main
            </h2>
          )}
          <Link href="/dashboard" className={linkClasses("/dashboard")}>
            <MdDashboard size={20} />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
          {role === "Admin" && (
            <>
              <Link
                href="/component/branch"
                className={linkClasses("/component/branch")}
              >
                <MdDeviceHub size={20} />
                {!isCollapsed && <span>Branches</span>}
              </Link>
              <Link
                href="/component/branch-time"
                className={linkClasses("/component/branch-time")}
              >
                <MdAccessTime size={20} />
                {!isCollapsed && <span>Branch Time</span>}
              </Link>
              <Link
                href="/component/appointment"
                className={linkClasses("/component/appointment")}
              >
                <MdCalendarMonth size={20} />
                {!isCollapsed && <span>Appointments</span>}
              </Link>
              {!isCollapsed && (
                <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2 mt-5">
                  utils
                </h2>
              )}
              <Link
                href="/component/video"
                className={linkClasses("/component/video")}
              >
                <MdVideoLibrary size={20} />
                {!isCollapsed && <span>Videos</span>}
              </Link>
              <Link
                href="/component/category"
                className={linkClasses("/component/category")}
              >
                <MdCategory size={20} />
                {!isCollapsed && <span>Categories</span>}
              </Link>
              <Link
                href="/component/plan"
                className={linkClasses("/component/plan")}
              >
                <MdAssignment size={20} />
                {!isCollapsed && <span>Plans</span>}
              </Link>
              <Link
                href="/component/question"
                className={linkClasses("/component/question")}
              >
                <MdQuiz size={20} />
                {!isCollapsed && <span>Questions</span>}
              </Link>
              <Link
                href="/component/product"
                className={linkClasses("/component/product")}
              >
                <MdShoppingCart size={20} />
                {!isCollapsed && <span>Products</span>}
              </Link>
              {/* <Link
                href="/component/program"
                className={linkClasses("/component/program")}
              >
                <MdAssignment size={20} />
                {!isCollapsed && <span>Programs</span>}
              </Link> */}
              <Link
                href="/component/order"
                className={linkClasses("/component/order")}
              >
                <MdShoppingCart size={20} />
                {!isCollapsed && <span>Orders</span>}
              </Link>
              <Link
                href="/component/stock"
                className={linkClasses("/component/stock")}
              >
                <MdAssignment size={20} />
                {!isCollapsed && <span>Stock Management</span>}
              </Link>
            </>
          )}
        </div>

        {/* Section: Management */}
        {(role === "Admin" || role === "subadmin") && (
          <>
            <div>
              {!isCollapsed && (
                <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Management
                </h2>
              )}
              <Link
                href="/component/users"
                className={linkClasses("/component/users")}
              >
                <MdPeople size={20} />
                {!isCollapsed && <span>Users</span>}
              </Link>
              {role === "subadmin" && (
                <>
                  <Link
                    href="/component/branch-time"
                    className={linkClasses("/component/branch-time")}
                  >
                    <MdAccessTime size={20} />
                    {!isCollapsed && <span>Branch Time</span>}
                  </Link>
                  <Link
                    href="/component/appointment"
                    className={linkClasses("/component/appointment")}
                  >
                    <MdCalendarMonth size={20} />
                    {!isCollapsed && <span>Appointments</span>}
                  </Link>
                </>
              )}

              {role === "Admin" && (
                <Link
                  href="/component/subadmin"
                  className={linkClasses("/component/subadmin")}
                >
                  <MdPerson size={20} />
                  {!isCollapsed && <span>SubAdmin</span>}
                </Link>
              )}
              {(role === "Admin" || role === "subadmin") && (
                <Link
                  href="/component/staff"
                  className={linkClasses("/component/staff")}
                >
                  <MdGroups size={20} />
                  {!isCollapsed && <span>Staff</span>}
                </Link>
              )}
            </div>
          </>
        )}

        {/* Section: Communication (both roles) */}
        <div>
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Communication
            </h2>
          )}
          <Link
            href="/component/userchat"
            className={linkClasses("/component/userchat")}
          >
            <MdChat size={20} />
            {!isCollapsed && <span>Supports</span>}
          </Link>
          <Link
            href="/component/message"
            className={linkClasses("/component/message")}
          >
            <FiMessageCircle size={20} />
            {!isCollapsed && <span>Quick Replies</span>}
          </Link>
        </div>

        {/* Section: Settings (Admin only) */}
        {role === "Admin" && (
          <div>
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Settings
              </h2>
            )}
            <Link
              href="/component/settings"
              className={linkClasses("/component/settings")}
            >
              <MdSettings size={20} />
              {!isCollapsed && <span>App Settings</span>}
            </Link>
            <Link
              href="/component/logs"
              className={linkClasses("/component/logs")}
            >
              <MdHistory size={20} />
              {!isCollapsed && <span>Logs</span>}
            </Link>
          </div>
        )}

        {/* Section: Exit Impersonation */}
        {isImpersonating && (
          <div className="mt-auto pt-5 border-t border-red-200">
            <button
              onClick={exitImpersonation}
              className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-3 rounded-xl text-sm font-semibold transition-all duration-300 bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transform hover:scale-105 w-full`}
            >
              <FiLogOut size={20} />
              {!isCollapsed && <span>Exit Sub-Admin</span>}
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
