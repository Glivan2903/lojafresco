import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cpfCnpj = searchParams.get("cpf_cnpj")
    const email = searchParams.get("email")

    if (!cpfCnpj && !email) {
      return NextResponse.json({ error: "CPF/CNPJ ou Email é obrigatório" }, { status: 400 })
    }

    let url = `${API_BASE_URL}/clientes`
    const queryParams = new URLSearchParams()

    if (cpfCnpj) {
      console.log(`[v0] Server API: Looking up customer with document: ${cpfCnpj}`)
      queryParams.append("cpf_cnpj", cpfCnpj)
    } else if (email) {
      console.log(`[v0] Server API: Looking up customer with email: ${email}`)
      queryParams.append("email", email)
    }

    url = `${url}?${queryParams.toString()}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "access-token": ACCESS_TOKEN,
        "secret-access-token": SECRET_ACCESS_TOKEN,
      },
    })

    console.log(`[v0] Server API: Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Server API: Error response:`, errorText)
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log(`[v0] Server API: Response data:`, data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Server API: Error in GET /api/clientes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const customerData = await request.json()

    console.log(`[v0] Server API: Creating customer:`, customerData)

    const response = await fetch(`${API_BASE_URL}/clientes`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "access-token": ACCESS_TOKEN,
        "secret-access-token": SECRET_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerData),
    })

    console.log(`[v0] Server API: Create customer response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Server API: Create customer error:`, errorText)
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log(`[v0] Server API: Create customer response:`, data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Server API: Error in POST /api/clientes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
