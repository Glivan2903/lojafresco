import { NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET() {
  try {
    console.log(`[v0] Server API: Fetching categories`)

    const response = await fetch(`${API_BASE_URL}/grupos_produtos`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "access-token": ACCESS_TOKEN,
        "secret-access-token": SECRET_ACCESS_TOKEN,
      },
    })

    console.log(`[v0] Server API: Categories response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Server API: Categories error:`, errorText)
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log(`[v0] Server API: Categories response:`, {
      total_categories: data.data?.length || 0,
    })

    return NextResponse.json({
      data: data.data || [],
      total_categorias: data.data?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Server API: Error in GET /api/categorias:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
