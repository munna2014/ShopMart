"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";

export default function VerifyOTP() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errors, setErrors] = useState({});
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [emailFailed, setEmailFailed] = useState(false);
  const inputRefs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const emailFailedFlag = sessionStorage.getItem("otp_email_failed") === "1";
    setEmailFailed(emailFailedFlag);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const otpCode = otp.join("");
    
    if (otpCode.length !== 6) {
      setErrors({ otp: ["Please enter the complete 6-digit code"] });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/verify-otp", {
        email: email,
        code: otpCode,
      });

      // Store the token
      const token = response.data.token;
      if (token) {
        localStorage.setItem("token", token);
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
      }

      // Redirect to customer dashboard
      router.push("/components/customer");
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors || { otp: ["Invalid or expired OTP code"] });
      } else {
        setErrors({ general: ["Something went wrong. Please try again."] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setErrors({});

    try {
      const response = await api.post("/resend-otp", { email: email });
      const emailFailedFlag = response.data?.email_sent === false;
      if (typeof window !== "undefined") {
        if (emailFailedFlag) {
          sessionStorage.setItem("otp_email_failed", "1");
        } else {
          sessionStorage.removeItem("otp_email_failed");
        }
      }
      setEmailFailed(emailFailedFlag);
      setTimeLeft(120); // Reset timer
      setOtp(["", "", "", "", "", ""]); // Clear current OTP
      inputRefs.current[0]?.focus();
    } catch (error) {
      setErrors({ general: ["Failed to resend OTP. Please try again."] });
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
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
              <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen pt-20 pb-10 px-4">
        <div className="w-full max-w-md px-8 py-10 bg-white rounded-3xl shadow-2xl shadow-green-200/50 transition-all duration-300 hover:shadow-green-300/60 border border-green-100">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600 text-lg mb-2">
              We've sent a 6-digit code to
            </p>
            <p className="text-green-600 font-semibold text-lg">
              {email}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors?.general && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium backdrop-blur-sm">
                {errors.general[0]}
              </div>
            )}
            {emailFailed && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 text-center text-sm font-medium">
                We could not deliver the email. Please use "Resend Code" or check your mail settings.
              </div>
            )}

            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-300 ml-1 block">
                Enter Verification Code
              </label>
              
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`w-12 h-14 text-center text-xl font-bold bg-gradient-to-r from-green-50 to-emerald-50 border-2 rounded-xl focus:ring-2 outline-none text-gray-900 transition-all duration-300 ${
                      errors?.otp || errors?.code
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : "border-green-200 focus:ring-green-400 focus:border-green-400 hover:border-green-300"
                    }`}
                  />
                ))}
              </div>

              {(errors?.otp || errors?.code) && (
                <p className="text-center text-sm text-red-400 font-medium">
                  {errors.otp?.[0] || errors.code?.[0]}
                </p>
              )}
            </div>

            {/* Timer */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Code expires in{" "}
                <span className={`font-semibold ${timeLeft < 60 ? "text-red-500" : "text-green-600"}`}>
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:via-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-400/40"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-gray-600 text-sm">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOtp}
              disabled={resending || timeLeft > 540}
              className="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? "Sending..." : "Resend Code"}
            </button>
            
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/register"
                className="text-gray-600 hover:text-green-600 transition-colors text-sm"
              >
                ← Back to Registration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
