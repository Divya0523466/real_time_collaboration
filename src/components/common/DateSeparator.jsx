const DateSeparator = ({ label }) => {
  if (!label) return null

  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-[#E0E7E6]" />
      </div>
      <div className="relative flex justify-center">
        <span className="rounded-full border border-[#E0E7E6] bg-white px-3.5 py-0.5 text-[11px] font-semibold text-[#52656A] shadow-xs select-none">
          {label}
        </span>
      </div>
    </div>
  )
}

export default DateSeparator
