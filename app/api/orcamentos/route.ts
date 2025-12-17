import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json()

    console.log(`[v0] Server API: Creating quote:`, quoteData)

    const response = await fetch(`${API_BASE_URL}/orcamentos`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "access-token": ACCESS_TOKEN,
        "secret-access-token": SECRET_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quoteData),
    })

    console.log(`[v0] Server API: Quote response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Server API: Quote error:`, errorText)
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const contentType = response.headers.get("content-type")
    console.log(`[v0] Server API: Response content-type: ${contentType}`)

    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text()
      console.log(`[v0] Server API: Non-JSON response received:`, responseText.substring(0, 200))

      // Try to extract meaningful error from HTML response
      if (responseText.includes("<pre class")) {
        return NextResponse.json(
          {
            error: "API retornou resposta inválida. Verifique os dados enviados.",
          },
          { status: 422 },
        )
      }

      return NextResponse.json(
        {
          error: "Resposta inesperada da API externa",
        },
        { status: 502 },
      )
    }

    const data = await response.json()
    console.log(`[v0] Server API: Quote response:`, data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Server API: Error in POST /api/orcamentos:", error)

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("cliente_id")

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente ID é obrigatório" }, { status: 400 })
    }

    console.log(`[v0] Server API: Fetching quotes for customer: ${clienteId}`)

    const response = await fetch(`${API_BASE_URL}/orcamentos?cliente_id=${clienteId}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "access-token": ACCESS_TOKEN,
        "secret-access-token": SECRET_ACCESS_TOKEN,
      },
    })

    console.log(`[v0] Server API: Customer quotes response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Server API: Customer quotes error:`, errorText)
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log(`[v0] Server API: Customer quotes response:`, data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Server API: Error in GET /api/orcamentos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
