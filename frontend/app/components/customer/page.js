"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import CustomerView from "./CustomerView";

export default function Page() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (isAdmin()) {
        // If admin tries to access customer page, redirect to admin
        router.push("/components/admin");
      }
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to login
  }

  if (isAdmin()) {
    return null; // Will redirect to admin
  }

  // Format the join date if available, otherwise default
  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "January 2024";

  // Transform backend data to frontend view model
  const customerData = {
    name: user.full_name || user.name || "Customer",
    email: user.email,
    phone: user.phone || "",
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.full_name || user.name || "Customer"
    )}&size=200&background=059669&color=fff`,
    joinDate: joinDate,
    totalOrders: 0,
    totalSpent: "$0.00",
    loyaltyPoints: 0,
  };

  return <CustomerView customer={customerData} />;
}
