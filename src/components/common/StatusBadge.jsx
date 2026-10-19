import React from "react"

const StatusBadge = ({
  status = "offline",
  size = "sm",
  showLabel = false,
  className = "",
}) => {
  const normalized = ["active", "away", "offline"].includes(status)
    ? status
    : "offline"

  const sizeClasses = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  }

  const dotColors = {
    active: "bg-emerald-500",
    away: "bg-amber-500",
    offline: "bg-gray-400 dark:bg-gray-500",
  }

  const statusLabels = {
    active: "Active",
    away: "Away",
    offline: "Offline",
  }

  const dot = (
    <span
      className={`inline-block rounded-full ${sizeClasses[size] || sizeClasses.sm} ${
        dotColors[normalized]
      } ring-2 ring-white dark:ring-[#1E2525] shrink-0 ${className}`}
      title={statusLabels[normalized]}
      aria-label={statusLabels[normalized]}
    />
  )

  if (!showLabel) {
    return dot
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#52656A] dark:text-[#A5C9CA] select-none">
      {dot}
      <span className="capitalize">{statusLabels[normalized]}</span>
    </span>
  )
}

export default StatusBadge
