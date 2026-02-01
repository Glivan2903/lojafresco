"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, CreditCard, MapPin, User, ArrowLeft, Loader2 } from "lucide-react"
import { formatPhone } from "@/lib/validations"
import type { Customer, PaymentMethod, Carrier } from "@/lib/api"
import { isStoreOpen, getNextBusinessDay } from "@/lib/utils" // Imported helpers
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Package, AlertTriangle, Bus, Bike, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { betelAPI } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface OrderFormProps {
  customer: Customer
  total: number
  onSubmit: (orderData: OrderData) => Promise<void>
  onBack: () => void
  paymentMethods: PaymentMethod[]
  cartItems?: any[] // Added cartItems prop
}

export interface OrderData {
  customerDetails: {
    nome: string
    telefone: string
    endereco: {
      rua: string
      numero: string
      complemento?: string
      bairro: string
      cidade: string
      cep: string
      estado: string
    }
  }
  paymentMethod: string
  deliveryMethod: "delivery" | "pickup" | "topiqueiro" | "motouber"
  selectedCarrierId?: string
  topiqueiroName?: string
  topiqueiroTime?: string
  topiqueiroPhone?: string
  deliveryDate?: string
  observations?: string
  exchangeDetails?: {
    originalOrderId: string
    selectedItems: Array<{ id: string; name: string; code?: string }>
    reason: string
    description?: string
  }
  returnedItemDetails?: {
    name: string
    condition: string
    purchaseDate: string
    value: string
    returnedItemValue: string
  }
}

