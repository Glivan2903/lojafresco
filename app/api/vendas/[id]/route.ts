import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params

        if (!id) {
            return NextResponse.json({ error: "Order ID é obrigatório" }, { status: 400 })
        }

        console.log(`[v0] Server API: Fetching sale details for ID: ${id}`)

        const response = await fetch(`${API_BASE_URL}/vendas/${id}`, {
            method: "GET",
            headers: {
                accept: "application/json",
                "access-token": ACCESS_TOKEN,
                "secret-access-token": SECRET_ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
        })

        console.log(`[v0] Server API: Sale detail response status: ${response.status}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.log(`[v0] Server API: Sale detail error:`, errorText)
            return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
        }

        const contentType = response.headers.get("content-type")
        console.log(`[v0] Server API: Sale detail content-type: ${contentType}`)

        if (!contentType || !contentType.includes("application/json")) {
            const responseText = await response.text()
            console.log(`[v0] Server API: Non-JSON response received:`, responseText.substring(0, 200))
            return NextResponse.json(
                {
                    error: "Resposta inesperada da API externa",
                },
                { status: 502 },
            )
        }

        const data = await response.json()
        console.log(`[v0] Server API: Sale detail response:`, data)

        return NextResponse.json(data)
    } catch (error) {
        console.error(`[v0] Server API: Error in GET /api/vendas/${params?.id}:`, error)

        if (error instanceof SyntaxError && error.message.includes("JSON")) {
            return NextResponse.json(
                {
                    error: "Erro ao processar resposta da API externa",
                },
                { status: 502 },
            )
        }

        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
