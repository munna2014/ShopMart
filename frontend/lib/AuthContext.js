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
      try {
        await mergeGuestCartToServer(api);
      } catch (error) {
        console.error("Failed to merge guest cart:", error);
      }
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || "Login failed" 
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
