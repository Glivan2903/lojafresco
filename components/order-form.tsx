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
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Package, AlertTriangle, Bus, Bike } from "lucide-react"
import { betelAPI } from "@/lib/api"

interface OrderFormProps {
  customer: Customer
  total: number
  onSubmit: (orderData: OrderData) => Promise<void>
  onBack: () => void
  paymentMethods: PaymentMethod[]
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
    selectedItems: Array<{ id: string; name: string }>
    reason: string
    description?: string
  }
  returnedItemDetails?: {
    name: string
    condition: string
    purchaseDate: string
    value: string
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

export function OrderForm({ customer, total, onSubmit, onBack, paymentMethods }: OrderFormProps) {
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
    deliveryDate: "",
    observations: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitProgress, setSubmitProgress] = useState(0)
  const [useRegisteredAddress, setUseRegisteredAddress] = useState(true)
  const [carriers, setCarriers] = useState<Carrier[]>([])

  useEffect(() => {
    betelAPI.getCarriers().then(setCarriers).catch(console.error)
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
    if (formData.paymentMethod === "Troca" && customer.id) {
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
    setSelectedExchangeItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    console.log("[v0] Validating form data:", formData)

    if (!formData.customerDetails.nome.trim()) {
      newErrors.nome = "Nome é obrigatório"
      console.log("[v0] Validation failed: nome is empty")
    }

    if (!formData.customerDetails.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório"
      console.log("[v0] Validation failed: telefone is empty")
    }

    if (formData.deliveryMethod === "delivery") {
      if (!formData.customerDetails.endereco.rua.trim()) {
        newErrors.rua = "Rua é obrigatória"
      }

      if (!formData.customerDetails.endereco.numero.trim()) {
        newErrors.numero = "Número é obrigatório"
      }

      if (!formData.customerDetails.endereco.bairro.trim()) {
        newErrors.bairro = "Bairro é obrigatório"
      }

      if (!formData.customerDetails.endereco.cidade.trim()) {
        newErrors.cidade = "Cidade é obrigatória"
      }

      if (!formData.customerDetails.endereco.cep.trim()) {
        newErrors.cep = "CEP é obrigatório"
      } else if (!validateCEP(formData.customerDetails.endereco.cep)) {
        newErrors.cep = "CEP inválido"
      }

      if (!formData.customerDetails.endereco.estado.trim()) {
        newErrors.estado = "Estado é obrigatório"
      }
    }

    if (formData.deliveryMethod === "topiqueiro") {
      if (!formData.selectedCarrierId) {
        newErrors.selectedCarrierId = "Selecione um topiqueiro"
      } else {
        const isOthers = formData.selectedCarrierId === "others"
        const isCarrierNotFound = carriers.find(c => c.id === formData.selectedCarrierId)?.nome.toLowerCase() === "não encontrado"

        if (isOthers || isCarrierNotFound) {
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
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = "Forma de pagamento é obrigatória"
      console.log("[v0] Validation failed: paymentMethod is empty")
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
      if (!returnedItemName.trim()) newErrors.returnedItemName = "Nome da peça é obrigatório"
      if (!returnedItemCondition.trim()) newErrors.returnedItemCondition = "Estado da peça é obrigatório"
      if (!returnedItemDate.trim()) newErrors.returnedItemDate = "Data da compra é obrigatória"
      if (!returnedItemValue.trim()) newErrors.returnedItemValue = "Valor é obrigatório"
    }

    console.log("[v0] Validation errors found:", newErrors)
    console.log("[v0] Validation result:", Object.keys(newErrors).length === 0)

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
        if (selectedCarrier) {
          dataToSubmit.topiqueiroName = selectedCarrier.nome
          // API might not give time/phone for registered carriers, so we leave them empty or as is?
          // User requirement for "Not Found" was specific about Time/Phone.
          // For found, it just presents the tab (list).
          // So having name is checking the box.
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
          originalOrderId: exchangeOrder.id || exchangeOrder.codigo || exchangeOrderId,
          selectedItems: exchangeOrder.produtos
            ?.filter((item: any) => selectedExchangeItems.includes(item.produto?.id || item.id))
            .map((item: any) => ({
              id: item.produto?.id || item.id,
              name: item.produto?.nome_produto || item.nome_produto || "Unknown Product"
            })) || [],
          reason: exchangeReason,
          description: exchangeReason === "Outros" ? exchangeDescription : undefined
        }
      }

      if (formData.paymentMethod === "Credito Peça Devolvida") {
        dataToSubmit.returnedItemDetails = {
          name: returnedItemName,
          condition: returnedItemCondition,
          purchaseDate: returnedItemDate,
          value: returnedItemValue
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
  ]

  return (
    <div className="container mx-auto px-4 py-8">
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
                    <Label className="text-muted-foreground">Nome Completo</Label>
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
                    onValueChange={(value: any) => setFormData((prev) => ({ ...prev, deliveryMethod: value }))}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                      <Label
                        htmlFor="delivery"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                      >
                        <MapPin className="mb-3 h-6 w-6" />
                        Entrega
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
                          <Input
                            id="topiqueiroTime"
                            type="time"
                            value={formData.topiqueiroTime}
                            onChange={(e) => setFormData((prev) => ({ ...prev, topiqueiroTime: e.target.value }))}
                            className={errors.topiqueiroTime ? "border-destructive" : ""}
                          />
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
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Endereço de Entrega</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="use-registered-address"
                          checked={useRegisteredAddress}
                          onCheckedChange={(checked) => {
                            setUseRegisteredAddress(checked)
                            if (checked && customer.endereco) {
                              setFormData((prev) => ({
                                ...prev,
                                customerDetails: {
                                  ...prev.customerDetails,
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
                              }))
                            }
                          }}
                        />
                        <Label htmlFor="use-registered-address" className="text-sm font-normal">
                          Usar endereço cadastrado
                        </Label>
                      </div>
                    </div>

                    {useRegisteredAddress ? (
                      <div className="p-4 bg-muted rounded-md space-y-2">
                        <p className="text-sm font-medium">Endereço selecionado:</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.customerDetails.endereco.rua}, {formData.customerDetails.endereco.numero}
                          {formData.customerDetails.endereco.complemento ? ` - ${formData.customerDetails.endereco.complemento}` : ""}
                          <br />
                          {formData.customerDetails.endereco.bairro} - {formData.customerDetails.endereco.cidade}/{formData.customerDetails.endereco.estado}
                          <br />
                          CEP: {formData.customerDetails.endereco.cep}
                        </p>
                      </div>
                    ) : (
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
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.nome}>
                            {method.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <>
                            {(["delivery", "topiqueiro", "motouber"].includes(formData.deliveryMethod) ? (
                              <>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="a_receber">A Receber</SelectItem>
                                <SelectItem value="a_prazo">A Prazo</SelectItem>
                              </>
                            ) : (
                              // Pickup or default
                              <>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="dinheiro_vista">Dinheiro a Vista</SelectItem>
                                <SelectItem value="a_prazo">A Prazo</SelectItem>
                              </>
                            ))}
                            <SelectItem value="Troca">Troca</SelectItem>
                            <SelectItem value="Credito Peça Devolvida">Crédito Peça Devolvida</SelectItem>
                          </>
                        </>
                      )}
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
                                    Pedido #{order.codigo || order.numero || order.id} - {new Date(order.data_criacao || order.data).toLocaleDateString("pt-BR")} - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || order.valor_total || 0)}
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
                            {exchangeOrder.produtos?.map((item: any, index: number) => (
                              <div key={item.id || index} className="flex items-start gap-2 p-2 bg-background rounded border">
                                <Checkbox
                                  id={`item-${item.id || index}`}
                                  checked={selectedExchangeItems.includes(item.produto?.id || item.id)}
                                  onCheckedChange={() => handleToggleExchangeItem(item.produto?.id || item.id)}
                                />
                                <div className="space-y-1">
                                  <Label htmlFor={`item-${item.id || index}`} className="font-medium cursor-pointer">
                                    {item.produto?.nome_produto || item.nome_produto || "Produto sem nome"}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    Qtd: {item.produto?.quantidade || item.quantidade} | Valor: {formatPrice(Number(item.produto?.valor_venda || item.valor_venda || 0))}
                                  </p>
                                </div>
                              </div>
                            ))}
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

                  {/* Returned Item Credit Flow */}
                  {formData.paymentMethod === "Credito Peça Devolvida" && (
                    <div className="mt-4 pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Detalhes da Peça Devolvida
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="returnedItemName">Nome da Peça *</Label>
                          <Input
                            id="returnedItemName"
                            value={returnedItemName}
                            onChange={(e) => setReturnedItemName(e.target.value)}
                            placeholder="Ex: Placa mãe iPhone X"
                            className={errors.returnedItemName ? "border-destructive" : ""}
                          />
                          {errors.returnedItemName && <p className="text-sm text-destructive">{errors.returnedItemName}</p>}
                        </div>

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

                        <div className="space-y-2">
                          <Label htmlFor="returnedItemDate">Data da Compra *</Label>
                          <Input
                            id="returnedItemDate"
                            type="date"
                            value={returnedItemDate}
                            onChange={(e) => setReturnedItemDate(e.target.value)}
                            className={errors.returnedItemDate ? "border-destructive" : ""}
                          />
                          {errors.returnedItemDate && <p className="text-sm text-destructive">{errors.returnedItemDate}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="returnedItemValue">Valor *</Label>
                          <Input
                            id="returnedItemValue"
                            value={returnedItemValue}
                            onChange={(e) => setReturnedItemValue(e.target.value)}
                            placeholder="R$ 0,00"
                            className={errors.returnedItemValue ? "border-destructive" : ""}
                          />
                          {errors.returnedItemValue && <p className="text-sm text-destructive">{errors.returnedItemValue}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Data de Entrega Preferida</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                    min={new Date().toISOString().split("T")[0]}
                  />
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
      </div>
    </div>
  )
}
