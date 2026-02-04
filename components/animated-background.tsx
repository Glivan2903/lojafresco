"use client"

import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"
import type { Container, Engine, ISourceOptions } from "@tsparticles/engine"

export function AnimatedBackground() {
    const [init, setInit] = useState(false)

    // Initialize the particles engine once
    useEffect(() => {
        initParticlesEngine(async (engine: Engine) => {
            await loadSlim(engine)
        }).then(() => {
            setInit(true)
        })
    }, [])

    const options: ISourceOptions = useMemo(
        () => ({
            background: {
                color: {
                    value: "#fdb913", // Brand Yellow
                },
            },
            fpsLimit: 120,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: "grab",
                    },
                },
                modes: {
                    grab: {
                        distance: 140,
                        links: {
                            opacity: 1,
                        },
                    },
                },
            },
            particles: {
                color: {
                    value: "#ffffff", // Lighter/White particles
                },
                links: {
                    color: "#ffffff",
                    distance: 150,
                    enable: true,
                    opacity: 0.3,
                    width: 1,
                },
                move: {
                    direction: "none",
                    enable: true,
                    outModes: {
                        default: "bounce",
                    },
                    random: false,
                    speed: 1.5,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 800,
                    },
                    value: 80,
                },
                opacity: {
                    value: 0.5,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 3 },
                },
            },
            detectRetina: true,
        }),
        [],
    )

    if (!init) {
        return (
            <div className="fixed inset-0 z-[-1] bg-[#fdb913]" /> // Fallback placeholder
        )
    }

    return (
        <div className="fixed inset-0 z-[-1]">
            <Particles
                id="tsparticles"
                options={options}
                className="absolute inset-0"
            />
        </div>
    )
}
