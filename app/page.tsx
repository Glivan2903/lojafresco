"use client"

import { useState, useEffect } from "react"
import { CustomerIdentification } from "@/components/customer-identification"
import { ProductCatalog } from "@/components/product-catalog"
import { QuoteManagement } from "@/components/quote-management"
import { OrderForm, type OrderData } from "@/components/order-form"
import { Header } from "@/components/header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Check, Copy } from "lucide-react"
import { betelAPI, type Customer, type Product, type PaymentMethod } from "@/lib/api"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface QuoteItem {
  product: Product
  quantity: number
  subtotal: number
}

type AppState = "products" | "quote" | "order" | "quote-submitted" | "order-submitted"

export default function HomePage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [appState, setAppState] = useState<AppState>("products")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  const [showPixModal, setShowPixModal] = useState(false)
  const [pixData, setPixData] = useState<{ nome: string; chave: string; valor: string; tipo?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyPixKey = () => {
    if (pixData?.chave) {
      navigator.clipboard.writeText(pixData.chave)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    if (customer) {
      console.log("[v0] Customer identified, fetching payment methods...")
      betelAPI.getPaymentMethods()
        .then(methods => {
          console.log(`[v0] Fetched ${methods.length} payment methods`)
          setPaymentMethods(methods)
        })
        .catch(err => console.error("[v0] Failed to fetch payment methods:", err))
    }
  }, [customer])

  const handleCustomerIdentified = (identifiedCustomer: Customer) => {
    setCustomer(identifiedCustomer)
    setAppState("products")
  }

  const getProductPrice = (product: Product) => {
    const price = product.valor_venda || product.preco_venda || product.preco
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price
    return numPrice && !isNaN(numPrice) ? numPrice : 0
  }

  const handleAddToQuote = (product: Product, quantity: number) => {
    const price = getProductPrice(product)
    const subtotal = price * quantity
    const existingItemIndex = quoteItems.findIndex((item) => item.product.id === product.id)

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...quoteItems]
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
        subtotal: (updatedItems[existingItemIndex].quantity + quantity) * price,
      }
      setQuoteItems(updatedItems)
    } else {
      // Add new item
      setQuoteItems((prev) => [...prev, { product, quantity, subtotal }])
    }
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId)
      return
    }

    setQuoteItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const price = getProductPrice(item.product)
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * price,
          }
        }
        return item
      }),
    )
  }

  const handleRemoveItem = (productId: string) => {
    setQuoteItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const handleLogout = () => {
    setCustomer(null)
    setQuoteItems([])
    setAppState("products")
    setPaymentMethods([])
  }

  const handleLogoClick = () => {
    setAppState("products")
  }

  const handleViewQuote = () => {
    setAppState("quote")
  }

  const handleBackToProducts = () => {
    setAppState("products")
  }

  const handleProceedToOrder = () => {
    setAppState("order")
  }

  const handleBackToQuote = () => {
    setAppState("quote")
  }

  const handleSubmitQuote = async (observations: string) => {
    if (!customer) {
      throw new Error("Cliente não identificado")
    }

    if (quoteItems.length === 0) {
      throw new Error("Nenhum item no orçamento")
    }

    try {
      const quoteData = {
        customer,
        items: quoteItems,
        observations,
      }

      console.log("Submitting quote to Betel API:", quoteData)

      const result = await betelAPI.createQuote(quoteData)

      console.log("Quote submitted successfully:", result)

      setAppState("quote-submitted")
      setTimeout(() => {
        setQuoteItems([])
        setAppState("products")
      }, 3000)
    } catch (error) {
      console.error("Failed to submit quote:", error)
      throw error
    }
  }

  const handleSubmitOrder = async (orderData: OrderData) => {
    console.log("[v0] handleSubmitOrder called with:", orderData)

    if (!customer) {
      console.error("[v0] No customer found")
      throw new Error("Cliente não identificado")
    }

    if (quoteItems.length === 0) {
      console.error("[v0] No items in quote")
      throw new Error("Nenhum item no pedido")
    }

    console.log("[v0] Customer:", customer)
    console.log("[v0] Quote items:", quoteItems)

    try {
      const enhancedQuoteData = {
        customer: {
          ...customer,
          ...orderData.customerDetails,
        },
        items: quoteItems,
        observations: `
${orderData.observations || ""}


${orderData.exchangeDetails ? `
DETALHES DA TROCA:
Pedido Anterior: ${orderData.exchangeDetails.originalOrderId}
Motivo: ${orderData.exchangeDetails.reason} ${orderData.exchangeDetails.description ? `(${orderData.exchangeDetails.description})` : ""}
Itens para Troca:
${orderData.exchangeDetails.selectedItems.map(item => `- ${item.code ? item.code + " - " : ""}${item.name}`).join("\n")}
` : ""}

${orderData.returnedItemDetails ? `
DETALHES PEÇA DEVOLVIDA:
Peça: ${orderData.returnedItemDetails.name}
Estado: ${orderData.returnedItemDetails.condition}
Data Compra: ${new Date(orderData.returnedItemDetails.purchaseDate).toLocaleDateString("pt-BR")}
Valor: ${orderData.returnedItemDetails.value}
` : ""}
        `.trim(),
        paymentMethod: orderData.paymentMethod,
        deliveryDate: orderData.deliveryDate,
        deliveryMethod: orderData.deliveryMethod,
        topiqueiroName: orderData.topiqueiroName,
        topiqueiroTime: orderData.topiqueiroTime,
        topiqueiroPhone: orderData.topiqueiroPhone,
      }

      console.log("[v0] Enhanced sale data prepared:", enhancedQuoteData)
      console.log("[v0] Calling betelAPI.createSale")

      const result = await betelAPI.createSale(enhancedQuoteData)

      console.log("[v0] Order submitted successfully:", result)

      // Send WhatsApp Notification
      try {
        const formatMoney = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)

        const itemsList = quoteItems.map(item =>
          `${item.quantity}x ${item.product.nome} - ${formatMoney((item.product.valor_venda || item.product.preco_venda || item.product.preco || 0) * item.quantity)}`
        ).join("\n")

        const totalValue = formatMoney(quoteItems.reduce((acc, item) => acc + (getProductPrice(item.product) * item.quantity), 0))

        const deliveryLabel = {
          "delivery": "Entregar",
          "pickup": "Retirada na Loja",
          "topiqueiro": "Topiqueiro",
          "motouber": "Moto Uber"
        }[orderData.deliveryMethod] || orderData.deliveryMethod

        const message = `Olá *${orderData.customerDetails.nome}*
✅ Recebemos seu pedido em nossa lojinha virtual com sucesso.

*Segue link abaixo*
https://gestaoclick.com/venda/${result.hash}

Obrigado pela preferência!
*Equipe Icore Tech*`

        await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: `55${(orderData.customerDetails.telefone || customer.telefone || "").replace(/\D/g, "")}`,
            body: message
          })
        })
      } catch (msgError) {
        console.error("Failed to send WhatsApp order notification", msgError)
      }

      // If PIX, fetch key and show modal
      if (orderData.paymentMethod === 'pix') {
        try {
          const pixInfo = await betelAPI.getPixKey()
          if (pixInfo) {
            const total = calculateTotal()
            setPixData({
              nome: pixInfo.nome,
              chave: pixInfo.chave,
              tipo: pixInfo.tipo,
              valor: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)
            })
            setShowPixModal(true)
            // Don't change state yet, let them see the modal
            return
          }
        } catch (e) {
          console.error("Error showing PIX modal:", e)
        }
      }

      setAppState("order-submitted")
      setTimeout(() => {
        setQuoteItems([])
        setAppState("products")
      }, 4000)
    } catch (error) {
      console.error("[v0] Failed to submit order:", error)
      throw error
    }
  }

  const calculateTotal = () => {
    return quoteItems.reduce((sum, item) => {
      const price = getProductPrice(item.product)
      return sum + price * item.quantity
    }, 0)
  }



  if (!customer) {
    return <CustomerIdentification onCustomerIdentified={handleCustomerIdentified} />
  }

  if (appState === "quote-submitted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Orçamento Enviado!</h2>
            <p className="text-muted-foreground">
              Seu orçamento foi enviado com sucesso. Entraremos em contato em breve.
            </p>
          </div>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Você será redirecionado automaticamente para a página inicial.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (appState === "order-submitted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Pedido Confirmado!</h2>
            <p className="text-muted-foreground">
              Seu pedido foi confirmado com sucesso. Entraremos em contato para finalizar os detalhes.
            </p>
          </div>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Você receberá uma mensagem de confirmação no whatsapp e será redirecionado automaticamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        customer={customer}
        quoteItemsCount={quoteItems.length}
        onViewQuote={handleViewQuote}
        onLogout={handleLogout}
        onLogoClick={handleLogoClick}
      />
      <main>
        {appState === "quote" && (
          <QuoteManagement
            customer={customer}
            quoteItems={quoteItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onBackToProducts={handleBackToProducts}
            onSubmitQuote={handleSubmitQuote}
            onProceedToOrder={handleProceedToOrder}
          />
        )}

        {appState === "order" && (
          <OrderForm
            customer={customer}
            total={calculateTotal()}
            onSubmit={handleSubmitOrder}
            onBack={handleBackToQuote}
            paymentMethods={paymentMethods}
            cartItems={quoteItems}
          />
        )}

        {appState === "products" && (
          <div className="container mx-auto px-4 py-2">
            <div className="space-y-2">

              <ProductCatalog
                customer={customer}
                onAddToQuote={handleAddToQuote}
                quoteItemsCount={quoteItems.length}
                quoteItems={quoteItems}
              />
            </div>
          </div>
        )}
      </main>

      {/* PIX Payment Modal */}
      <AlertDialog open={showPixModal} onOpenChange={setShowPixModal}>
        <AlertDialogContent className="max-w-md">
          <div className="space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-primary flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Pedido concluído!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                Utilize os dados abaixo para realizar o pagamento via PIX.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {pixData && (
              <div className="space-y-4 p-4 bg-muted rounded-md border">
                <div className="flex justify-between items-center border-b pb-2 border-border/50">
                  <span className="font-semibold">Valor Total:</span>
                  <span className="text-lg font-bold text-primary">{pixData.valor}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-semibold block">Nome do Recebedor:</span>
                  <span className="break-words font-medium">{pixData.nome}</span>
                </div>
                {pixData.tipo && (
                  <div className="space-y-1">
                    <span className="text-sm font-semibold block">Tipo da Chave:</span>
                    <span className="break-words font-medium">{pixData.tipo}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-sm font-semibold block">Chave PIX:</span>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-background rounded border break-all font-mono text-sm flex-1 text-muted-foreground">
                      {pixData.chave}
                    </div>
                    <Button
                      onClick={handleCopyPixKey}
                      className="h-10 px-8 shrink-0 bg-yellow-400 hover:bg-yellow-500 text-black border-none font-bold"
                      title="Copiar Chave PIX"
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm">Copiar</span>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => {
                setShowPixModal(false)
                setAppState("order-submitted")
                setTimeout(() => {
                  setQuoteItems([])
                  setAppState("products")
                }, 4000)
              }} className="w-full">
                Já realizei o pagamento
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

