export function Legend({ levels }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {levels.map(({ id, label, color, textColor }) => (
        <span
          key={id}
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: color, color: textColor, minWidth: '80px', textAlign: 'center' }}
        >
          {label}
        </span>
      ))}
    </div>
  )
}
