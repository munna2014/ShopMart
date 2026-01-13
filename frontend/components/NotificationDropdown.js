"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function NotificationDropdown({ 
  notifications, 
  unreadCount, 
  onNotificationClick, 
  onSeeAll,
  isOpen,
  onToggle,
  onClose 
}) {
  const router = useRouter();
  const dropdownRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200); // Match the closing animation duration
  };

  // Get recent unread notifications only (last 5)
  const unreadNotifications = notifications.filter(notification => !notification.is_read);
  const recentNotifications = unreadNotifications.slice(0, 5);

  const formatNotificationTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_status':
      case 'order_update':
        return (
          <div className="w-8 h-8 bg-gradient-to-br  rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'payment':
      case 'payment_success':
      case 'payment_failed':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'promotion':
      case 'discount':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'system':
      case 'general':
      default:
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 transform transition-all duration-200 ease-out"
      style={{
        transformOrigin: 'top right',
        animation: isClosing 
          ? 'foldPaper 0.2s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards'
          : 'unfoldPaper 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      }}
    >
      <style jsx>{`
        @keyframes unfoldPaper {
          0% {
            transform: perspective(800px) rotateX(-90deg) rotateY(15deg) scale(0.8);
            opacity: 0;
            transform-origin: top right;
          }
          50% {
            transform: perspective(800px) rotateX(-20deg) rotateY(5deg) scale(0.95);
            opacity: 0.8;
          }
          100% {
            transform: perspective(800px) rotateX(0deg) rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes foldPaper {
          0% {
            transform: perspective(800px) rotateX(0deg) rotateY(0deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: perspective(800px) rotateX(-20deg) rotateY(5deg) scale(0.95);
            opacity: 0.8;
          }
          100% {
            transform: perspective(800px) rotateX(-90deg) rotateY(15deg) scale(0.8);
            opacity: 0;
          }
        }
        
        .paper-fold-shadow {
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .paper-crease {
          position: relative;
        }
        
        .paper-crease::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 50%);
          border-radius: 0 0 0 20px;
          pointer-events: none;
        }
        
        .notification-item {
          position: relative;
          transform-style: preserve-3d;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .notification-item:hover {
          transform: translateZ(10px) rotateX(2deg);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        @keyframes slideInPaper {
          0% {
            transform: perspective(400px) rotateX(-15deg) translateY(-15px);
            opacity: 0;
          }
          100% {
            transform: perspective(400px) rotateX(0deg) translateY(0px);
            opacity: 1;
          }
        }
        
        @keyframes slideOutPaper {
          0% {
            transform: perspective(400px) rotateX(0deg) translateY(0px);
            opacity: 1;
          }
          100% {
            transform: perspective(400px) rotateX(-15deg) translateY(-15px);
            opacity: 0;
          }
        }
      `}</style>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-500 to-emerald-500 paper-crease">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 text-xs font-bold bg-white/20 text-white rounded-full backdrop-blur-sm border border-white/30">
                {unreadCount} new
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {recentNotifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
              <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-800 mb-2">All caught up!</p>
            <p className="text-sm text-gray-500">No new notifications to show</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentNotifications.map((notification, index) => (
              <button
                key={notification.id}
                onClick={() => {
                  onNotificationClick(notification);
                  handleClose();
                }}
                className={`notification-item w-full px-6 py-4 text-left hover:bg-gray-50 transition-all duration-200 ${
                  !notification.is_read ? 'bg-gradient-to-r from-blue-50/80 to-green-50/80 border-l-4 border-green-500' : ''
                }`}
                style={{
                  animationDelay: `${index * 30}ms`,
                  animation: isClosing 
                    ? `slideOutPaper 0.15s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards ${(recentNotifications.length - index - 1) * 20}ms`
                    : `slideInPaper 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards ${index * 30}ms`
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`text-sm font-semibold text-gray-900 truncate ${
                        !notification.is_read ? 'font-bold text-gray-800' : ''
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2.5 h-2.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex-shrink-0 animate-pulse shadow-sm"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full inline-block">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={() => {
            onSeeAll();
            handleClose();
          }}
          className="w-full text-center py-3 px-4 text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
        >
          See all notifications
        </button>
      </div>
    </div>
  );
}