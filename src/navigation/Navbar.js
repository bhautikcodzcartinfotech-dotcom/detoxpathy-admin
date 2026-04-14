"use client";

import { useState, useRef, useEffect } from "react";
import { MdAccountCircle } from "react-icons/md";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const { logout, user, role } = useAuth();

  // close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // logout handler
  const handleLogout = () => {
    logout();
    setOpen(false);
  };

  return (
    <header className="h-16 w-full bg-white rounded-xl flex items-center justify-between px-6 shadow-md sticky top-0 z-30 border-b border-gray-100">
      {/* Brand / Title */}
      <h2 className="text-xl font-bold text-gray-800 tracking-wide relative group">
        Dashboard
        <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 group-hover:w-full"></span>
      </h2>

      {/* User Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-200 to-yellow-400 hover:from-yellow-300 hover:to-yellow-500 transition-colors duration-300 text-gray-800 shadow-md"
        >
          <MdAccountCircle size={26} />
        </button>

        {open && (
          <div
            className={`absolute right-0 mt-3 w-60 bg-white/90 backdrop-blur-xl shadow-md rounded-2xl border border-gray-100 overflow-hidden transform origin-top-right transition-all duration-300 ${
              open ? "animate-fade-in" : "animate-fade-out"
            }`}
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shadow-inner">
                  <MdAccountCircle size={28} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email || ""}</p>
                  <p className="text-2xs text-gray-400">{role || ""}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <ul className="py-1">
              <li>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition rounded-md mx-2"
                >
                  Profile
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-500 transition rounded-md mx-2"
                >
                  Logout
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
