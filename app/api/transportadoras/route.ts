import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = "https://api.beteltecnologia.com" // Explicitly setting base URL as per request, or fall back to env if it matches
// actually the user said: https://api.beteltecnologia.com/transportadoras
// My env usually has API_BASE_URL. I'll use the env one if accessible, or hardcode if different.
// Checking previous file usage: `const API_BASE_URL = process.env.API_BASE_URL || ""`
// I'll stick to the pattern but ensure the endpoint is correct.

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET(request: NextRequest) {
    try {
        console.log(`[v0] Server API: Fetching transportadoras`)

        const response = await fetch(`${API_BASE_URL}/transportadoras`, {
            method: "GET",
            headers: {
                accept: "application/json",
                "access-token": ACCESS_TOKEN,
                "secret-access-token": SECRET_ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
        })

        console.log(`[v0] Server API: Transportadoras response status: ${response.status}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.log(`[v0] Server API: Transportadoras error:`, errorText)
            // Check if 404 or other expected error
            return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
        }

        const data = await response.json()
        // console.log(`[v0] Server API: Transportadoras response data:`, data) // Can be verbose

        return NextResponse.json(data)
    } catch (error) {
        console.error("[v0] Server API: Error in GET /api/transportadoras:", error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
