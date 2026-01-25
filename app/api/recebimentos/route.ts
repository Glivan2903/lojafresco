import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const queryString = searchParams.toString()
        const url = `${API_BASE_URL}/recebimentos?${queryString}`

        console.log(`[v0] Server API: Fetching receivables with params: ${queryString}`)

        const response = await fetch(url, {
            method: "GET",
            headers: {
                accept: "application/json",
                "access-token": ACCESS_TOKEN,
                "secret-access-token": SECRET_ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
        })

        console.log(`[v0] Server API: Receivables response status: ${response.status}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.log(`[v0] Server API: Receivables error:`, errorText)
            return NextResponse.json({ error: `API Error: ${response.status} - ${errorText}` }, { status: response.status })
        }

        const data = await response.json()
        // console.log(`[v0] Server API: Receivables response:`, data) // Can be large, maybe don't log typical success

        return NextResponse.json(data)
    } catch (error) {
        console.error("[v0] Server API: Error in GET /api/recebimentos:", error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
