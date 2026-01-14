"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1); // 1: OTP verification, 2: New password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const validateOtpForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = ["Email is required"];
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = ["Email is invalid"];
    }

    if (!otp.trim()) {
      newErrors.otp = ["Reset code is required"];
    } else if (otp.length !== 6) {
      newErrors.otp = ["Reset code must be 6 digits"];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = ["Password is required"];
    } else if (password.length < 8) {
      newErrors.password = ["Password must be at least 8 characters"];
    }

    if (!passwordConfirmation) {
      newErrors.password_confirmation = ["Please confirm your password"];
    } else if (password !== passwordConfirmation) {
      newErrors.password_confirmation = ["Passwords do not match"];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!validateOtpForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/verify-reset-otp", {
        email,
        code: otp,
      });

      setResetToken(response.data.reset_token);
      setStep(2);
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors({ general: [error.response.data.message] });
      } else {
        setErrors({ general: ["Something went wrong. Please try again."] });
      }
      console.error("OTP Verification Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!validatePasswordForm()) {
      setLoading(false);
      return;
    }

    try {
      await api.post("/reset-password", {
        email,
        reset_token: resetToken,
        password,
        password_confirmation: passwordConfirmation,
      });

      // Show success and redirect to login
      alert("Password reset successfully! Please login with your new password.");
      router.push("/login");
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors || { general: [error.response.data.message] });
      } else {
        setErrors({ general: ["Something went wrong. Please try again."] });
      }
      console.error("Password Reset Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      await api.post("/forgot-password", { email });
      alert("New reset code sent to your email!");
    } catch (error) {
      console.error("Resend Error:", error);
      alert("Failed to resend code. Please try again.");
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <svg
                  className="w-7 h-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M6 2L3 6V20c0 1.1.9 2 2 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>

            {/* Right Side - Back to Login */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen pt-20 pb-10 px-4">
        <div className="w-full max-w-md px-8 py-10 bg-white rounded-3xl shadow-2xl shadow-green-200/50 transition-all duration-300 hover:shadow-green-300/60 border border-green-100">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent mb-2">
              {step === 1 ? "Verify Reset Code" : "Set New Password"}
            </h1>
            <p className="text-gray-600 text-lg">
              {step === 1 
                ? "Enter the 6-digit code sent to your email" 
                : "Create a strong new password"
              }
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              {errors?.general && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium backdrop-blur-sm">
                  {errors.general[0]}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-300 ml-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-gray-900 placeholder-gray-500 transition-all duration-300"
                  placeholder="Enter your email"
                />
                {errors?.email && (
                  <p className="ml-1 text-sm text-red-400 font-medium">
                    {errors.email[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="otp"
                  className="text-sm font-semibold text-gray-300 ml-1"
                >
                  Reset Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength="6"
                  className={`w-full px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 rounded-xl focus:ring-2 outline-none text-gray-900 placeholder-gray-500 transition-all duration-300 text-center text-2xl font-mono tracking-widest ${
                    errors?.otp
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : "border-green-200 focus:ring-green-400 focus:border-green-400"
                  }`}
                  placeholder="000000"
                />
                {errors?.otp && (
                  <p className="ml-1 text-sm text-red-400 font-medium">
                    {errors.otp[0]}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-400/40"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resendOtp}
                  className="text-sm text-green-600 hover:text-green-800 font-semibold transition-colors"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              {errors?.general && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium backdrop-blur-sm">
                  {errors.general[0]}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-300 ml-1"
                >
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 rounded-xl focus:ring-2 transition-all duration-300 ${
                    errors?.password
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : "border-green-200 focus:ring-green-400 focus:border-green-400"
                  }`}
                  placeholder="Enter new password"
                  error={errors?.password?.[0]}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password_confirmation"
                  className="text-sm font-semibold text-gray-300 ml-1"
                >
                  Confirm New Password
                </label>
                <PasswordInput
                  id="password_confirmation"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  className={`px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 rounded-xl focus:ring-2 transition-all duration-300 ${
                    errors?.password_confirmation
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : "border-green-200 focus:ring-green-400 focus:border-green-400"
                  }`}
                  placeholder="Confirm new password"
                  error={errors?.password_confirmation?.[0]}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-400/40"
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-base">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-bold bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent hover:from-emerald-800 hover:via-teal-800 hover:to-cyan-900 transition-all"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}