interface ViaCEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export function OrderForm(props: OrderFormProps) {
  const { customer, total, onSubmit, onBack, paymentMethods, cartItems } = props
  // Initialize date to today's date
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ""
    // Check if it's a simple YYYY-MM-DD string to avoid timezone issues with Date() constructor
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.substring(0, 10))) {
      const parts = dateString.substring(0, 10).split('-')
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    // Fallback for other formats
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const [formData, setFormData] = useState<OrderData>({
    customerDetails: {
      nome: customer.nome,
      telefone: customer.telefone || "",
      endereco: {
        rua: customer.endereco?.rua || "",
        numero: customer.endereco?.numero || "",
        complemento: customer.endereco?.complemento || "",
        bairro: customer.endereco?.bairro || "",
        cidade: customer.endereco?.cidade || "",
        cep: customer.endereco?.cep || "",
        estado: customer.endereco?.estado || "",
      },
    },
    paymentMethod: "",
    deliveryMethod: "delivery",
    selectedCarrierId: "",
    topiqueiroName: "",
    topiqueiroTime: "",
    topiqueiroPhone: "",
    deliveryDate: new Date().toISOString().split("T")[0], // Default to today
    observations: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitProgress, setSubmitProgress] = useState(0)

  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [showMotoUberModal, setShowMotoUberModal] = useState(false)
  const [showStoreClosedModal, setShowStoreClosedModal] = useState(false)
  const [isAddressExpanded, setIsAddressExpanded] = useState(false)

  useEffect(() => {
    betelAPI.getCarriers().then(setCarriers).catch(console.error)

    // Check store hours
    const now = new Date()
    if (!isStoreOpen(now)) {
      setShowStoreClosedModal(true)
      const nextBusinessDay = getNextBusinessDay(now)
      setFormData(prev => ({ ...prev, deliveryDate: nextBusinessDay.toISOString().split("T")[0] }))
    }
  }, [])

  // Exchange State
  const [exchangeOrderId, setExchangeOrderId] = useState("")
  const [exchangeOrder, setExchangeOrder] = useState<any>(null)
  const [isSearchingOrder, setIsSearchingOrder] = useState(false)
  const [orderSearchError, setOrderSearchError] = useState("")
  const [selectedExchangeItems, setSelectedExchangeItems] = useState<string[]>([])
  const [exchangeReason, setExchangeReason] = useState("")

  const [exchangeDescription, setExchangeDescription] = useState("")

  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  // Returned Item Credit State
  const [returnedItemName, setReturnedItemName] = useState("")
  const [returnedItemCondition, setReturnedItemCondition] = useState("")
  const [returnedItemDate, setReturnedItemDate] = useState("")
  const [returnedItemValue, setReturnedItemValue] = useState("")

  const [exchangeValidationAlertOpen, setExchangeValidationAlertOpen] = useState(false) // New state for alert
  const [showErrorModal, setShowErrorModal] = useState(false) // State for submission error modal

  // Smart Return Logic State
  const [returnAction, setReturnAction] = useState<"credit" | "refund">("credit")
  const [refundPixKey, setRefundPixKey] = useState("")
  const [remainingPaymentMethod, setRemainingPaymentMethod] = useState<"pix" | "money">("pix")
  const [remainingPixKey, setRemainingPixKey] = useState("")

  const exchangeReasons = [
    "Touch ruim",
    "Imagem ruim",
    "Não Carrega",
    "Tampa não encaixa",
    "Outros"
  ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  const validateCEP = (cep: string): boolean => {
    const cleanCep = cep.replace(/\D/g, "")
    return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep)
  }

  const lookupCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "")

    if (!validateCEP(cleanCep)) {
      setErrors((prev) => ({ ...prev, cep: "CEP deve ter 8 dígitos" }))
      return
    }

    setIsLoadingCep(true)
    setErrors((prev) => ({ ...prev, cep: "" }))

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data: ViaCEPResponse = await response.json()

      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado" }))
        return
      }

      // Auto-fill address fields
      setFormData((prev) => ({
        ...prev,
        customerDetails: {
          ...prev.customerDetails,
          endereco: {
            ...prev.customerDetails.endereco,
            rua: data.logradouro || prev.customerDetails.endereco.rua,
            bairro: data.bairro || prev.customerDetails.endereco.bairro,
            cidade: data.localidade || prev.customerDetails.endereco.cidade,
            estado: data.uf || prev.customerDetails.endereco.estado,
            cep: data.cep || prev.customerDetails.endereco.cep,
          },
        },
      }))
    } catch (error) {
      console.error("Error looking up CEP:", error)
      setErrors((prev) => ({ ...prev, cep: "Erro ao consultar CEP" }))
    } finally {
      setIsLoadingCep(false)
    }
  }






  useEffect(() => {
    if ((formData.paymentMethod === "Troca" || formData.paymentMethod === "Credito Peça Devolvida") && customer.id) {
      setIsLoadingOrders(true)
      betelAPI.getCustomerSales(customer.id)
        .then(orders => {
          setCustomerOrders(orders)
        })
        .catch(err => {
          console.error("Failed to load customer orders:", err)
        })
        .finally(() => {
          setIsLoadingOrders(false)
        })
    }
  }, [formData.paymentMethod, customer.id])

  const handleSelectOrder = async (orderId: string) => {
    setExchangeOrderId(orderId)
    setOrderSearchError("")
    setExchangeOrder(null)
    setSelectedExchangeItems([])
    setIsSearchingOrder(true)

    try {
      console.log(`[v0] Loading order details for: ${orderId}`)
      const order = await betelAPI.getSaleDetail(orderId)

      if (order) {

        // Enrich products with codes if missing
        if (order.produtos && Array.isArray(order.produtos)) {
          const enrichedProducts = await Promise.all(order.produtos.map(async (item: any) => {
            const productData = item.produto || item
            if (!productData) return item

            // Check if code is missing or placeholder
            const currentCode = productData.codigo || productData.codigo_interno
            const prodId = productData.produto_id || productData.id

            if ((!currentCode || currentCode === "No Code" || currentCode === "-") && prodId) {
              try {
                // console.log(`[v0] Fetching details for product ${prodId} to find code...`)
                const fullProduct = await betelAPI.getProduct(prodId)
                if (fullProduct) {
                  const foundCode = fullProduct.codigo || fullProduct.codigo_interno
                  if (foundCode) {
                    if (item.produto) {
                      item.produto.codigo = foundCode
                      item.produto.codigo_interno = fullProduct.codigo_interno
                    } else {
                      item.codigo = foundCode
                      item.codigo_interno = fullProduct.codigo_interno
                    }
                  }
                }
              } catch (e) {
                console.error("Error fetching product details:", e)
              }
            }
            return item
          }))
          order.produtos = enrichedProducts
        }

        setExchangeOrder(order)
      } else {
        setOrderSearchError("Detalhes do pedido não encontrados")
      }
    } catch (error) {
      console.error("Error loading order details:", error)
      setOrderSearchError("Erro ao carregar detalhes do pedido.")
    } finally {
      setIsSearchingOrder(false)
    }
  }

  const handleToggleExchangeItem = (itemId: string) => {
    if (formData.paymentMethod === "Credito Peça Devolvida") {
      // Single selection for this mode
      setSelectedExchangeItems([itemId])
      return
    }

    // Check for code validation in "Troca" mode
    if (formData.paymentMethod === "Troca" && !selectedExchangeItems.includes(itemId)) {
      // We are selecting a new item
      const item = exchangeOrder.produtos?.find((p: any) => getItemId(p) === itemId)
      if (item && cartItems && cartItems.length > 0) {
        // Get the code from the exchange item
        // The API structure for sales details seems to be nested in 'produto'
        // Helper to normalize
        const normalize = (val: any) => String(val || "").trim().toLowerCase()

        // Try multiple fields for code (robust access)
        const safeExchangeProd = item.produto || item
        const exchangeItemCode = normalize(safeExchangeProd.codigo || safeExchangeProd.codigo_interno || item.codigo || safeExchangeProd.referencia || "")
        const exchangeItemId = safeExchangeProd.id || safeExchangeProd.produto_id

        console.log(`[v0-debug] Validating exchange item. ID: ${itemId}, Code: '${exchangeItemCode}'`)

        // Check if ANY item in the cart has a matching code OR matching ID
        const hasMatchingCode = cartItems.some(cartItem => {
          const safeCartProd = cartItem.product || cartItem.produto || {}

          const cartItemCode = normalize(safeCartProd.codigo_interno || safeCartProd.codigo || safeCartProd.referencia || "")
          const cartItemId = safeCartProd.id || safeCartProd.produto_id

          const codeMatch = exchangeItemCode && cartItemCode && exchangeItemCode === cartItemCode
          const idMatch = exchangeItemId && cartItemId && String(exchangeItemId) === String(cartItemId)

          if (codeMatch || idMatch) {
            console.log(`[v0-debug] Match found! Cart Item: ${safeCartProd.nome}, CodeMatch: ${codeMatch}, IdMatch: ${idMatch}`)
          }
          return codeMatch || idMatch
        })

        if (!hasMatchingCode) {
          // Show Alert
          setExchangeValidationAlertOpen(true)
          // Do not allow selection? Or allow but warn?
          // User request: "pedi ao cliente para escolher a forma de pagamento: credito de peça devolvida"
          // Blocking selection seems appropriate to enforce the rule.
          return
        }
      }
    }

    setSelectedExchangeItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const getItemId = (item: any) => {
    return item.produto?.produto_id || item.produto?.id || item.id || ""
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    console.log("[v0] Validating form data:", formData)

    if (!formData.customerDetails.nome.trim()) {
      newErrors.nome = "Nome é obrigatório"
      isValid = false
    }

    if (!formData.customerDetails.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório"
      isValid = false
    }

    if (formData.deliveryMethod === "delivery") {
      if (!formData.customerDetails.endereco.cep) { newErrors.cep = "CEP é obrigatório"; isValid = false }
      else if (!validateCEP(formData.customerDetails.endereco.cep)) { newErrors.cep = "CEP inválido"; isValid = false }
      if (!formData.customerDetails.endereco.rua) { newErrors.rua = "Rua é obrigatória"; isValid = false }
      if (!formData.customerDetails.endereco.numero) { newErrors.numero = "Número é obrigatório"; isValid = false }
      if (!formData.customerDetails.endereco.bairro) { newErrors.bairro = "Bairro é obrigatório"; isValid = false }
      if (!formData.customerDetails.endereco.cidade) { newErrors.cidade = "Cidade é obrigatória"; isValid = false }
      if (!formData.customerDetails.endereco.estado) { newErrors.estado = "Estado é obrigatório"; isValid = false }
    }

    if (formData.deliveryMethod === "topiqueiro") {
      const isOthers = formData.selectedCarrierId === "others"
      const isCarrierNotFound = carriers.find(c => c.id === formData.selectedCarrierId)?.nome.toLowerCase() === "não encontrado"

      if (!formData.selectedCarrierId) {
        newErrors.selectedCarrierId = "Selecione um topiqueiro"
      } else if (isOthers || isCarrierNotFound) {
        if (!formData.topiqueiroName?.trim()) {
          newErrors.topiqueiroName = "Nome do topiqueiro é obrigatório"
        }
        if (!formData.topiqueiroTime?.trim()) {
          newErrors.topiqueiroTime = "Horário de saída é obrigatório"
        }
        if (!formData.topiqueiroPhone?.trim()) {
          newErrors.topiqueiroPhone = "Telefone do topiqueiro é obrigatório"
        }
      }
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = "Forma de pagamento é obrigatória"
      console.log("[v0] Validation failed: paymentMethod is empty")
    }

    if (formData.paymentMethod === "Troca") {
      if (!exchangeOrder) {
        newErrors.exchangeOrder = "É necessário selecionar um pedido para troca"
      } else if (selectedExchangeItems.length === 0) {
        newErrors.exchangeItems = "Selecione pelo menos um item para troca"
      }

      if (!exchangeReason) {
        newErrors.exchangeReason = "Selecione o motivo da troca"
      } else if (exchangeReason === "Outros" && !exchangeDescription.trim()) {
        newErrors.exchangeDescription = "Descreva o motivo da troca"
      }
    }

    if (formData.paymentMethod === "Credito Peça Devolvida") {
      if (!exchangeOrder) {
        newErrors.exchangeOrder = "Selecione o pedido original da peça"
      } else if (selectedExchangeItems.length === 0) {
        newErrors.exchangeItems = "Selecione a peça devolvida"
      }

      if (!returnedItemCondition.trim()) newErrors.returnedItemCondition = "Estado da peça é obrigatório"

      // Smart Return Validation
      if (exchangeOrder && selectedExchangeItems.length > 0) {
        const itemId = selectedExchangeItems[0]
        const selectedItem = exchangeOrder.produtos?.find((item: any) => getItemId(item) === itemId)

        if (selectedItem) {
          const itemValue = Number(selectedItem.produto?.valor_venda || selectedItem.valor_venda || 0)
          const difference = itemValue - total

          if (difference > 0 && returnAction === "refund" && !refundPixKey.trim()) {
            newErrors.refundPixKey = "Chave PIX para estorno é obrigatória"
          }

          if (difference < 0 && remainingPaymentMethod === "pix" && !remainingPixKey.trim()) {
            newErrors.remainingPixKey = "Chave PIX para pagamento é obrigatória"
          }
        }
      }
    }

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = "Data de entrega é obrigatória"
    }

    console.log("[v0] Validation errors found:", newErrors)
    console.log("[v0] Validation result:", Object.keys(newErrors).length === 0)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setShowErrorModal(true)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("[v0] Order form submit triggered")
    console.log("[v0] Form data:", formData)

    if (!validateForm()) {
      console.log("[v0] Form validation failed")
      return
    }

    console.log("[v0] Form validation passed, starting submission")
    setIsSubmitting(true)
    setSubmitProgress(0)

    try {
      setSubmitProgress(20)
      await new Promise((resolve) => setTimeout(resolve, 200))

      setSubmitProgress(50)
      await new Promise((resolve) => setTimeout(resolve, 200))

      setSubmitProgress(80)
      console.log("[v0] Calling onSubmit with form data")

      // Inject exchange details if applicable
      const dataToSubmit = { ...formData }

      // Auto-fill topiqueiro name if selected from dropdown
      if (formData.deliveryMethod === "topiqueiro" && formData.selectedCarrierId && formData.selectedCarrierId !== "others") {
        const selectedCarrier = carriers.find(c => c.id === formData.selectedCarrierId)

        // Only auto-fill if the carrier is NOT "Não Encontrado"
        // If it is "Não Encontrado", we respect the manual input from the form
        if (selectedCarrier && selectedCarrier.nome.toLowerCase() !== "não encontrado") {
          dataToSubmit.topiqueiroName = selectedCarrier.nome
          // Clear time and phone for standard carriers as they are not manually entered
          dataToSubmit.topiqueiroTime = ""
          dataToSubmit.topiqueiroPhone = ""
        }
      }

      // Clear address if not delivery to avoid validation issues on backend or irrelevant data
      /* if (formData.deliveryMethod !== "delivery") {
          // Keep address for customer record updates, but maybe flag it?
          // User wants address even for Pickup? Typically no delivery address for pickup.
          // But we will keep it for now as it updates customer profile.
      } */
      if (formData.paymentMethod === "Troca" && exchangeOrder) {
        dataToSubmit.exchangeDetails = {
          originalOrderId: exchangeOrder.codigo || exchangeOrder.id || exchangeOrderId,
          selectedItems: exchangeOrder.produtos
            ?.filter((item: any) => selectedExchangeItems.includes(getItemId(item)))
            .map((item: any) => {
              const safeProd = item.produto || item
              const code = safeProd.codigo || safeProd.codigo_interno || item.codigo || safeProd.referencia || "No Code"
              return {
                id: getItemId(item),
                code: code,
                name: item.produto?.nome_produto || item.nome_produto || "Unknown Product"
              }
            }) || [],
          reason: exchangeReason,
          description: exchangeReason === "Outros" ? exchangeDescription : undefined
        }
      }

      if (formData.paymentMethod === "Credito Peça Devolvida" && exchangeOrder) {
        const itemId = selectedExchangeItems[0]
        const selectedItem = exchangeOrder.produtos?.find((item: any) => getItemId(item) === itemId)

        if (selectedItem) {
          const safeProd = selectedItem.produto || selectedItem
          const itemCode = safeProd.codigo || safeProd.codigo_interno || selectedItem.codigo || safeProd.referencia || "No Code"

          const itemValue = Number(selectedItem.produto?.valor_venda || selectedItem.valor_venda || 0)
          const difference = itemValue - total
          let observations = formData.observations || ""

          // Build Smart Observations
          observations += `\n\n--- DETALHES CRÉDITO PEÇA DEVOLVIDA ---\n`
          observations += `Peça: ${itemCode} - ${selectedItem.produto?.nome_produto || selectedItem.nome_produto}\n`
          observations += `Estado: ${returnedItemCondition}\n`
          observations += `Valor Peça Antiga: ${formatPrice(itemValue)}\n`
          observations += `Valor Nova Compra: ${formatPrice(total)}\n`

          if (difference === 0) {
            observations += `Situação: Troca de valor igual.\n`
          } else if (difference > 0) {
            // Excess
            observations += `Situação: Sobrou ${formatPrice(difference)}.\n`
            if (returnAction === "credit") {
              observations += `Ação: Gerar Crédito na Loja.\n`
            } else {
              observations += `Ação: Estorno via PIX.\n`
              observations += `Chave PIX para Estorno: ${refundPixKey}\n`
            }
          } else {
            // Remaining to pay
            observations += `Situação: Faltam ${formatPrice(Math.abs(difference))}.\n`
            observations += `Forma de Pagamento Restante: ${remainingPaymentMethod === "pix" ? "PIX" : "Dinheiro"}\n`
            if (remainingPaymentMethod === "pix") {
              observations += `Chave PIX utilizada: ${remainingPixKey}\n`
            }
          }

          dataToSubmit.observations = observations

          dataToSubmit.returnedItemDetails = {
            name: `${itemCode} - ${selectedItem.produto?.nome_produto || selectedItem.nome_produto || "Peça Devolvida"}`,
            condition: returnedItemCondition,
            purchaseDate: exchangeOrder.data_criacao || exchangeOrder.data || new Date().toISOString().split("T")[0],
            value: String(itemValue),
            returnedItemValue: String(itemValue)
          }
        }
      }

      await onSubmit(dataToSubmit)

      setSubmitProgress(100)
      console.log("[v0] Order submission completed successfully")
    } catch (error) {
      console.error("[v0] Order submission failed:", error)
    } finally {
      setIsSubmitting(false)
      setSubmitProgress(0)
    }
  }

  const updateCustomerDetails = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      customerDetails: {
        ...prev.customerDetails,
        [field]: value,
      },
    }))
  }

  const updateAddress = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      customerDetails: {
        ...prev.customerDetails,
        endereco: {
          ...prev.customerDetails.endereco,
          [field]: value,
        },
      },
    }))
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    updateCustomerDetails("telefone", formatted)
  }

  const handleCepChange = (value: string) => {
    const clean = value.replace(/\D/g, "")
    const formatted = clean.replace(/(\d{5})(\d{3})/, "$1-$2")
    updateAddress("cep", formatted)

    // Auto-lookup when CEP is complete
    if (clean.length === 8) {
      lookupCEP(clean)
    }
  }

  const estados = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];



  return (
    <div className="container mx-auto px-4 py-8">
      {/* Code Mismatch Alert */}
      <AlertDialog open={exchangeValidationAlertOpen} onOpenChange={setExchangeValidationAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Código Diferente Detectado
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>A peça selecionada para troca possui um código diferente dos produtos no seu carrinho atual.</p>
              <p className="font-semibold text-foreground">
                Por favor, utilize a forma de pagamento <span className="text-primary">"Crédito Peça Devolvida"</span>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setExchangeValidationAlertOpen(false)
              // Optionally auto-switch payment method?
              // setFormData(prev => ({...prev, paymentMethod: "Credito Peça Devolvida"}))
            }}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-3xl font-bold">Finalizar Pedido</h2>
            <p className="text-muted-foreground">Complete seus dados para finalizar o pedido</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Summary (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome da Loja</Label>
                    <p className="font-medium">{customer.nome}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{customer.telefone ? formatPhone(customer.telefone) : "Não informado"}</p>
                  </div>
                </div>
                {customer.endereco && (customer.endereco.rua || customer.endereco.cep) && (
                  <div>
                    <Label className="text-muted-foreground">Endereço Cadastrado</Label>
                    <p className="font-medium">
                      {customer.endereco.rua}, {customer.endereco.numero}
                      {customer.endereco.complemento ? ` - ${customer.endereco.complemento}` : ""}
                      <br />
                      {customer.endereco.bairro} - {customer.endereco.cidade}/{customer.endereco.estado}
                      <br />
                      CEP: {customer.endereco.cep}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Entrega / Retirada
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Como você deseja receber o pedido?</Label>
                  <RadioGroup
                    value={formData.deliveryMethod}
                    onValueChange={(value: any) => {
                      setFormData((prev) => ({ ...prev, deliveryMethod: value }))
                      if (value === "motouber") {
                        setShowMotoUberModal(true)
                      }
                    }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                      <Label
                        htmlFor="delivery"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                      >
                        <MapPin className="mb-3 h-6 w-6" />
                        Entregar
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                      <Label
                        htmlFor="pickup"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                      >
                        <User className="mb-3 h-6 w-6" />
                        Retirar na Loja
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="topiqueiro" id="topiqueiro" className="peer sr-only" />
                      <Label
                        htmlFor="topiqueiro"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                      >
                        <Bus className="mb-3 h-6 w-6" />
                        Tôpiqueiro
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="motouber" id="motouber" className="peer sr-only" />
                      <Label
                        htmlFor="motouber"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                      >
                        <Bike className="mb-3 h-6 w-6" />
                        Moto Uber
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.deliveryMethod === "topiqueiro" && (
                  <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-4">
                    <div className="space-y-2">
                      <Label>Selecione o Topiqueiro</Label>
                      <Select
                        value={formData.selectedCarrierId}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, selectedCarrierId: value }))}
                      >
                        <SelectTrigger className={errors.selectedCarrierId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {carriers.map((carrier) => (
                            <SelectItem key={carrier.id} value={carrier.id}>
                              {carrier.nome}
                            </SelectItem>
                          ))}
                          <SelectItem value="others">Não Encontrado</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.selectedCarrierId && (
                        <p className="text-sm text-destructive">{errors.selectedCarrierId}</p>
                      )}
                    </div>

                    {(formData.selectedCarrierId === "others" || carriers.find(c => c.id === formData.selectedCarrierId)?.nome.toLowerCase() === "não encontrado") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed">
                        <div className="space-y-2">
                          <Label htmlFor="topiqueiroName">Nome do Topiqueiro *</Label>
                          <Input
                            id="topiqueiroName"
                            value={formData.topiqueiroName}
                            onChange={(e) => setFormData((prev) => ({ ...prev, topiqueiroName: e.target.value }))}
                            className={errors.topiqueiroName ? "border-destructive" : ""}
                          />
                          {errors.topiqueiroName && (
                            <p className="text-sm text-destructive">{errors.topiqueiroName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="topiqueiroTime">Horário de Saída *</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="topiqueiroTime"
                              type="time"
                              value={formData.topiqueiroTime}
                              onChange={(e) => setFormData((prev) => ({ ...prev, topiqueiroTime: e.target.value }))}
                              className={`pl-9 ${errors.topiqueiroTime ? "border-destructive" : ""}`}
                            />
                          </div>
                          {errors.topiqueiroTime && (
                            <p className="text-sm text-destructive">{errors.topiqueiroTime}</p>
                          )}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="topiqueiroPhone">Telefone *</Label>
                          <Input
                            id="topiqueiroPhone"
                            value={formData.topiqueiroPhone}
                            onChange={(e) => {
                              const formatted = formatPhone(e.target.value)
                              setFormData((prev) => ({ ...prev, topiqueiroPhone: formatted }))
                            }}
                            className={errors.topiqueiroPhone ? "border-destructive" : ""}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                          />
                          {errors.topiqueiroPhone && (
                            <p className="text-sm text-destructive">{errors.topiqueiroPhone}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.deliveryMethod === "delivery" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors -mx-2"
                      onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                    >
                      <Label className="text-base font-semibold cursor-pointer pointer-events-none">Endereço de Entrega</Label>
                      {isAddressExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>

                    {isAddressExpanded && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP *</Label>
                          <div className="relative">
                            <Input
                              id="cep"
                              placeholder="00000-000"
                              value={formData.customerDetails.endereco.cep}
                              onChange={(e) => handleCepChange(e.target.value)}
                              className={errors.cep ? "border-destructive" : ""}
                              maxLength={9}
                            />
                            {isLoadingCep && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            )}
                          </div>
                          {errors.cep && <p className="text-sm text-destructive">{errors.cep}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="rua">Rua *</Label>
                            <Input
                              id="rua"
                              value={formData.customerDetails.endereco.rua}
                              onChange={(e) => updateAddress("rua", e.target.value)}
                              className={errors.rua ? "border-destructive" : ""}
                            />
                            {errors.rua && <p className="text-sm text-destructive">{errors.rua}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="numero">Número *</Label>
                            <Input
                              id="numero"
                              value={formData.customerDetails.endereco.numero}
                              onChange={(e) => updateAddress("numero", e.target.value)}
                              className={errors.numero ? "border-destructive" : ""}
                            />
                            {errors.numero && <p className="text-sm text-destructive">{errors.numero}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="complemento">Complemento</Label>
                          <Input
                            id="complemento"
                            placeholder="Apartamento, bloco, etc."
                            value={formData.customerDetails.endereco.complemento}
                            onChange={(e) => updateAddress("complemento", e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bairro">Bairro *</Label>
                            <Input
                              id="bairro"
                              value={formData.customerDetails.endereco.bairro}
                              onChange={(e) => updateAddress("bairro", e.target.value)}
                              className={errors.bairro ? "border-destructive" : ""}
                            />
                            {errors.bairro && <p className="text-sm text-destructive">{errors.bairro}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="cidade">Cidade *</Label>
                            <Input
                              id="cidade"
                              value={formData.customerDetails.endereco.cidade}
                              onChange={(e) => updateAddress("cidade", e.target.value)}
                              className={errors.cidade ? "border-destructive" : ""}
                            />
                            {errors.cidade && <p className="text-sm text-destructive">{errors.cidade}</p>}
                          </div>
                        </div>


                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado *</Label>
                          <Select
                            value={formData.customerDetails.endereco.estado}
                            onValueChange={(value) => updateAddress("estado", value)}
                          >
                            <SelectTrigger className={errors.estado ? "border-destructive" : ""}>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                            <SelectContent>
                              {estados.map((estado) => (
                                <SelectItem key={estado} value={estado}>
                                  {estado}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.estado && <p className="text-sm text-destructive">{errors.estado}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment and Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Pagamento e Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger className={errors.paymentMethod ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {["delivery", "topiqueiro"].includes(formData.deliveryMethod) ? (
                        <>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="a_receber">A Receber</SelectItem>
                          <SelectItem value="a_prazo">A Prazo</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro_vista">Dinheiro a Vista</SelectItem>
                          <SelectItem value="a_prazo">A Prazo</SelectItem>
                        </>
                      )}
                      <SelectItem value="Troca">Troca</SelectItem>
                      <SelectItem value="Credito Peça Devolvida">Crédito Peça Devolvida</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && <p className="text-sm text-destructive">{errors.paymentMethod}</p>}

                  {/* Exchange Flow */}
                  {formData.paymentMethod === "Troca" && (
                    <div className="mt-4 pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-2">
                        <Label>Selecione o Pedido para Troca</Label>
                        {isLoadingOrders ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando pedidos...
                          </div>
                        ) : (
                          <Select
                            value={exchangeOrderId}
                            onValueChange={handleSelectOrder}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um pedido..." />
                            </SelectTrigger>
                            <SelectContent>
                              {customerOrders.length > 0 ? (
                                customerOrders.map((order) => (
                                  <SelectItem key={order.id} value={order.id}>
                                    Pedido #{order.codigo || order.numero || order.id} - {formatDateDisplay(order.data_criacao || order.data)} - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || order.valor_total || 0)}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>Nenhum pedido encontrado</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}

                        {orderSearchError && <p className="text-sm text-destructive">{orderSearchError}</p>}
                        {errors.exchangeOrder && <p className="text-sm text-destructive">{errors.exchangeOrder}</p>}
                      </div>

                      {isSearchingOrder && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}

                      {exchangeOrder && !isSearchingOrder && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                          <div className="flex items-center gap-2 font-medium">
                            <Package className="w-4 h-4" />
                            <span>Itens do Pedido ({exchangeOrder.produtos?.length || 0})</span>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {exchangeOrder.produtos?.map((item: any, index: number) => {
                              const itemId = getItemId(item) || `index-${index}`
                              const safeProd = item.produto || item
                              const code = safeProd.codigo || safeProd.codigo_interno || item.codigo || safeProd.referencia || "-"
                              return (
                                <div key={itemId} className="flex items-start gap-2 p-2 bg-background rounded border">
                                  <Checkbox
                                    id={`item-${itemId}`}
                                    checked={selectedExchangeItems.includes(itemId)}
                                    onCheckedChange={() => handleToggleExchangeItem(itemId)}
                                  />
                                  <div className="space-y-1">
                                    <Label htmlFor={`item-${itemId}`} className="font-medium cursor-pointer">
                                      <span className="text-muted-foreground mr-1 text-xs">#{code}</span>
                                      {item.produto?.nome_produto || item.nome_produto || "Produto sem nome"}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Qtd: {item.produto?.quantidade || item.quantidade} | Valor: {formatPrice(Number(item.produto?.valor_venda || item.valor_venda || 0))}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {errors.exchangeItems && <p className="text-sm text-destructive">{errors.exchangeItems}</p>}

                          <div className="space-y-2">
                            <Label>Motivo da Troca</Label>
                            <RadioGroup value={exchangeReason} onValueChange={setExchangeReason}>
                              {exchangeReasons.map((reason) => (
                                <div key={reason} className="flex items-center space-x-2">
                                  <RadioGroupItem value={reason} id={`reason-${reason}`} />
                                  <Label htmlFor={`reason-${reason}`}>{reason}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                            {errors.exchangeReason && <p className="text-sm text-destructive">{errors.exchangeReason}</p>}
                          </div>

                          {exchangeReason === "Outros" && (
                            <div className="space-y-2">
                              <Label htmlFor="exchangeDescription">Descreva o motivo</Label>
                              <Textarea
                                id="exchangeDescription"
                                value={exchangeDescription}
                                onChange={(e) => setExchangeDescription(e.target.value)}
                                placeholder="Descreva detalhadamente o problema..."
                              />
                              {errors.exchangeDescription && <p className="text-sm text-destructive">{errors.exchangeDescription}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Returned Item Credit Flow - REFACTORED */}
                  {formData.paymentMethod === "Credito Peça Devolvida" && (
                    <div className="mt-4 pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-2">
                        <Label>Selecione o Pedido Original</Label>
                        {isLoadingOrders ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando pedidos...
                          </div>
                        ) : (
                          <Select
                            value={exchangeOrderId}
                            onValueChange={handleSelectOrder}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um pedido..." />
                            </SelectTrigger>
                            <SelectContent>
                              {customerOrders.length > 0 ? (
                                customerOrders.map((order) => (
                                  <SelectItem key={order.id} value={order.id}>
                                    Pedido #{order.codigo || order.numero || order.id} - {formatDateDisplay(order.data_criacao || order.data)} - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || order.valor_total || 0)}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>Nenhum pedido encontrado</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        {errors.exchangeOrder && <p className="text-sm text-destructive">{errors.exchangeOrder}</p>}
                      </div>

                      {isSearchingOrder && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}

                      {exchangeOrder && !isSearchingOrder && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                          <div className="flex items-center gap-2 font-medium">
                            <Package className="w-4 h-4" />
                            <span>Selecione a Peça Devolvida</span>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {exchangeOrder.produtos?.map((item: any, index: number) => {
                              const itemId = getItemId(item) || `index-${index}`
                              const safeProd = item.produto || item
                              const code = safeProd.codigo || safeProd.codigo_interno || item.codigo || safeProd.referencia || "-"
                              return (
                                <div key={itemId} className="flex items-start gap-2 p-2 bg-background rounded border">
                                  <Checkbox
                                    id={`returned-item-${itemId}`}
                                    checked={selectedExchangeItems.includes(itemId)}
                                    onCheckedChange={() => handleToggleExchangeItem(itemId)}
                                  />
                                  <div className="space-y-1">
                                    <Label htmlFor={`returned-item-${itemId}`} className="font-medium cursor-pointer">
                                      <span className="text-muted-foreground mr-1 text-xs">#{code}</span>
                                      {item.produto?.nome_produto || item.nome_produto || "Produto sem nome"}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Valor: {formatPrice(Number(item.produto?.valor_venda || item.valor_venda || 0))}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {errors.exchangeItems && <p className="text-sm text-destructive">{errors.exchangeItems}</p>}

                          <div className="space-y-2">
                            <Label htmlFor="returnedItemCondition">Estado da Peça *</Label>
                            <Input
                              id="returnedItemCondition"
                              value={returnedItemCondition}
                              onChange={(e) => setReturnedItemCondition(e.target.value)}
                              placeholder="Ex: Usada, Com defeito, Nova"
                              className={errors.returnedItemCondition ? "border-destructive" : ""}
                            />
                            {errors.returnedItemCondition && <p className="text-sm text-destructive">{errors.returnedItemCondition}</p>}
                          </div>

                          {/* Value Comparison Logic */}
                          {selectedExchangeItems.length > 0 && (() => {
                            const itemId = selectedExchangeItems[0]
                            const selectedItem = exchangeOrder.produtos?.find((item: any) => getItemId(item) === itemId)
                            if (!selectedItem) return null

                            const itemValue = Number(selectedItem.produto?.valor_venda || selectedItem.valor_venda || 0)
                            const difference = itemValue - total

                            return (
                              <div className="space-y-4 pt-4 border-t border-dashed">
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Valor Peça Antiga:</span>
                                    <span className="font-medium">{formatPrice(itemValue)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Valor Nova Compra:</span>
                                    <span className="font-medium">{formatPrice(total)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                                    <span>{difference >= 0 ? "Sobrou:" : "Falta Pagar:"}</span>
                                    <span className={difference >= 0 ? "text-green-600" : "text-red-600"}>
                                      {formatPrice(Math.abs(difference))}
                                    </span>
                                  </div>
                                </div>

                                {difference > 0 && (
                                  <div className="space-y-3 p-3 bg-green-50 rounded-md border border-green-100">
                                    <Label>Como deseja receber a diferença?</Label>
                                    <RadioGroup value={returnAction} onValueChange={(v: "credit" | "refund") => setReturnAction(v)}>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="credit" id="ra-credit" />
                                        <Label htmlFor="ra-credit">Gerar Crédito na Loja</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="refund" id="ra-refund" />
                                        <Label htmlFor="ra-refund">Estorno (Devolução)</Label>
                                      </div>
                                    </RadioGroup>

                                    {returnAction === "refund" && (
                                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label htmlFor="refundPixKey">Chave Pix para Estorno *</Label>
                                        <Input
                                          id="refundPixKey"
                                          value={refundPixKey}
                                          onChange={e => setRefundPixKey(e.target.value)}
                                          placeholder="CPF, Email ou Telefone"
                                          className={errors.refundPixKey ? "border-destructive" : ""}
                                        />
                                        {errors.refundPixKey && <p className="text-sm text-destructive">{errors.refundPixKey}</p>}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {difference < 0 && (
                                  <div className="space-y-3 p-3 bg-red-50 rounded-md border border-red-100">
                                    <Label>Como deseja pagar a diferença?</Label>
                                    <RadioGroup value={remainingPaymentMethod} onValueChange={(v: "pix" | "money") => setRemainingPaymentMethod(v)}>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="pix" id="pm-pix" />
                                        <Label htmlFor="pm-pix">PIX</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="money" id="pm-money" />
                                        <Label htmlFor="pm-money">Dinheiro</Label>
                                      </div>
                                    </RadioGroup>

                                    {remainingPaymentMethod === "pix" && (
                                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label htmlFor="remainingPixKey">Chave PIX *</Label>
                                        <Input
                                          id="remainingPixKey"
                                          value={remainingPixKey}
                                          onChange={e => setRemainingPixKey(e.target.value)}
                                          placeholder="Informe a chave utilizada"
                                          className={errors.remainingPixKey ? "border-destructive" : ""}
                                        />
                                        <p className="text-xs text-muted-foreground">Informe a chave pix que você fará a transferência.</p>
                                        {errors.remainingPixKey && <p className="text-sm text-destructive">{errors.remainingPixKey}</p>}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Data de Entrega Preferida *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                    min={new Date().toISOString().split("T")[0]}
                    className={errors.deliveryDate ? "border-destructive" : ""}
                  />
                  {errors.deliveryDate && <p className="text-sm text-destructive">{errors.deliveryDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações Adicionais</Label>
                  <Textarea
                    id="observations"
                    placeholder="Instruções especiais, horário preferido para entrega, etc."
                    value={formData.observations}
                    onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>

                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Após a confirmação, entraremos em contato para finalizar os detalhes do pedido.
                  </AlertDescription>
                </Alert>

                <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando Pedido...
                    </>
                  ) : (
                    "Confirmar Pedido"
                  )}
                </Button>

                {isSubmitting && (
                  <div className="space-y-2">
                    <Progress value={submitProgress} className="w-full" />
                    <p className="text-xs text-center text-muted-foreground">
                      {submitProgress < 30 && "Validando dados..."}
                      {submitProgress >= 30 && submitProgress < 60 && "Preparando pedido..."}
                      {submitProgress >= 60 && submitProgress < 90 && "Enviando para a loja..."}
                      {submitProgress >= 90 && "Finalizando..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </form>
      </div >

      <AlertDialog open={showMotoUberModal} onOpenChange={setShowMotoUberModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
            <AlertDialogDescription>
              Solicitamos que as informações da corrida sejam enviadas por meio do nosso canal do WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowMotoUberModal(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showStoreClosedModal} onOpenChange={setShowStoreClosedModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Loja Fechada</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Estamos fora do nosso horário de funcionamento. Seu pedido será agendado para o próximo dia útil.</p>
              <div className="text-sm bg-muted p-2 rounded-md">
                <p className="font-semibold mb-1">Horário de Atendimento:</p>
                <p>Segunda a Sexta: 08:00 às 17:30</p>
                <p>Sábado: 08:00 às 13:00</p>
                <p>Domingos e Feriados: Fechado</p>
              </div>
              {formData.deliveryDate && (
                <p className="font-medium text-primary">
                  Nova data agendada: {new Date(formData.deliveryDate + "T12:00:00").toLocaleDateString('pt-BR')}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowStoreClosedModal(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submission Error Modal */}
      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Dados Incompletos
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existem campos obrigatórios não preenchidos no formulário. Por favor, verifique os campos em vermelho e tente novamente.
              {formData.deliveryMethod === "delivery" && (
                <p className="mt-2 text-xs text-muted-foreground">Verifique se todos os dados do endereço (CEP, Rua, Número, Bairro, Cidade, Estado) estão preenchidos.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorModal(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  )
}
