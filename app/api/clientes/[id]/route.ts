import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id
        if (!id) {
            return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
        }

        const customerData = await request.json()
        console.log(`[v0] Server API: Updating customer ${id}:`, customerData)

        const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
            method: "PUT",
            headers: {
                accept: "application/json",
                "access-token": ACCESS_TOKEN,
                "secret-access-token": SECRET_ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(customerData),
        })

        console.log(`[v0] Server API: Update customer response status: ${response.status}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.log(`[v0] Server API: Update customer error:`, errorText)
            return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
        }

        const data = await response.json()
        console.log(`[v0] Server API: Update customer response:`, data)

        return NextResponse.json(data)
    } catch (error) {
        console.error(`[v0] Server API: Error in PUT /api/clientes/${params?.id}:`, error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
\n\nexport const dynamic = "force-dynamic"