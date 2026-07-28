"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getDefaultRoute } from "@/utils/defaultRoute";

/**
 * RoleGuard restricts access to children based on user role.
 * Usage: <RoleGuard allow={["Admin"]}>{children}</RoleGuard>
 */
const RoleGuard = ({ allow = [], permission = null, fallback = null, redirectOnDeny = false, children }) => {
  const { role, permissions, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isRoleAllowed = allow.length === 0 || (role && allow.includes(role));
  const isPermissionAllowed = !permission || role === "Admin" || (permissions && permissions.includes(permission));
  const isAllowed = isRoleAllowed && isPermissionAllowed;

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (!loading && isAuthenticated() && !isAllowed && redirectOnDeny) {
      router.replace(getDefaultRoute(role, permissions, { exclude: ["/dashboard"] }));
    }
  }, [loading, isAuthenticated, isAllowed, redirectOnDeny, role, permissions, router]);

  if (loading) return null;
  if (!isAuthenticated()) return null;
  if (!isAllowed) return fallback ?? null;

  return children;
};

export default RoleGuard;
