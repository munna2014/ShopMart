"use client";

import { useState, useEffect } from "react";

export default function DiscountCountdown({ endDate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endDate) return;

    const calculateTimeLeft = () => {
      // Get current time in Bangladesh timezone (Asia/Dhaka, UTC+6)
      const now = new Date();
      const dhakaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
      
      // End date is stored in Bangladesh timezone from backend
      const end = new Date(endDate);
      
      const difference = end.getTime() - dhakaTime.getTime();

      if (difference <= 0) {
        return null;
      }

      const months = Math.floor(difference / (1000 * 60 * 60 * 24 * 30));
      const days = Math.floor((difference % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { months, days, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (!newTimeLeft) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.months === 0 && timeLeft.days === 0 && timeLeft.hours < 1;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isUrgent ? 'text-red-600 bg-red-50 animate-pulse' : 'text-orange-600 bg-orange-50'} px-2 py-1.5 rounded-md`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <div className="flex items-center gap-1 font-medium">
        {timeLeft.months > 0 && (
          <span className="bg-white/60 px-1 rounded">{timeLeft.months}m</span>
        )}
        {(timeLeft.months > 0 || timeLeft.days > 0) && (
          <span className="bg-white/60 px-1 rounded">{timeLeft.days}d</span>
        )}
        <span className="bg-white/60 px-1 rounded">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="bg-white/60 px-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="bg-white/60 px-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
