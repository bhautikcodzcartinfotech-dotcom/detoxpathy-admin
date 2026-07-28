"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import Loader from "@/utils/loader";
import { validateEmail, validatePassword } from "@/utils/validation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { getDefaultRoute } from "@/utils/defaultRoute";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ store field-specific errors
  const [errors, setErrors] = useState({ email: "", password: "" });

  const { login, isAuthenticated, loading: authLoading, role, permissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      router.push(getDefaultRoute(role, permissions));
    }
  }, [isAuthenticated, authLoading, router, role, permissions]);

  const handleFocus = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ✅ validate fields on blur
  const handleBlur = (field) => {
    let error = "";
    if (field === "email") {
      error = validateEmail(email);
    } else if (field === "password") {
      error = validatePassword(password);
    }
    setErrors((prev) => ({ ...prev, [field]: error || "" }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // validate both fields before submit
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError || "", password: passwordError || "" });
      return;
    }

    setErrors({ email: "", password: "" });
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success("Login Successful!");
      const storedUser = localStorage.getItem("user");
      let nextRoute = "/dashboard";
      try {
        const admin = storedUser ? JSON.parse(storedUser) : null;
        const adminRole = admin?.adminType?.toLowerCase().replace(/\s+/g, "") === "admin" ? "Admin" : "subadmin";
        nextRoute = getDefaultRoute(adminRole, admin?.permissions || []);
      } catch {
        nextRoute = getDefaultRoute(role, permissions);
      }
      router.push(nextRoute);
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 overflow-hidden">
      <div className="relative w-full max-w-md p-10 bg-white rounded-3xl shadow-md flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-4">
          Welcome Back
        </h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          Log in to access your dashboard
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              onFocus={() => handleFocus("email")} // ✅ added
              placeholder=" "
              className={`peer w-full px-5 pt-5 pb-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-800 transition ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            <label className="absolute left-5 top-2 text-gray-400 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-yellow-500">
              Email Address
            </label>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"} // 👀 toggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur("password")}
              onFocus={() => handleFocus("password")}
              placeholder=" "
              className={`peer w-full px-5 pt-5 pb-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-800 transition ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
            />
            <label className="absolute left-5 top-2 text-gray-400 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-yellow-500">
              Password
            </label>

            {/* 👁 React Icon Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 text-gray-500 hover:text-yellow-500"
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>

            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transform transition-all duration-300 disabled:opacity-70"
          >
            {loading ? <Loader /> : "Login"}
          </button>
          <div className="text-center mt-2">
            <a
              href="/forgot-password"
              className="text-sm text-yellow-600 hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
