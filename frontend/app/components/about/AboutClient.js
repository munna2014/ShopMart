"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function AboutClient() {
  const router = useRouter();
  const { logout, isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("mission");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  
  const notificationsCacheKey = user?.id
    ? `customer_notifications_${user.id}`
    : null;

  // Load cached notifications
  useEffect(() => {
    if (typeof window === "undefined" || !notificationsCacheKey) {
      return;
    }

    const cached = localStorage.getItem(notificationsCacheKey);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.notifications)) {
        setNotifications(parsed.notifications);
      }
      if (typeof parsed.unread_count === "number") {
        setUnreadNotifications(parsed.unread_count);
      }
    } catch (error) {
      console.error("Failed to parse cached notifications:", error);
    }
  }, [notificationsCacheKey]);

  // Fetch notifications
  const fetchNotifications = async ({ force = false } = {}) => {
    if (notificationsLoading || (!force && notificationsLoaded)) {
      return;
    }
    try {
      setNotificationsLoading(true);
      const response = await api.get("/notifications");
      const nextNotifications = response.data.notifications || [];
      const nextUnreadCount = response.data.unread_count || 0;
      setNotifications(nextNotifications);
      setUnreadNotifications(nextUnreadCount);
      setNotificationsLoaded(true);

      if (typeof window !== "undefined" && notificationsCacheKey) {
        localStorage.setItem(
          notificationsCacheKey,
          JSON.stringify({
            notifications: nextNotifications,
            unread_count: nextUnreadCount,
            cached_at: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadNotifications(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Fetch notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
    }
  }, [isAuthenticated, user]);

  const handleSignOut = async () => {
    try {
      console.log("About page: Starting logout process...");
      await logout();
      console.log("About page: Logout completed, redirecting to home...");
      router.push("/");
      // Force page refresh to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("About page: Logout process error:", error);
      // Force logout even if there's an error
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) {
      return;
    }

    if (!notification.is_read) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
        setUnreadNotifications((prev) => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate to customer page with appropriate tab
    if (notification.order_id) {
      router.push("/components/customer?tab=orders");
    } else {
      router.push("/components/customer?tab=notifications");
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16 md:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M3 6H21M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
              <Link
                href="/"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                Products
              </Link>
              <Link
                href="/components/about"
                className="text-green-600 font-semibold"
              >
                About
              </Link>
            </div>

            {/* Right Side - Auth Buttons */}
            <div className="flex items-center gap-4 ml-auto">
              {loading ? null : isAuthenticated && user ? (
                <>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setNotificationDropdownOpen((prev) => !prev);
                        setMenuOpen(false);
                      }}
                      className="relative p-2 text-green-600 hover:text-green-700 transition-colors"
                      aria-label="Notifications"
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadNotifications > 99 ? "99+" : unreadNotifications}
                        </span>
                      )}
                    </button>
                    <NotificationDropdown
                      notifications={notifications}
                      unreadCount={unreadNotifications}
                      onNotificationClick={handleNotificationClick}
                      onSeeAll={() => router.push("/components/customer?tab=notifications")}
                      isOpen={notificationDropdownOpen}
                      onToggle={() => setNotificationDropdownOpen((prev) => !prev)}
                      onClose={() => setNotificationDropdownOpen(false)}
                    />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setMenuOpen((prev) => !prev);
                        setNotificationDropdownOpen(false);
                      }}
                      className="p-2 text-green-600 hover:text-green-700 transition-colors"
                      aria-label="Open menu"
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                        <Link
                          href="/components/customer?tab=profile"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Personal Info
                        </Link>
                        <Link
                          href="/components/customer?tab=orders"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Orders
                        </Link>
                        <Link
                          href="/components/customer?tab=notifications"
                          className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          <span>Notifications</span>
                          {unreadNotifications > 0 && (
                            <span className="min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {unreadNotifications > 99 ? "99+" : unreadNotifications}
                            </span>
                          )}
                        </Link>
                        <Link
                          href="/products"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Products
                        </Link>
                        <Link
                          href="/components/customer?tab=addresses"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Addresses
                        </Link>
                        <Link
                          href="/components/customer?tab=settings"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleSignOut();
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:block px-6 py-2.5 text-green-600 font-semibold hover:text-green-700 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="absolute top-0 left-0 w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            About
            <span className="block bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent">
              ShopMart
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to revolutionize online shopping by providing
            quality products, exceptional service, and unbeatable value to
            customers worldwide.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "10+", label: "Years in Business" },
              { number: "1M+", label: "Happy Customers" },
              { number: "50k+", label: "Products" },
              { number: "150+", label: "Countries Served" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values Tabs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            {[
              { id: "mission", label: "Our Mission" },
              { id: "vision", label: "Our Vision" },
              { id: "values", label: "Our Values" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:shadow-md"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-xl">
            {activeTab === "mission" && (
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Our Mission
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To empower people around the world to shop smarter and live
                  better by providing access to quality products at affordable
                  prices, backed by exceptional customer service and a seamless
                  shopping experience.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  We believe that everyone deserves access to the products they
                  need and love, without compromising on quality or breaking the
                  bank.
                </p>
              </div>
            )}

            {activeTab === "vision" && (
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Our Vision
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To become the world's most trusted and customer-centric
                  e-commerce platform, where people can discover, explore, and
                  purchase anything they need with confidence.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  We envision a future where online shopping is not just
                  convenient, but also sustainable, inclusive, and enriching for
                  communities worldwide.
                </p>
              </div>
            )}

            {activeTab === "values" && (
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Our Values
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[
                    {
                      title: "Customer First",
                      desc: "Every decision we make starts with our customers in mind",
                    },
                    {
                      title: "Quality",
                      desc: "We never compromise on the quality of products and service",
                    },
                    {
                      title: "Innovation",
                      desc: "Continuously improving and embracing new technologies",
                    },
                    {
                      title: "Integrity",
                      desc: "Honest, transparent, and ethical in all our dealings",
                    },
                    {
                      title: "Sustainability",
                      desc: "Committed to environmental and social responsibility",
                    },
                    {
                      title: "Teamwork",
                      desc: "Collaboration and mutual respect drive our success",
                    },
                  ].map((value, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">
                          {value.title}
                        </h4>
                        <p className="text-gray-600">{value.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600">
              The passionate people behind ShopMart
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              {
                name: "Md. Samiul Alim",
                role: "CEO & Founder",
                color: "from-purple-500 to-purple-600",
              },
              {
                name: "Md. Faisal Abid",
                role: "CTO",
                color: "from-blue-500 to-blue-600",
              },
              {
                name: "Md.Sajedul Karim Munna",
                role: "Developer",
                color: "from-pink-500 to-pink-600",
              },
            ].map((member, index) => (
              <div
                key={index}
                className="group text-center w-full sm:w-[calc(50%-1rem)] lg:w-64"
              >
                <div
                  className={`w-48 h-48 mx-auto mb-6 bg-gradient-to-br ${member.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:scale-105 transition-all`}
                >
                  <svg
                    className="w-24 h-24 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Join Our Journey
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Be part of our growing community and experience the future of online
            shopping
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-green-600 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Get Started Today
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Explore Products
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 2L3 6V20c0 1.1.9 2 2 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18" />
                  </svg>
                </div>
                <span className="text-2xl font-bold">ShopMart</span>
              </div>
              <p className="text-gray-400">
                Your trusted destination for quality products at unbeatable
                prices.
              </p>
            </div>

            {[
              {
                title: "Shop",
                links: [
                  "All Categories",
                  "Featured Products",
                  "Special Deals",
                  "New Arrivals",
                ],
              },
              {
                title: "Company",
                links: ["About Us", "Careers", "Press", "Contact"],
              },
              {
                title: "Support",
                links: ["Help Center", "Shipping", "Returns", "Privacy"],
              },
            ].map((column, index) => (
              <div key={index}>
                <h4 className="text-lg font-bold mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((link, i) => (
                    <li key={i}>
                      <a
                        href="#"
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              &copy; 2026 ShopMart. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
