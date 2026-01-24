"use client"

import { useEffect, useState } from "react"

export function AnimatedBackground() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated geometric shapes */}
            <div className="absolute inset-0 opacity-20">
                {/* Floating Squares */}
                <div className="absolute top-1/4 left-1/4 w-24 h-24 border-2 border-slate-400 rounded-lg animate-[spin_10s_linear_infinite]" />
                <div className="absolute top-3/4 left-3/4 w-32 h-32 border border-slate-500 rounded-full animate-[bounce_8s_infinite]" />
                <div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-slate-600 rotate-45 animate-[pulse_6s_infinite]" />

                {/* Moving Lines/Grid effect */}
                <div className="absolute inset-0"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                        animation: 'pan 20s linear infinite'
                    }}
                />

                {/* Glowing orbs */}
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-[pulse_8s_infinite]" />
                <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-[pulse_12s_infinite]" />
            </div>

            <style jsx>{`
        @keyframes pan {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
      `}</style>
        </div>
    )
}
