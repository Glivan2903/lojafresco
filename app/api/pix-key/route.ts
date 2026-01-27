
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const response = await fetch("https://api.gestaoclick.com/clientes?cpf_cnpj=055.101.773-22", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "access-token": "d159d4d63936d5945b8774c7e5d4981bec044b63",
                "secret-access-token": "4cc7cb82fad18531c4834b243d31c99245adfa63"
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch PIX key: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Check if the response matches what we expect
        if (data.code === 200 && Array.isArray(data.data)) {
            // Iterate through all clients to find one with contacts
            for (const client of data.data) {
                if (Array.isArray(client.contatos) && client.contatos.length > 0) {
                    // Find the contact that is a PIX key
                    const pixContactWrapper = client.contatos.find((c: any) =>
                        c.contato && c.contato.nome_tipo === "Chave Pix"
                    )

                    if (pixContactWrapper) {
                        const contato = pixContactWrapper.contato
                        return NextResponse.json({
                            nome: contato.nome,
                            tipo: contato.cargo,
                            chave: contato.observacao
                        })
                    }
                }
            }
        }

        return NextResponse.json({ error: "No PIX key found" }, { status: 404 })

    } catch (error) {
        console.error("Error proxying PIX key request:", error)
        return NextResponse.json({ error: "Failed to fetch PIX key" }, { status: 500 })
    }
}
