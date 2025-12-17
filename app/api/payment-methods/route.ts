import { NextResponse } from "next/server"

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET() {
    try {
        console.log("[v0] Server API: Fetching payment methods from gestaoclick")

        const response = await fetch("https://api.gestaoclick.com/formas_pagamentos", {
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
        console.log(`[v0] Server API: Payment methods response data:`, data)

        return NextResponse.json(data)
    } catch (error) {
        console.error("[v0] Server API: Error in GET /api/payment-methods:", error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
