import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

export async function GET(request: NextRequest) {
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: {
                accept: "application/json",
                "access-token": ACCESS_TOKEN,
                "secret-access-token": SECRET_ACCESS_TOKEN,
            },
        })

        if (!response.ok) {
            return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error("Error fetching users:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
