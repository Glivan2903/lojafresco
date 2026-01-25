"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X, ArrowLeft, RefreshCw, DollarSign, Calendar, FileText } from "lucide-react"
import { betelAPI, type Customer, type Receivable } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface CustomerFinancialProps {
    customer: Customer
    isOpen: boolean
    onClose: () => void
}

export function CustomerFinancial({ customer, isOpen, onClose }: CustomerFinancialProps) {
    const [receivables, setReceivables] = useState<Receivable[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const loadReceivables = async () => {
        if (!customer.id) return

        setIsLoading(true)
        setError("")
        try {
            const data = await betelAPI.getCustomerReceivables(customer.id)
            setReceivables(data)
        } catch (err) {
            console.error("Failed to load receivables:", err)
            setError("Não foi possível carregar o financeiro.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && customer.id) {
            loadReceivables()
        }
    }, [isOpen, customer.id])

    const formatCurrency = (value: number | string) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(Number(value))
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "Data N/A"
        try {
            const date = new Date(dateString)
            // Adjust for timezone offset if necessary, or just display as is if YYYY-MM-DD
            // Assuming API returns YYYY-MM-DD
            return format(date, "dd/MM/yyyy", { locale: ptBR })
        } catch (e) {
            return dateString
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-transparent border-none shadow-none [&>button]:hidden">
                <Card className="w-full h-full overflow-hidden flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <DollarSign className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold">Débitos</CardTitle>
                                <p className="text-sm text-muted-foreground">Contas a Pagar (Em Aberto)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={loadReceivables} disabled={isLoading} title="Atualizar">
                                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 bg-background/50">
                        {isLoading && receivables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p>Carregando financeiro...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-destructive">
                                <p>{error}</p>
                                <Button variant="outline" onClick={loadReceivables}>Tentar Novamente</Button>
                            </div>
                        ) : receivables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
                                <div className="p-4 bg-muted rounded-full">
                                    <FileText className="w-8 h-8 opacity-50" />
                                </div>
                                <p>Nenhuma conta em aberto encontrada.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground mb-4">
                                    Cliente: <strong>{customer.nome}</strong> | Total em Aberto: <strong>{formatCurrency(receivables.reduce((acc, curr) => acc + Number(curr.valor_total || curr.valor || 0), 0))}</strong>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                                    {receivables.map((item) => (
                                        <Card key={item.id} className="overflow-hidden border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="space-y-1">
                                                        <div className="font-semibold text-lg flex items-center gap-2">
                                                            {formatCurrency(item.valor_total || item.valor)}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Vencimento: <span className="font-medium text-foreground">{formatDate(item.data_vencimento)}</span>
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs font-normal bg-orange-50 text-orange-700 border-orange-200">
                                                        Em Aberto
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 pt-3 border-t text-sm space-y-1">
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-muted-foreground">Código:</span>
                                                            <p className="font-medium">{item.codigo || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Forma Pagamento:</span>
                                                            <p className="font-medium">{item.nome_forma_pagamento || "N/A"}</p>
                                                        </div>
                                                    </div>

                                                    {item.descricao && (
                                                        <div className="mt-2 text-xs bg-muted/50 p-2 rounded">
                                                            <span className="text-muted-foreground block mb-0.5">Descrição:</span>
                                                            {item.descricao}
                                                        </div>
                                                    )}
                                                    {item.observacao && (
                                                        <div className="mt-1 text-xs text-muted-foreground italic">
                                                            Obs: {item.observacao}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    )
}
