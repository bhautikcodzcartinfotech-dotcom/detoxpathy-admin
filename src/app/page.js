"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import DashboardCards from "./dashboard/page";
import Loader from '@/utils/loader';
import { getDefaultRoute } from "@/utils/defaultRoute";

const HomePage = () => {
  const { isAuthenticated, loading, role, permissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated()) {
        router.push(getDefaultRoute(role, permissions));
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, loading, router, role, permissions]);

  // Show loading while checking authentication
  if (loading) {
    return (
     <Loader />
    );
  }

  return null; // Will redirect
};

export default HomePage;
