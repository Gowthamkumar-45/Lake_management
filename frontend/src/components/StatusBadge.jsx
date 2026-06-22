import React from 'react'

const STATUS_MAP = {
  // Water level status
  Full:    { bg: '#cff4f8', color: '#0891b2', dot: '#0891b2' },
  Medium:  { bg: '#fdeecb', color: '#d97706', dot: '#d97706' },
  Dry:     { bg: '#fde0e0', color: '#dc2626', dot: '#dc2626' },
  // Work status
  Completed:    { bg: '#d8f3e2', color: '#15803d', dot: '#15803d' },
  'In Progress':{ bg: '#dbe7fe', color: '#1d4ed8', dot: '#1d4ed8' },
  Pending:      { bg: '#fbeecb', color: '#9a6207', dot: '#9a6207' },
  Delayed:      { bg: '#fde0e0', color: '#b91c1c', dot: '#b91c1c' },
  // Renovation status
  'Under Renovation':   { bg: '#dbe7fe', color: '#1d4ed8', dot: '#1d4ed8' },
  'Renovation Complete':{ bg: '#d8f3e2', color: '#15803d', dot: '#15803d' },
  'Renovation Pending': { bg: '#fbeecb', color: '#9a6207', dot: '#9a6207' },
  Encroachment:         { bg: '#fde0e0', color: '#b91c1c', dot: '#b91c1c' },
  Disappeared:          { bg: '#eef2f6', color: '#475569', dot: '#475569' },
  // User/maintenance status
  Active:    { bg: '#d8f3e2', color: '#15803d', dot: '#15803d' },
  'On leave':{ bg: '#fbeecb', color: '#9a6207', dot: '#d97706' },
  Inactive:  { bg: '#eef2f6', color: '#475569', dot: '#94a3b8' },
  Scheduled: { bg: '#dbe7fe', color: '#1d4ed8', dot: '#1d4ed8' },
  Overdue:   { bg: '#fde0e0', color: '#b91c1c', dot: '#b91c1c' },
}

export default function StatusBadge({ status, size = 'sm', dot = true }) {
  const style = STATUS_MAP[status] || { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' }
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: style.dot }}
        />
      )}
      {status}
    </span>
  )
}
