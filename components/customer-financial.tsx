"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X, ArrowLeft, RefreshCw, DollarSign, Calendar, FileText, Eye } from "lucide-react"
import { betelAPI, type Customer, type Receivable, type Sale } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface CustomerFinancialProps {
    customer: Customer
    isOpen: boolean
    onClose: () => void
}

export function CustomerFinancial({ customer, isOpen, onClose }: CustomerFinancialProps) {
    const [receivables, setReceivables] = useState<Receivable[]>([])
    const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [error, setError] = useState("")

    const loadReceivables = async () => {
        if (!customer.id) return

        // Reset selected detail if reloading
        setSelectedReceivable(null)

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

    const fetchReceivableDetail = async (id: string) => {
        setDetailLoading(true)
        setError("")
        setSelectedReceivable(null)
        setSelectedSale(null)

        try {
            const data = await betelAPI.getReceivableDetail(id)
            setSelectedReceivable(data)

            if (data && customer.id) {
                try {
                    let saleIdToFetch = null;

                    // 1. Try to extract sale number from description
                    // Pattern: "Venda de nº 12868"
                    const description = data.descricao || "";
                    const match = description.match(/Venda de nº\s*(\d+)/i);
                    const extractedNumber = match && match[1] ? match[1] : null;

                    // 2. Fetch all customer sales to find the correct internal ID
                    const allSales = await betelAPI.getCustomerSales(customer.id);

                    if (extractedNumber) {
                        // Find sale by extracted number
                        // We check numero, id, and codigo just to be safe
                        const foundSale = allSales.find((s: any) =>
                            String(s.numero) === String(extractedNumber) ||
                            String(s.id) === String(extractedNumber) ||
                            String(s.codigo) === String(extractedNumber)
                        );

                        if (foundSale) {
                            console.log(`[CustomerFinancial] Found sale matching ${extractedNumber}:`, foundSale);
                            saleIdToFetch = foundSale.id;
                        } else {
                            console.warn(`[CustomerFinancial] No sale found matching extracted number: ${extractedNumber}`);
                        }
                    }

                    // Fallback: compare with debt code if no sale found by description
                    if (!saleIdToFetch && data.codigo) {
                        const foundSaleByCode = allSales.find((s: any) =>
                            String(s.numero) === String(data.codigo) ||
                            String(s.id) === String(data.codigo) ||
                            String(s.codigo) === String(data.codigo)
                        );
                        if (foundSaleByCode) {
                            console.log(`[CustomerFinancial] Found sale matching debt code ${data.codigo}:`, foundSaleByCode);
                            saleIdToFetch = foundSaleByCode.id;
                        } else {
                            // Finally, try simply using the code/number as ID if not found in list (direct lookup)
                            // This handles cases where maybe the list didn't return it but it exists
                            console.warn(`[CustomerFinancial] No sale found by debt code. Attempting direct fetch with: ${extractedNumber || data.codigo}`);
                            saleIdToFetch = extractedNumber || data.codigo;
                        }
                    }

                    if (saleIdToFetch) {
                        const saleData = await betelAPI.getSaleDetail(saleIdToFetch)
                        setSelectedSale(saleData)
                    }

                } catch (saleErr) {
                    console.warn("Could not fetch sale details:", saleErr)
                    // Do not fail the whole view if sale details are missing
                }
            }
        } catch (err) {
            console.error("Failed to load receivable detail:", err)
            setError("Não foi possível carregar os detalhes.")
        } finally {
            setDetailLoading(false)
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
                <Card className="w-full h-full overflow-hidden flex flex-col border border-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 border-b bg-muted/20 relative">

                        <div className="w-8"></div> {/* Spacer */}

                        <div className="flex flex-col items-center flex-1 justify-center md:flex-none md:absolute md:left-1/2 md:transform md:-translate-x-1/2">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-xl font-bold text-center">{selectedReceivable ? "Detalhes do Débito" : "Débitos"}</CardTitle>
                            </div>
                            {!selectedReceivable && <p className="text-xs text-muted-foreground text-center">Contas a Pagar (Em Aberto)</p>}
                        </div>

                        <div className="flex items-center gap-2 z-10">
                            {selectedReceivable ? (
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedReceivable(null); setSelectedSale(null); }} className="absolute left-4">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            {!selectedReceivable && (
                                <Button variant="ghost" size="icon" onClick={loadReceivables} disabled={isLoading} title="Atualizar">
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto max-h-[60vh] p-4 md:p-6 bg-background/50 pr-2">
                        {selectedReceivable ? (
                            <div className="space-y-6">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">{formatCurrency(selectedReceivable.valor_total || selectedReceivable.valor)}</h3>
                                                <p className="text-sm text-muted-foreground">Valor Total</p>
                                            </div>
                                            <Badge variant="outline" className={`text-xs font-normal border ${selectedReceivable.liquidado === '1' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                {selectedReceivable.liquidado === '1' ? 'Liquidado' : 'Em Aberto'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Código:</span>
                                                <span className="font-medium">{selectedReceivable.codigo || `#${selectedReceivable.id}`}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Vencimento:</span>
                                                <span className="font-medium">{formatDate(selectedReceivable.data_vencimento)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Competência:</span>
                                                <span className="font-medium">{formatDate(selectedReceivable.data_competencia || "")}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Forma de Pagamento:</span>
                                                <span className="font-medium">{selectedReceivable.nome_forma_pagamento || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Plano de Contas:</span>
                                                <span className="font-medium">{selectedReceivable.nome_plano_conta || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Conta Bancária:</span>
                                                <span className="font-medium">{selectedReceivable.nome_conta_bancaria || "N/A"}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Valor Original:</span>
                                                <span className="font-medium">{formatCurrency(selectedReceivable.valor || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Juros:</span>
                                                <span className="font-medium">{formatCurrency(selectedReceivable.juros || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Desconto:</span>
                                                <span className="font-medium">{formatCurrency(selectedReceivable.desconto || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Taxa Banco:</span>
                                                <span className="font-medium">{formatCurrency(selectedReceivable.taxa_banco || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Taxa Operadora:</span>
                                                <span className="font-medium">{formatCurrency(selectedReceivable.taxa_operadora || 0)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t space-y-2">
                                            {selectedReceivable.descricao && (
                                                <div>
                                                    <span className="text-muted-foreground block text-xs">Descrição:</span>
                                                    <p className="text-sm bg-muted/50 p-2 rounded">{selectedReceivable.descricao}</p>
                                                </div>
                                            )}
                                            {selectedReceivable.observacao && (
                                                <div>
                                                    <span className="text-muted-foreground block text-xs">Observação:</span>
                                                    <p className="text-sm italic">{selectedReceivable.observacao}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                                            <div>
                                                <span className="block">Cliente: {selectedReceivable.nome_cliente || "N/A"}</span>
                                                <span className="block">Loja: {selectedReceivable.nome_loja || "N/A"}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block">Cadastrado em: {selectedReceivable.cadastrado_em}</span>
                                                {selectedReceivable.usuario_id && <span className="block">Por: {selectedReceivable.nome_usuario}</span>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {selectedSale && (selectedSale.produtos || selectedSale.itens) && (
                                    <Card>
                                        <CardHeader className="p-4 py-3 border-b bg-muted/20">
                                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                <div className="p-1 bg-primary/10 rounded">
                                                    <FileText className="w-4 h-4 text-primary" />
                                                </div>
                                                Itens da Venda #{selectedSale.codigo || selectedSale.numero}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y">
                                                {/* Handle new structure 'produtos' */}
                                                {selectedSale.produtos?.map((item, index) => (
                                                    <div key={item.produto.produto_id || index} className="p-3 text-sm flex justify-between items-center hover:bg-muted/30 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{item.produto.nome_produto || "Produto Desconhecido"}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Qtd: {Number(item.produto.quantidade).toFixed(2)} | Unit: {formatCurrency(item.produto.valor_venda)}
                                                            </div>
                                                        </div>
                                                        <div className="text-right font-medium">
                                                            {formatCurrency(item.produto.valor_total)}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Fallback to old structure 'itens' if 'produtos' is empty */}
                                                {!selectedSale.produtos && selectedSale.itens?.map((item, index) => (
                                                    <div key={item.id || index} className="p-3 text-sm flex justify-between items-center hover:bg-muted/30 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{item.produto?.nome || "Produto Desconhecido"}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Cod: {item.produto?.codigo || "N/A"} | Qtd: {Number(item.quantidade).toFixed(2)}
                                                            </div>
                                                        </div>
                                                        <div className="text-right font-medium">
                                                            {formatCurrency(item.valor_total)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-muted/20 border-t flex justify-between items-center text-sm font-semibold">
                                                <span>Total da Venda</span>
                                                <span>{formatCurrency(selectedSale.valor_total)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : detailLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p>Carregando detalhes...</p>
                            </div>
                        ) : isLoading && receivables.length === 0 ? (
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
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                                                    <div className="space-y-1">
                                                        <div className="font-semibold text-lg flex items-center gap-2">
                                                            {formatCurrency(item.valor_total || item.valor)}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Vencimento: <span className="font-medium text-foreground">{formatDate(item.data_vencimento)}</span>
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs font-normal bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">
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

                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center gap-2 hover:bg-primary/5"
                                                            onClick={() => fetchReceivableDetail(item.id)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Detalhar
                                                        </Button>
                                                    </div>
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
