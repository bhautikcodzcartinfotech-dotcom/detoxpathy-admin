"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "../Api/AllApi";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const router = useRouter();

  // Initialize auth from localStorage immediately
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUserRaw = localStorage.getItem("user");
        if (storedToken) {
          // Trust token immediately so UI stays on protected pages after refresh
          setToken(storedToken);
          try {
            const parsedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
            setUser(parsedUser);
          } catch {
            setUser(null);
          }
          // Optional: try to validate in background without forcing logout on failure
          // try {
          //   await validateToken();
          // } catch (e) {
          //   // Swallow validation errors here to avoid redirect loops on refresh
          // }
        } else {
          // No token present
          setToken(null);
          setUser(null);
        }

        // Check if we are impersonating
        const mainToken = localStorage.getItem("mainAdminToken");
        setIsImpersonating(!!mainToken);
      } catch (error) {
        console.error("Auth init failed:", error);
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [router]);

  const login = async (email, password) => {
    try {
      const data = await loginAdmin(email, password);
      const authToken = data.token;
      const admin = data.admin;

      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(admin));
      setToken(authToken);
      setUser(admin);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("mainAdminToken");
    localStorage.removeItem("mainAdminUser");
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
    router.push("/login");
  };

  const exitImpersonation = () => {
    const mainToken = localStorage.getItem("mainAdminToken");
    const mainUser = localStorage.getItem("mainAdminUser");
    if (mainToken && mainUser) {
      localStorage.setItem("token", mainToken);
      localStorage.setItem("user", mainUser);
      localStorage.removeItem("mainAdminToken");
      localStorage.removeItem("mainAdminUser");
      setToken(mainToken);
      setUser(JSON.parse(mainUser));
      setIsImpersonating(false);
      router.push("/component/subadmin");
      return true;
    }
    return false;
  };

  const isAuthenticated = () => {
    return !!token;
  };

  // Normalize role and branches for consistent checks in UI
  const normalizeRole = (adminType) => {
    if (!adminType) return null;
    const key = String(adminType).toLowerCase().replace(/\s+/g, "");
    if (key === "admin") return "Admin";
    return "subadmin";
  };

  const normalizeBranchIds = (branchArr) => {
    if (!branchArr) return [];
    const idArray = Array.isArray(branchArr) ? branchArr : [branchArr];
    return idArray
      .map((b) => {
        if (!b) return null;
        if (typeof b === "string") return b;
        return b._id ? String(b._id) : String(b);
      })
      .filter(Boolean);
  };

  const impersonate = async (email, password) => {
    try {
      const mainToken = localStorage.getItem("token");
      const mainUser = localStorage.getItem("user");

      const result = await login(email, password);
      if (result.success) {
        localStorage.setItem("mainAdminToken", mainToken);
        localStorage.setItem("mainAdminUser", mainUser);
        setIsImpersonating(true);
        return { success: true };
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    role: normalizeRole(user?.adminType),
    branches: normalizeBranchIds(user?.branch),
    token,
    loading,
    isImpersonating,
    login,
    logout,
    impersonate,
    exitImpersonation,
    isAuthenticated,
    permissions: user?.permissions || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
