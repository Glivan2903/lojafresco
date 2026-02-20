"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    X,
    Package,
    Calendar,
    DollarSign,
    ArrowLeft,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    RotateCcw,
    Loader2
} from "lucide-react"
import { betelAPI, type Customer } from "@/lib/api"

interface Order {
    id: string
    codigo?: string
    numero?: string
    situacao?: string
    nome_situacao?: string
    data?: string
    data_criacao?: string
    total?: number
    valor_total?: number
    produtos?: any[]
    items?: any[]
    quantidade_produtos?: number
}

interface OrderDetail {
    id: string
    codigo?: string
    numero?: string
    situacao?: string
    nome_situacao?: string
    data?: string
    data_criacao?: string
    total?: number
    valor_total?: number
    produtos?: Array<{
        produto: {
            id: string
            produto_id?: string
            nome_produto: string
            quantidade: string
            valor_venda: string
            valor_total: string
            codigo?: string
            codigo_interno?: string
            referencia?: string
        }
        quantidade?: number
        valor_venda?: number
        valor_total?: number
    }>
    cliente?: {
        nome: string
        cpf?: string
        cnpj?: string
    }
}

interface CustomerReturnsProps {
    customer: Customer
    isOpen: boolean
    onClose: () => void
}

export function CustomerReturns({ customer, isOpen, onClose }: CustomerReturnsProps) {
    const [orders, setOrders] = useState<Order[]>([])
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form State
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const [situationType, setSituationType] = useState<"Boa" | "Ruim" | "">("")
    const [conditionType, setConditionType] = useState<"Nova" | "Usada" | "">("")
    const [resolutionType, setResolutionType] = useState<"Credito" | "Pix" | "">("")
    const [pixKey, setPixKey] = useState("")
    const [reason, setReason] = useState("")
    const [customReason, setCustomReason] = useState("")
    const [observation, setObservation] = useState("")

    useEffect(() => {
        if (isOpen && customer.id) {
            fetchOrders()
        }
    }, [isOpen, customer.id])

    useEffect(() => {
        if (!isOpen) {
            resetForm()
        }
    }, [isOpen])

    const resetForm = () => {
        setSelectedOrder(null)
        setSelectedItemIds([])
        setSituationType("")
        setConditionType("")
        setResolutionType("")
        setPixKey("")
        setReason("")
        setCustomReason("")
        setObservation("")
        setError(null)
        setSuccess(null)
    }

    const fetchOrders = async () => {
        if (!customer.id) return

        setLoading(true)
        setError(null)

        try {
            const response = await betelAPI.getCustomerSales(customer.id)
            setOrders(response || [])
        } catch (err) {
            console.error("Error fetching orders:", err)
            setError("Erro ao carregar pedidos")
        } finally {
            setLoading(false)
        }
    }

    const fetchOrderDetail = async (orderId: string) => {
        setDetailLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await betelAPI.getSaleDetail(orderId)
            setSelectedOrder(response)
        } catch (err) {
            console.error("Error fetching order details:", err)
            setError("Erro ao carregar detalhes do pedido")
        } finally {
            setDetailLoading(false)
        }
    }

    const getItemId = (item: any) => {
        return item.produto?.id || item.produto?.produto_id || item.id || "" // Normalize ID access
    }

    const handleSubmitReturn = async () => {
        const finalReason = reason === "Outros" ? customReason : reason

        // Validation logic: Condition only needed if Situation is Boa
        const isConditionRequired = situationType === "Boa"
        const isConditionValid = !isConditionRequired || (isConditionRequired && conditionType)
        const isPixKeyRequired = resolutionType === "Pix"
        const isPixKeyValid = !isPixKeyRequired || (isPixKeyRequired && pixKey.trim())

        if (!selectedOrder || selectedItemIds.length === 0 || !situationType || !isConditionValid || !reason || (reason === "Outros" && !customReason.trim()) || !resolutionType || !isPixKeyValid) {
            setError("Preencha todos os campos da devolução.")
            return
        }

        setSubmitLoading(true)
        setError(null)

        try {
            // Find selected item details
            const selectedItems = selectedOrder.produtos?.filter(p => selectedItemIds.includes(getItemId(p))) || []

            if (selectedItems.length === 0) {
                throw new Error("Nenhum item selecionado encontrado")
            }

            const orderCode = selectedOrder.codigo || selectedOrder.numero || selectedOrder.id

            const itemsText = selectedItems.map(item => {
                const safeProd = item.produto
                const itemCode = safeProd.codigo || safeProd.codigo_interno || safeProd.referencia || "No Code"
                return `Código: ${itemCode}\nProduto: ${safeProd.nome_produto}`
            }).join('\n\n')

            const totalValueArray = selectedItems.map(item => Number.parseFloat(item.produto.valor_venda || "0"))
            const totalValue = totalValueArray.reduce((acc, curr) => acc + curr, 0)

            // Construct Message
            const message = `*SOLICITAÇÃO DE DEVOLUÇÃO DE PEÇA*
--------------------------------
*Cliente:* ${customer.nome}
*Telefone:* ${customer.telefone || "Não informado"}
*Pedido Original:* ${orderCode}
--------------------------------
*Itens Devolvidos:*
${itemsText}
--------------------------------
*Situação da Peça:* ${situationType === "Boa" ? "Boa (Sem avarias)" : "Ruim (Com defeito/avaria)"}
${situationType === "Boa" ? `*Condição da Peça:* ${conditionType}` : ""}
*Motivo:* ${finalReason}
*Observações:* ${observation || "Sem observações adicionais"}
--------------------------------
*Forma de Reembolso:* ${resolutionType === "Pix" ? "Estorno via PIX" : "Crédito em Loja"}
${resolutionType === "Pix" ? `*Chave PIX:* ${pixKey}` : ""}
*Valor a Reembolsar:* ${formatCurrency(totalValue)}
--------------------------------
*Ação:* Aguardando análise para ${resolutionType === "Pix" ? "estorno" : "liberação de crédito"}.
`

            console.log("[CustomerReturns] Opening WhatsApp with message:", message)

            // Open WhatsApp directly
            const encodedMessage = encodeURIComponent(message)
            window.open(`https://wa.me/5588988638990?text=${encodedMessage}`, '_blank')

            setSuccess("Solicitação preparada! Se o WhatsApp não abriu, verifique o bloqueador de pop-ups.")

            // Reset parts of form
            setSelectedItemIds([])
            setSituationType("")
            setConditionType("")
            setResolutionType("")
            setPixKey("")
            setReason("")
            setCustomReason("")
            setObservation("")

        } catch (err) {
            console.error("Error submitting return:", err)
            setError("Erro ao processar solicitação. Tente novamente.")
        } finally {
            setSubmitLoading(false)
        }
    }

    const formatCurrency = (value: number | string | undefined) => {
        const numValue = typeof value === "string" ? Number.parseFloat(value) : value || 0
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(numValue)
    }

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return "Data não informada"
        try {
            if (dateString.includes('/')) return dateString;
            const textDate = dateString.split(' ')[0].split('T')[0];
            const parts = textDate.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return new Date(dateString).toLocaleDateString("pt-BR")
        } catch {
            return dateString
        }
    }

    const getStatusColor = (status: string | undefined) => {
        const s = (status || "").toLowerCase()
        if (s.includes("pago") || s.includes("concluído") || s.includes("entregue")) return "bg-green-100 text-green-800 border-green-200"
        if (s.includes("cancelado") || s.includes("devolução") || s.includes("estornado")) return "bg-red-100 text-red-800 border-red-200"
        if (s.includes("pendente") || s.includes("aguardando")) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        if (s.includes("preparação") || s.includes("separação")) return "bg-blue-100 text-blue-800 border-blue-200"
        return "bg-secondary text-secondary-foreground"
    }

    // Dynamic Reasons
    const getReasons = () => {
        if (situationType === "Boa") {
            return [
                "Cliente desistiu",
                "Compra de modelo incorreto",
                "Envio incorreto",
                "Problema na placa do aparelho",
                "Qualidade contestada pelo cliente",
                "Versão",
                "Outros"
            ]
        }
        if (situationType === "Ruim") {
            return [
                "Imagem ruim",
                "Não Carrega",
                "Tampa não encaixa",
                "Touch ruim",
                "Outros"
            ]
        }
        return []
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 shrink-0 relative">
                    <div className="w-8"></div> {/* Spacer */}

                    <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
                        <CardTitle className="text-lg font-bold text-center">
                            {selectedOrder ? "Solicitar Devolução" : "Selecione um Pedido"}
                        </CardTitle>
                    </div>

                    <div className="flex items-center gap-2 z-10">
                        {selectedOrder && (
                            <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedOrder(null)
                                setSuccess(null)
                                setError(null)
                            }} className="absolute left-4">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        )}
                        {!selectedOrder && (
                            <Button variant="ghost" size="icon" onClick={fetchOrders} disabled={loading} title="Atualizar">
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="overflow-y-auto flex-1 pt-2">
                    {selectedOrder ? (
                        <div className="space-y-4">
                            {detailLoading && (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            )}

                            {!detailLoading && success && (
                                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex flex-col items-center justify-center space-y-2">
                                    <CheckCircle className="w-12 h-12 text-green-500" />
                                    <h3 className="text-lg font-bold">Solicitação Iniciada!</h3>
                                    <p className="text-center">{success}</p>
                                    <p className="text-sm text-muted-foreground text-center">Finalize o envio no WhatsApp que foi aberto.</p>
                                    <Button onClick={() => setSelectedOrder(null)} variant="outline" className="mt-4">
                                        Voltar para Lista
                                    </Button>
                                </div>
                            )}

                            {!detailLoading && !success && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                    {/* Order Info Summary */}
                                    <div className="bg-muted p-3 rounded-lg flex justify-between items-center text-sm">
                                        <div>
                                            <span className="font-bold">Pedido:</span> {selectedOrder.codigo || selectedOrder.numero || selectedOrder.id}
                                        </div>
                                        <div>
                                            <span className="font-bold">Data:</span> {formatDate(selectedOrder.data_criacao || selectedOrder.data)}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">1. Selecione a peça para devolução</h3>
                                        {selectedOrder.produtos && selectedOrder.produtos.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {selectedOrder.produtos.map((item, index) => {
                                                    const id = getItemId(item)
                                                    const isSelected = selectedItemIds.includes(id)
                                                    const safeProd = item.produto
                                                    const itemCode = safeProd.codigo || safeProd.codigo_interno || safeProd.referencia || "No Code"

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`
                                            p-2 rounded-lg border-2 cursor-pointer transition-all
                                            ${isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted hover:bg-muted/80"}
                                        `}
                                                            onClick={() => {
                                                                setSelectedItemIds(prev =>
                                                                    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                                                                )
                                                                setConditionType("") // Reset logic when item changes
                                                                setReason("")
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground bg-background"}`}>
                                                                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                                        </div>
                                                                        <span className="font-medium">{safeProd.nome_produto}</span>
                                                                    </div>
                                                                    <div className="pl-6 text-xs text-muted-foreground">
                                                                        Cód: {itemCode} | Qtd: {safeProd.quantidade}
                                                                    </div>
                                                                </div>
                                                                <span className="font-semibold text-sm">{formatCurrency(safeProd.valor_venda)}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">Não há produtos neste pedido.</p>
                                        )}
                                    </div>

                                    {selectedItemIds.length > 0 && (
                                        <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                                            <h3 className="font-semibold text-lg">2. Detalhes da Devolução</h3>

                                            <div className="space-y-4">
                                                {/* Situation Radio Group */}
                                                <div className="space-y-2">
                                                    <Label className="text-base">Situação da Peça *</Label>
                                                    <RadioGroup
                                                        value={situationType}
                                                        onValueChange={(val: "Boa" | "Ruim") => {
                                                            setSituationType(val)
                                                            setReason("")
                                                            setCustomReason("")
                                                            if (val === "Ruim") {
                                                                setConditionType("") // Clear sub-condition if Ruim
                                                            }
                                                        }}
                                                        className="flex gap-4"
                                                    >
                                                        <div className="flex items-center space-x-2 border rounded-lg p-2 w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                            <RadioGroupItem value="Boa" id="sit-boa" />
                                                            <Label htmlFor="sit-boa" className="cursor-pointer w-full font-medium">Boa (Sem avarias)</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2 border rounded-lg p-2 w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                            <RadioGroupItem value="Ruim" id="sit-ruim" />
                                                            <Label htmlFor="sit-ruim" className="cursor-pointer w-full font-medium">Ruim (Com defeito/avaria)</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </div>

                                                {/* Condition Radio Group (Only if Boa) */}
                                                {situationType === "Boa" && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <Label className="text-base">Condição da Peça *</Label>
                                                        <RadioGroup
                                                            value={conditionType}
                                                            onValueChange={(val: "Nova" | "Usada") => {
                                                                setConditionType(val)
                                                            }}
                                                            className="flex gap-4"
                                                        >
                                                            <div className="flex items-center space-x-2 border rounded-lg p-2 w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                                <RadioGroupItem value="Nova" id="cond-nova" />
                                                                <Label htmlFor="cond-nova" className="cursor-pointer w-full font-medium">Nova</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2 border rounded-lg p-2 w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                                <RadioGroupItem value="Usada" id="cond-usada" />
                                                                <Label htmlFor="cond-usada" className="cursor-pointer w-full font-medium">Usada</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </div>
                                                )}

                                                {/* Reason Select - Shows if condition selected OR situation is Ruim */}
                                                {(conditionType || situationType === "Ruim") && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <Label htmlFor="reasonSelect">Motivo da Devolução *</Label>
                                                        <Select
                                                            value={reason}
                                                            onValueChange={(val) => {
                                                                setReason(val)
                                                                if (val !== "Outros") {
                                                                    setCustomReason("")
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione o motivo..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {getReasons().map(r => (
                                                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                {/* Custom Reason Input - Only shows if Reason is "Outros" */}
                                                {reason === "Outros" && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <Label htmlFor="customReason">Descreva o motivo *</Label>
                                                        <Input
                                                            id="customReason"
                                                            placeholder={situationType === "Boa" ? "Ex: Não gostei do modelo..." : "Ex: Tela piscando..."}
                                                            value={customReason}
                                                            onChange={(e) => setCustomReason(e.target.value)}
                                                            className={error && !customReason ? "border-destructive" : ""}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="observation">Observações Adicionais</Label>
                                                <Textarea
                                                    id="observation"
                                                    placeholder="Mais detalhes..."
                                                    value={observation}
                                                    onChange={(e) => setObservation(e.target.value)}
                                                />
                                            </div>

                                            {/* Resolution Type Radio Group */}
                                            <div className="space-y-2 pt-2 border-t">
                                                <Label className="text-base">Como deseja receber o valor? *</Label>
                                                <RadioGroup
                                                    value={resolutionType}
                                                    onValueChange={(val: "Credito" | "Pix") => {
                                                        setResolutionType(val)
                                                    }}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2 border rounded-lg p-2 w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                        <RadioGroupItem value="Credito" id="res-credito" />
                                                        <Label htmlFor="res-credito" className="cursor-pointer w-full font-medium">Crédito em Loja</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2 border rounded-lg p-2 w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                        <RadioGroupItem value="Pix" id="res-pix" />
                                                        <Label htmlFor="res-pix" className="cursor-pointer w-full font-medium">Estorno via PIX</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            {/* Pix Key Input - Only shows if Pix is selected */}
                                            {resolutionType === "Pix" && (
                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <Label htmlFor="pixKey">Chave PIX *</Label>
                                                    <Input
                                                        id="pixKey"
                                                        placeholder="CPF, E-mail ou Telefone"
                                                        value={pixKey}
                                                        onChange={(e) => setPixKey(e.target.value)}
                                                        className={error && !pixKey ? "border-destructive" : ""}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
                                            <AlertTriangle className="w-4 h-4" />
                                            {error}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 text-lg font-semibold"
                                        onClick={handleSubmitReturn}
                                        disabled={submitLoading}
                                    >
                                        {submitLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center leading-tight">
                                                <span>Enviar Solicitação via WhatsApp</span>
                                                <span className="text-xs font-normal opacity-90">Clique para abrir o WhatsApp com os dados preenchidos</span>
                                            </div>
                                        )}
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Ao enviar, nossa equipe receberá sua solicitação e entrará em contato.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {loading && (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {!loading && orders.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>Nenhum pedido encontrado para devolução.</p>
                                </div>
                            )}

                            {!loading && orders.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground mb-4">Escolha o pedido que contém a peça que deseja devolver:</p>
                                    {orders.map((order) => (
                                        <Card
                                            key={order.id}
                                            className="cursor-pointer hover:bg-accent transition-colors border-l-4 border-l-primary"
                                            onClick={() => fetchOrderDetail(order.id)}
                                        >
                                            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <p className="font-bold text-lg">{order.codigo || order.numero || `#${order.id}`}</p>
                                                    <p className="text-sm text-muted-foreground">{formatDate(order.data_criacao || order.data)}</p>
                                                </div>
                                                <div className="text-left sm:text-right flex flex-col items-start sm:items-end w-full sm:w-auto">
                                                    <Badge className={`mb-1 w-fit text-left sm:text-right whitespace-normal h-auto py-1 ${getStatusColor(order.nome_situacao || order.situacao)}`}>
                                                        {order.nome_situacao || order.situacao}
                                                    </Badge>
                                                    <p className="font-semibold">{formatCurrency(order.total || order.valor_total)}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
