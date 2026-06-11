export default function StatusBadge({ value, label }) {
  return <span className={`badge badge-${value}`}>{label || value}</span>;
}
