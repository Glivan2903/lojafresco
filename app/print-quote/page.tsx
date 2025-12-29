"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import type { Customer, Product } from "@/lib/api"

interface QuoteItem {
  product: Product
  quantity: number
  subtotal: number
}

export default function PrintQuotePage() {
  const searchParams = useSearchParams()
  const [quoteData, setQuoteData] = useState<{
    customer: Customer
    items: QuoteItem[]
    observations: string
    total: number
  } | null>(null)

  useEffect(() => {
    try {
      const storedQuoteData = sessionStorage.getItem("printQuoteData")
      if (storedQuoteData) {
        setQuoteData(JSON.parse(storedQuoteData))
        sessionStorage.removeItem("printQuoteData")
      }
    } catch (error) {
      console.error("Error loading quote data:", error)
    }
  }, [])

  useEffect(() => {
    if (quoteData) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [quoteData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatPrice = (product: Product) => {
    const price = product.valor_venda || product.preco_venda || product.preco
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price
    return numPrice && !isNaN(numPrice) ? numPrice : 0
  }

  if (!quoteData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Carregando orçamento...</h2>
          <p className="text-muted-foreground">Preparando página para impressão</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 print:p-0">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="text-center border-b border-gray-800 pb-3 mb-4">
          <div className="flex justify-center mb-2">
            <Image src="/icore-logo.png" alt="icore" width={180} height={48} className="h-12 w-auto" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">ORÇAMENTO</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-left space-y-1">
              <p>
                <strong>Icore</strong>
              </p>
              <p>
                Rua da paz N: 92, Bairro: Pirajá
              </p>
              <p>
                Juazeiro do Norte - CE
              </p>
              <p>
                <strong>Tel:</strong> (88) 8863-8990
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")} | <strong>Nº:</strong> ORC-
                {Date.now().toString().slice(-6)}
              </p>
              <p className="text-yellow-600 font-semibold">
                <strong>Validade:</strong> 15 dias
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-300 p-2">
            <h3 className="text-sm font-bold mb-2 text-gray-800">CLIENTE</h3>
            <div className="space-y-1 text-xs">
              <p>
                <strong>Nome:</strong> {quoteData.customer.nome}
              </p>
              {quoteData.customer.cpf && (
                <p>
                  <strong>CPF:</strong> {quoteData.customer.cpf}
                </p>
              )}
              {quoteData.customer.cnpj && (
                <p>
                  <strong>CNPJ:</strong> {quoteData.customer.cnpj}
                </p>
              )}
              {quoteData.customer.telefone && (
                <p>
                  <strong>Tel:</strong> {quoteData.customer.telefone}
                </p>
              )}
            </div>
          </div>

          <div className="border border-gray-300 p-2">
            <h3 className="text-sm font-bold mb-2 text-gray-800">VENDEDOR & PAGAMENTO</h3>
            <div className="space-y-1 text-xs">
              <p>
                <strong>Vendedor:</strong> Alessandro
              </p>
              <p>
                <strong>Pagamento:</strong> A combinar
              </p>
              <p>
                <strong>Status:</strong> Pendente
              </p>
              <p>
                <strong>Qtd Total:</strong> {quoteData.items.reduce((sum, item) => sum + item.quantity, 0)} itens
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <h3 className="text-sm font-bold mb-2 text-gray-800">PRODUTOS</h3>
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-1 text-left font-bold">PRODUTO</th>
                <th className="border border-gray-400 px-2 py-1 text-center font-bold w-12">QTD</th>
                <th className="border border-gray-400 px-2 py-1 text-right font-bold w-20">UNIT.</th>
                <th className="border border-gray-400 px-2 py-1 text-right font-bold w-24">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {quoteData.items.map((item, index) => {
                const price = formatPrice(item.product)
                const subtotal = price * item.quantity

                return (
                  <tr key={item.product.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border border-gray-400 px-2 py-1">
                      <p className="font-semibold">{item.product.nome}</p>
                      {item.product.codigo_interno && (
                        <p className="text-gray-500">Cód: {item.product.codigo_interno}</p>
                      )}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-center font-semibold">{item.quantity}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{formatCurrency(price)}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right font-bold">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-3">
          <div className="w-64 border-2 border-yellow-600 bg-yellow-50 p-3">
            <div className="flex justify-between text-lg font-bold text-yellow-800">
              <span>TOTAL GERAL:</span>
              <span>{formatCurrency(quoteData.total)}</span>
            </div>
          </div>
        </div>

        {quoteData.observations && (
          <div className="mb-3">
            <h3 className="text-sm font-bold mb-1 text-gray-800">OBSERVAÇÕES</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-2">
              <p className="text-xs whitespace-pre-wrap">{quoteData.observations}</p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-800 pt-2">
          <div className="bg-yellow-50 border-l-2 border-yellow-500 p-2 mb-2">
            <p className="text-xs font-bold text-yellow-700">
              ⚠️ VALIDADE: 15 dias | Preços sujeitos a alteração após vencimento
            </p>
          </div>
          <div className="text-xs text-gray-700 space-y-1">
            <p>• Prazo de entrega acordado após confirmação • Produtos sob encomenda não são trocáveis</p>
            <p>• Garantia conforme fabricante • Frete e instalação orçados separadamente</p>
            <p>• Orçamento não constitui reserva até aprovação formal</p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-600 border-t border-gray-300 pt-2">
          <p>
            <strong>ICORE</strong> | Tel: (88) 8863-8990 | Endereço: Rua da paz N: 92, Juazeiro do Norte - CE
          </p>
          <p>Seg e Sex: 08:00 às 18:00 | Sáb: 08 às 13 | Gerado em {new Date().toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 10px;
            line-height: 1.3;
          }
          
          .print\\\\:p-0 {
            padding: 0 !important;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .bg-pink-50, .bg-yellow-50, .bg-red-50, .bg-gray-50, .bg-gray-200 {
            background-color: #f8f9fa !important;
          }
          
          .border-pink-600, .border-pink-500, .border-gray-800, .border-yellow-600, .border-yellow-500 {
            border-color: #333 !important;
          }
          
          .text-pink-600, .text-pink-800, .text-pink-700, .text-yellow-600, .text-yellow-800, .text-yellow-700 {
            color: #333 !important;
          }
          
          h1, h2, h3 {
            page-break-after: avoid;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
