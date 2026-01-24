
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { number, body } = await request.json()
        console.log("Send Message Request:", { number, body })
        console.log("Send Message Request:", { number, body })

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

        // Bypass SSL check due to cert mismatch (ERR_TLS_CERT_ALTNAME_INVALID)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
        const response = await fetch(process.env.WHATSAPP_API_URL!, {
            method: "POST",
            headers: {
                "api-key": process.env.WHATSAPP_API_KEY!,
                "Connection-Token": process.env.WHATSAPP_CONNECTION_TOKEN!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                number: formattedNumber,
                body: body,
            }),
        })
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1"

        const data = await response.json()
        console.log("External API Response:", data)
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
