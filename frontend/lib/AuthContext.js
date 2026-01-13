"use client";

import { createContext, useContext, useState, useEffect } from "react";
import api from "./axios";
import { mergeGuestCartToServer } from "./guestCart";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, []);

  // Preload customer statistics for faster loading
  const preloadCustomerStats = async (userId) => {
    try {
      const cacheKey = `customer_stats_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      
      // Check if we have recent cache (less than 5 minutes)
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(parsedCache.cached_at).getTime();
          if (cacheAge < 300000) {
            // Cache is fresh, no need to preload
            return;
          }
        } catch (e) {
          // Invalid cache, continue to preload
        }
      }

      // Fetch fresh statistics in background
      const response = await api.get("/orders/summary");
      localStorage.setItem(cacheKey, JSON.stringify({
        total_orders: response.data.total_orders || 0,
        total_spent: response.data.total_spent || 0,
        loyalty_points: 0,
        cached_at: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to preload customer stats:", error);
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      console.log("No token found, setting loading to false");
      setLoading(false);
      return;
    }

    try {
      console.log("Checking auth with token...");
      const response = await api.get("/user");
      console.log("Auth check successful, user data:", response.data);
      console.log("User roles:", response.data.roles);
      setUser(response.data);
      setIsAuthenticated(true);
      
      // Preload customer statistics for faster loading
      preloadCustomerStats(response.data.id);
      
      try {
        await mergeGuestCartToServer(api);
      } catch (error) {
        console.error("Failed to merge guest cart:", error);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post("/login", { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem("token", token);
      setUser(user);
      setIsAuthenticated(true);
      
      // Preload customer statistics for faster loading
      preloadCustomerStats(user.id);
      
      try {
        await mergeGuestCartToServer(api);
      } catch (error) {
        console.error("Failed to merge guest cart:", error);
      }
      
      return { success: true, user };
    } catch (error) {
      const status = error.response?.status;
      const message =
        status === 401
          ? "Invalid email or password."
          : error.response?.data?.message || "Login failed";
      return { 
        success: false, 
        error: message
      };
    }
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate token on server
      await api.post("/logout");
      console.log("Logout API call successful");
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Always clear local state regardless of API call result
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
      console.log("Local logout completed - token removed, state cleared");
    }
  };

  const isAdmin = () => {
    return user?.roles?.some(role => role.name === 'admin') || false;
  };

  const refreshUser = async () => {
    try {
      const response = await api.get("/user");
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    refreshUser,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // During SSR or if provider is not available, return default values
    if (typeof window === 'undefined') {
      return {
        user: null,
        loading: true,
        isAuthenticated: false,
        login: async () => ({ success: false, error: "Not available during SSR" }),
        logout: async () => {},
        checkAuth: async () => {},
        refreshUser: async () => {},
        isAdmin: () => false,
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
