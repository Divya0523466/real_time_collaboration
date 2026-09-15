// converts the date into javascript date object
export const parseDate = (dateInput) => {
  if (!dateInput) return null
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  return isNaN(date.getTime()) ? null : date
}

// compares two different date with timezones
export const isSameDay = (d1, d2) => {
  const date1 = parseDate(d1)
  const date2 = parseDate(d2)
  if (!date1 || !date2) return false

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// formate the date label
export const formatMessageDate = (dateInput) => {
  const date = parseDate(dateInput)
  if (!date) return ""

  const now = new Date()

  // Compare calendar year, month, date in local time for Today
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return "Today"
  }

  // Exactly 1 calendar day before today in local time for Yesterday
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday"
  }

  // Older dates: format as "Month Day, Year" (e.g. September 8, 2026)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// formatting message timestamps into 12hour
export const formatMessageTime = (dateInput) => {
  const date = parseDate(dateInput)
  if (!date) return ""

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}
