import React from 'react'

export default function LevelBar({ level, status, showLabel = true }) {
  const color = status === 'Full' ? '#0891b2' : status === 'Medium' ? '#d97706' : '#dc2626'
  const bg = status === 'Full' ? '#cff4f8' : status === 'Medium' ? '#fdeecb' : '#fde0e0'

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: bg }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${level}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold w-9 text-right shrink-0" style={{ color }}>
          {level}%
        </span>
      )}
    </div>
  )
}
