const SessionDataSkeleton = ({ variant = "card" }: { variant?: "card" | "table" }) => {
  if (variant === "table") {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-gray-200 rounded"></div>
            <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-2 bg-white/20 rounded-lg animate-pulse">
      <div className="flex items-center justify-between mb-1">
        <div className="h-3 w-20 bg-white/30 rounded"></div>
        <div className="h-5 w-12 bg-white/30 rounded-full"></div>
      </div>
      <div className="h-2 w-16 bg-white/30 rounded mb-1"></div>
      <div className="h-2 w-full bg-white/30 rounded"></div>
      <div className="h-2 w-3/4 bg-white/30 rounded mt-1"></div>
    </div>
  );
};

export default SessionDataSkeleton;