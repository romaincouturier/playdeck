export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 1580 530"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
      >
        {/* Super en anthracite */}
        <text
          x="0"
          y="400"
          fontSize="320"
          fontWeight="700"
          fill="currentColor"
          className="text-st-anthracite"
        >
          Super
        </text>

        {/* Tilt en anthracite avec le T incliné */}
        <text
          x="900"
          y="400"
          fontSize="320"
          fontWeight="700"
          fill="currentColor"
          className="text-st-anthracite"
          transform="skewX(-10)"
        >
          Tilt
        </text>
      </svg>
    </div>
  )
}

export function LogoMini({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      className={`${className} bg-st-yellow rounded-lg flex items-center justify-center font-bold text-st-anthracite`}
    >
      <span className="text-2xl">T</span>
    </div>
  )
}
