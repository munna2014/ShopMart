"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerView from "./CustomerView";
import api from "@/lib/axios";

export default function Page() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await api.get("/user");
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
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
