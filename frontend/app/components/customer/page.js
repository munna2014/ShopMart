"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import CustomerView from "./CustomerView";

export default function Page() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [customerStats, setCustomerStats] = useState({
    totalOrders: 0,
    totalSpent: "$0.00",
  });
  const [statsLoading, setStatsLoading] = useState(false); // Start with false for instant display

  // Fetch customer statistics immediately
  useEffect(() => {
    // Load from cache immediately on mount
    if (user?.id) {
      const cacheKey = `customer_stats_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          setCustomerStats({
            totalOrders: parsedCache.total_orders || 0,
            totalSpent: `$${Number(parsedCache.total_spent || 0).toFixed(2)}`,
          });
          console.log("Customer stats loaded immediately from cache");
        } catch (e) {
          console.error("Failed to parse cached customer stats:", e);
        }
      }
    }

    const fetchCustomerStats = async () => {
      if (!isAuthenticated || !user) return;

      try {
        // Check cache first
        const cacheKey = `customer_stats_${user.id}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            const cacheAge = Date.now() - new Date(parsedCache.cached_at).getTime();
            
            // Always use cache immediately for instant loading
            setCustomerStats({
              totalOrders: parsedCache.total_orders || 0,
              totalSpent: `$${Number(parsedCache.total_spent || 0).toFixed(2)}`,
            });
            setStatsLoading(false);
            
            console.log("Customer stats loaded from cache:", {
              totalOrders: parsedCache.total_orders || 0,
              totalSpent: `$${Number(parsedCache.total_spent || 0).toFixed(2)}`,
              cacheAge: Math.round(cacheAge / 1000) + "s"
            });
            
            // Only fetch fresh data if cache is older than 5 minutes
            if (cacheAge < 300000) {
              return;
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }

        // Fetch fresh data
        const ordersResponse = await api.get("/orders/summary");

        const freshStats = {
          totalOrders: ordersResponse.data.total_orders || 0,
          totalSpent: `$${Number(ordersResponse.data.total_spent || 0).toFixed(2)}`,
        };

        setCustomerStats(freshStats);

        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify({
          total_orders: ordersResponse.data.total_orders || 0,
          total_spent: ordersResponse.data.total_spent || 0,
          cached_at: new Date().toISOString(),
        }));

        console.log("Customer stats loaded fresh from API:", freshStats);

      } catch (error) {
        console.error("Error fetching customer stats:", error);
        // Keep default values on error
      } finally {
        setStatsLoading(false);
      }
    };

    fetchCustomerStats();
  }, [isAuthenticated, user]);

  useEffect(() => {
    console.log("Customer page useEffect:", { 
      loading, 
      isAuthenticated, 
      user: !!user, 
      isAdmin: user ? isAdmin() : 'unknown',
      currentPath: window.location.pathname 
    });
    
    if (!loading) {
      if (!isAuthenticated) {
        console.log("Customer page: Not authenticated, redirecting to login");
        router.push("/login");
      } else if (isAuthenticated && user && isAdmin() && window.location.pathname === '/components/customer') {
        // Only redirect if we have complete user data, user is admin, AND we're actually on customer page
        console.log("Admin user accessing customer page, redirecting to admin dashboard");
        router.push("/components/admin");
      }
    }
  }, [loading, isAuthenticated, user, isAdmin, router]);

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

  if (user && isAdmin()) {
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
    id: user.id,
    name: user.full_name || user.name || "Customer",
    email: user.email,
    phone: user.phone || "",
    date_of_birth: user.date_of_birth || "",
    avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.full_name || user.name || "Customer"
    )}&size=200&background=059669&color=fff`,
    joinDate: joinDate,
    totalOrders: customerStats.totalOrders,
    totalSpent: customerStats.totalSpent,
    statsLoading: statsLoading,
  };

  return <CustomerView customer={customerData} />;
}
