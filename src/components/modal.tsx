"use client";

export default function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-400/80 text-sm text-gray-800">
      <div className="flex flex-col gap-2 p-4 rounded-md bg-white">
        {children}
      </div>
    </div>
  )
}
