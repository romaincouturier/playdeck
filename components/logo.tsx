import Image from 'next/image'

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Image
        src="/logo.jpg"
        alt="SuperTilt Logo"
        width={1580}
        height={530}
        className="h-full w-auto object-contain"
        priority
      />
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
