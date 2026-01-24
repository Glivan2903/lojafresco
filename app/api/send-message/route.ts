
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { number, body } = await request.json()

        if (!number || !body) {
            return NextResponse.json(
                { error: "Number and body are required" },
                { status: 400 }
            )
        }

        // Format number: ensure it starts with 55 and has no non-digits
        const cleanNumber = number.replace(/\D/g, "")
        const formattedNumber = cleanNumber.startsWith("55")
            ? cleanNumber
            : `55${cleanNumber}`

        const response = await fetch("https://api.setesystem.com.br/api/messages/send", {
            method: "POST",
            headers: {
                "api-key": "ogGQGA05F2k8Ntt6if1NRBmZGm9i0xSfdn8tSHaL-H4",
                "Connection-Token": "icoresystem", // Updated token from user request
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                number: formattedNumber,
                body: body,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("Error sending message:", data)
            return NextResponse.json(
                { error: "Failed to send message", details: data },
                { status: response.status }
            )
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error("Internal server error sending message:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
