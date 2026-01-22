import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function POST(request: NextRequest) {
    try {
        const saleData = await request.json()

        console.log(`[v0] Server API: Creating sale:`, saleData)

        // Using /vendas endpoint based on assumption. If this fails, we might need to stick to /orcamentos or check documentation.
        const response = await fetch(`${API_BASE_URL}/vendas`, {
            method: "POST",
            headers: {
                accept: "application/json",
                "access-token": ACCESS_TOKEN,
                "secret-access-token": SECRET_ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(saleData),
        })

        console.log(`[v0] Server API: Sale response status: ${response.status}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.log(`[v0] Server API: Sale error:`, errorText)
            return NextResponse.json({ error: `API Error: ${response.status} - ${errorText}` }, { status: response.status })
        }

        const contentType = response.headers.get("content-type")
        console.log(`[v0] Server API: Response content-type: ${contentType}`)

        if (!contentType || !contentType.includes("application/json")) {
            const responseText = await response.text()
            console.log(`[v0] Server API: Non-JSON response received:`, responseText.substring(0, 200))

            // Fallback: If HTML error, return appropriate status
            if (responseText.includes("<pre class")) {
                return NextResponse.json({ error: "API retornou resposta inválida." }, { status: 422 })
            }
            return NextResponse.json({ error: "Resposta inesperada da API externa" }, { status: 502 })
        }

        const data = await response.json()
        console.log(`[v0] Server API: Sale response:`, data)

        return NextResponse.json(data)
    } catch (error) {
        console.error("[v0] Server API: Error in POST /api/vendas:", error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
