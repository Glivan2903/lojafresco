"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  FileText,
  ArrowLeft,
  AlertTriangle,
  ShoppingBag,
  Printer,
} from "lucide-react"
import type { Customer, Product } from "@/lib/api"

interface QuoteItem {
  product: Product
  quantity: number
  subtotal: number
}

interface QuoteManagementProps {
  customer: Customer
  quoteItems: QuoteItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onBackToProducts: () => void
  onSubmitQuote: (observations: string) => Promise<void>
  onProceedToOrder: () => void
}

export function QuoteManagement({
  customer,
  quoteItems,
  onUpdateQuantity,
  onRemoveItem,
  onBackToProducts,
  onSubmitQuote,
  onProceedToOrder,
}: QuoteManagementProps) {
  const [observations, setObservations] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const router = useRouter()

  const formatPrice = (product: Product) => {
    const price = product.valor_venda || product.preco_venda || product.preco
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price
    if (!numPrice || isNaN(numPrice)) {
      return 0
    }
    return numPrice
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const calculateTotal = () => {
    return quoteItems.reduce((total, item) => {
      const price = formatPrice(item.product)
      return total + price * item.quantity
    }, 0)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError("")

    try {
      await onSubmitQuote(observations)
    } catch (error) {
      console.error("Failed to submit quote:", error)
      setSubmitError(error instanceof Error ? error.message : "Erro ao enviar orçamento. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateQuoteText = () => {
    const total = calculateTotal()
    let text = `*PEDIDO - ICORE SYSTEM*\n\n`

    // Customer Data
    text += `*DADOS DO CLIENTE*\n`
    text += `Nome: ${customer.nome}\n`
    text += `Telefone: ${customer.telefone || "Não informado"}\n`
    if (customer.endereco && (customer.endereco.rua || customer.endereco.cep)) {
      const end = customer.endereco
      text += `Endereço: ${end.rua}, ${end.numero} - ${end.bairro}, ${end.cidade}/${end.estado}\n`
    } else {
      text += `Endereço: Não cadastrado\n`
    }
    text += `\n`

    // Products
    text += `*PRODUTOS ESCOLHIDOS*\n`
    quoteItems.forEach((item) => {
      const price = formatPrice(item.product)
      const stock = getAvailableStock(item.product)
      // Reference: QuantityChosen # Stock
      const obfuscatedStock = `${item.quantity}#${stock}`

      text += `--------------------------------\n`
      text += `Cód: ${item.product.codigo_interno || item.product.id}\n`
      text += `Item: ${item.product.nome}\n`
      text += `Valor: ${formatCurrency(price)}\n`
      text += `Qtd: ${item.quantity}\n`
      text += `Ref: ${obfuscatedStock}\n`
    })
    text += `--------------------------------\n\n`

    text += `*TOTAL GERAL:* ${formatCurrency(total)}\n\n`

    // Delivery and Payment (Placeholders since not selected in this screen)
    text += `*FORMA DE RETIRADA*\n`
    text += `( ) Entrega\n`
    text += `( ) Retirar na Loja\n\n`

    text += `*FORMA DE PAGAMENTO*\n`
    text += `A definir\n\n`

    if (observations) {
      text += `*OBSERVAÇÕES*\n${observations}\n`
    }

    return text
  }

  const shareViaWhatsApp = () => {
    const text = generateQuoteText()
    const encodedText = encodeURIComponent(text)
    const whatsappUrl = `https://wa.me/5579998130038?text=${encodedText}`
    window.open(whatsappUrl, "_blank")
  }

  const printQuote = () => {
    const total = calculateTotal()

    const printData = {
      customer,
      items: quoteItems,
      observations,
      total,
    }

    sessionStorage.setItem("printQuoteData", JSON.stringify(printData))

    router.push("/print-quote")
  }

  const getAvailableStock = (product: Product) => {
    const stock = product.estoque || product.estoque_atual || 0
    const numStock = typeof stock === "string" ? Number.parseFloat(stock) : stock
    return numStock || 0
  }

  if (quoteItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <div className="space-y-2">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Orçamento Vazio</h2>
            <p className="text-sm text-muted-foreground">Você ainda não adicionou nenhum produto ao seu orçamento.</p>
          </div>
          <Button onClick={onBackToProducts}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Produtos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Seu Orçamento</h2>
            <p className="text-sm text-muted-foreground">Revise os itens e finalize seu pedido</p>
          </div>
          <Button variant="outline" size="sm" onClick={onBackToProducts}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continuar Comprando
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quote Items */}
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="w-4 h-4" />
                  Itens do Orçamento ({quoteItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quoteItems.map((item, index) => {
                  const price = formatPrice(item.product)
                  const subtotal = price * item.quantity

                  return (
                    <div key={item.product.id}>
                      <div className="flex gap-3">
                        <div className="w-15 h-15 bg-muted rounded-lg overflow-hidden shrink-0">
                          <img
                            src={item.product.imagem || "/placeholder.svg?height=60&width=60&query=product"}
                            alt={item.product.nome}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-sm line-clamp-2 leading-tight">{item.product.nome}</h4>
                              {item.product.nome_grupo && (
                                <Badge variant="secondary" className="mt-1 text-xs capitalize">
                                  {item.product.nome_grupo.toLowerCase()}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.product.id)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= getAvailableStock(item.product)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">{formatCurrency(price)} cada</div>
                              <div className="font-bold text-sm text-primary">{formatCurrency(subtotal)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < quoteItems.length - 1 && <Separator className="mt-3" />}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Summary and Actions */}
          <div className="space-y-3">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="text-sm font-medium">{customer.nome}</p>
                </div>
                {customer.cpf && (
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="text-sm font-medium">{customer.cpf}</p>
                  </div>
                )}
                {customer.cnpj && (
                  <div>
                    <Label className="text-xs text-muted-foreground">CNPJ</Label>
                    <p className="text-sm font-medium">{customer.cnpj}</p>
                  </div>
                )}
                {customer.telefone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="text-sm font-medium">{customer.telefone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo do Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {quoteItems.map((item) => {
                    const price = formatPrice(item.product)
                    const subtotal = price * item.quantity

                    return (
                      <div key={item.product.id} className="flex justify-between text-xs">
                        <span className="truncate mr-2">
                          {item.quantity}x {item.product.nome}
                        </span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                    )
                  })}
                </div>

                <Separator />

                <div className="flex justify-between items-center text-base font-bold">
                  <span>Total Geral</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            {/* Observations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Observações</CardTitle>
                <CardDescription className="text-xs">Adicione informações adicionais sobre seu pedido</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ex: Prazo de entrega, especificações técnicas, etc."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            {/* Error Display */}
            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button onClick={onProceedToOrder} className="w-full">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Enviar Pedido a Loja
              </Button>

              <Button onClick={printQuote} variant="outline" className="w-full bg-transparent">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Orçamento
              </Button>

              <Button variant="outline" onClick={shareViaWhatsApp} className="w-full bg-transparent">
                <FileText className="w-4 h-4 mr-2" />
                Compartilhar via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
