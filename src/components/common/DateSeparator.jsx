const DateSeparator = ({ label }) => {
  if (!label) return null

  return (
    <div className="my-3 flex items-center justify-center select-none">
      <span className="text-[11px] font-medium text-[#52656A] dark:text-[#A5C9CA]/80">
        {label}
      </span>
    </div>
  )
}

export default DateSeparator
