"use client";

import { useState, useEffect } from "react";
import SessionDataSkeleton from "./SessionDataSkeleton";

interface SessionData {
  lastSessionDate?: string;
  lastSessionScore?: number;
  lastSessionSummary?: string;
}

interface SessionDataDisplayProps extends SessionData {
  companionId: string;
  variant?: "card" | "table";
  enableProgressiveLoading?: boolean;
}

const SessionDataDisplay = ({ 
  companionId, 
  lastSessionDate, 
  lastSessionScore, 
  lastSessionSummary,
  variant = "card",
  enableProgressiveLoading = true 
}: SessionDataDisplayProps) => {
  const [isLoading, setIsLoading] = useState(enableProgressiveLoading);
  const [sessionData, setSessionData] = useState<SessionData>({
    lastSessionDate,
    lastSessionScore,
    lastSessionSummary
  });

  useEffect(() => {
    if (!enableProgressiveLoading) {
      setIsLoading(false);
      return;
    }

    // Simulate progressive loading - in real app this would fetch from API
    const timer = setTimeout(() => {
      setSessionData({
        lastSessionDate,
        lastSessionScore,
        lastSessionSummary
      });
      setIsLoading(false);
    }, Math.random() * 1000 + 500); // Random delay 500-1500ms

    return () => clearTimeout(timer);
  }, [companionId, lastSessionDate, lastSessionScore, lastSessionSummary, enableProgressiveLoading]);

  if (isLoading) {
    return <SessionDataSkeleton variant={variant} />;
  }

  // No session data available
  if (!sessionData.lastSessionDate && !sessionData.lastSessionScore && !sessionData.lastSessionSummary) {
    if (variant === "table") {
      return <span className="text-gray-400 text-sm">No sessions yet</span>;
    }
    return null;
  }

  // Render session data based on variant
  if (variant === "table") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{sessionData.lastSessionDate}</span>
          {sessionData.lastSessionScore && (
            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
              sessionData.lastSessionScore >= 85 ? 'bg-green-100 text-green-800' :
              sessionData.lastSessionScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {sessionData.lastSessionScore}/100
            </div>
          )}
        </div>
        {sessionData.lastSessionSummary && (
          <p className="text-xs text-gray-500 max-w-xs truncate">{sessionData.lastSessionSummary}</p>
        )}
      </div>
    );
  }

  // Card variant
  return (
    <div className="mt-3 p-2 bg-white/20 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">Last Session:</span>
        {sessionData.lastSessionScore && (
          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
            sessionData.lastSessionScore >= 85 ? 'bg-green-100 text-green-800' :
            sessionData.lastSessionScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {sessionData.lastSessionScore}/100
          </div>
        )}
      </div>
      <p className="text-xs opacity-80">{sessionData.lastSessionDate}</p>
      {sessionData.lastSessionSummary && (
        <p className="text-xs mt-1 opacity-90 line-clamp-2">{sessionData.lastSessionSummary}</p>
      )}
    </div>
  );
};

export default SessionDataDisplay;