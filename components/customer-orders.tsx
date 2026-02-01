"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Package, Calendar, DollarSign, Eye, ArrowLeft, RefreshCw } from "lucide-react"
import { betelAPI, type Customer } from "@/lib/api"

interface Order {
  id: string
  codigo?: string
  numero?: string
  situacao?: string
  nome_situacao?: string // Added nome_situacao field for proper status display
  status?: string
  data?: string
  data_criacao?: string // Added data_criacao field
  total?: number
  valor_total?: number
  produtos?: any[]
  items?: any[]
  quantidade_produtos?: number // Added quantidade_produtos field
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
      nome_produto: string
      quantidade: string
      valor_venda: string
      valor_total: string
    }
  }>
  cliente?: {
    nome: string
    cpf?: string
    cnpj?: string
  }
  observacoes?: string
}

interface CustomerOrdersProps {
  customer: Customer
  isOpen: boolean
  onClose: () => void
}

export function CustomerOrders({ customer, isOpen, onClose }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && customer.id) {
      fetchOrders()
    }
  }, [isOpen, customer.id])

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
      return new Date(dateString).toLocaleDateString("pt-BR")
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string | undefined): { badge: string; text: string } => {
    if (!status) return { badge: "bg-gray-100 text-gray-800", text: "text-gray-600" }

    const s = status.toLowerCase().trim()

    // Cinza
    if (s === "editando") return { badge: "bg-gray-100 text-gray-800", text: "text-gray-600" }

    // Vermelho
    if (s === "estornado" || s.includes("cancelado") || s.includes("rejeitado"))
      return { badge: "bg-red-100 text-red-800", text: "text-red-600" }

    // Púrpura
    if (s === "ficou na loja" || s.includes("embalado"))
      return { badge: "bg-purple-100 text-purple-800", text: "text-purple-600" }

    // Marrom
    if (s === "testando" || s === "saiu para entrega")
      return { badge: "bg-orange-100 text-orange-900", text: "text-orange-900" } // Using Orange-900/Amber for visual Brown

    // Azul
    if (s.includes("aguardando impressão")) return { badge: "bg-blue-100 text-blue-800", text: "text-blue-600" }

    // Laranja
    if (s === "aguardando pagamento" || s.includes("separando peças"))
      return { badge: "bg-orange-100 text-orange-800", text: "text-orange-600" }

    // Verde
    if (s === "pagamento concluido" || s === "pedido entregue" || s.includes("aprovado") || s.includes("confirmado"))
      return { badge: "bg-green-100 text-green-800", text: "text-green-600" }

    // Preto
    if (s.includes("impresso")) return { badge: "bg-gray-900 text-white", text: "text-black" }

    // Default
    return { badge: "bg-gray-100 text-gray-800", text: "text-gray-600" }
  }

  const getProductCount = (order: Order) => {
    if (order.quantidade_produtos) return order.quantidade_produtos
    if (order.produtos?.length) return order.produtos.length
    if (order.items?.length) return order.items.length
    return 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden border border-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 relative">

          {/* Placeholder for centering */}
          <div className="w-8"></div>

          <div className="flex items-center gap-2 flex-1 justify-center md:flex-none md:absolute md:left-1/2 md:transform md:-translate-x-1/2">
            <CardTitle className="text-lg font-bold text-center">
              {selectedOrder ? "Detalhes do Pedido" : "Consultar Pedidos"}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 z-10">
            {selectedOrder && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)} className="absolute left-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={fetchOrders} disabled={loading} title="Atualizar">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          {selectedOrder ? (
            <div className="space-y-6">
              {detailLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                    <p className="text-muted-foreground">Carregando detalhes...</p>
                  </div>
                </div>
              )}

              {!detailLoading && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <h3 className="font-semibold mb-2">Informações do Pedido</h3>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Código:</strong>{" "}
                            {selectedOrder.codigo || selectedOrder.numero || `#${selectedOrder.id}`}
                          </p>
                          <p>
                            <strong>Status:</strong>
                            <Badge
                              className={`ml-2 hover:bg-opacity-80 h-auto whitespace-normal text-center ${getStatusColor(selectedOrder.nome_situacao || selectedOrder.situacao).badge
                                }`}
                            >
                              {selectedOrder.nome_situacao || selectedOrder.situacao || "Status não informado"}
                            </Badge>
                          </p>
                          <p>
                            <strong>Data:</strong> {formatDate(selectedOrder.data_criacao || selectedOrder.data)}
                          </p>
                          <p>
                            <strong>Total:</strong> {formatCurrency(selectedOrder.total || selectedOrder.valor_total)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3">
                        <h3 className="font-semibold mb-2">Cliente</h3>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Nome:</strong> {selectedOrder.cliente?.nome || customer.nome}
                          </p>
                          {selectedOrder.cliente?.cpf && (
                            <p>
                              <strong>CPF:</strong> {selectedOrder.cliente.cpf}
                            </p>
                          )}
                          {selectedOrder.cliente?.cnpj && (
                            <p>
                              <strong>CNPJ:</strong> {selectedOrder.cliente.cnpj}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedOrder.produtos && selectedOrder.produtos.length > 0 && (
                    <Card>
                      <CardContent className="p-3">
                        <h3 className="font-semibold mb-4">Produtos ({selectedOrder.produtos.length} itens)</h3>
                        <div className="space-y-2">
                          {selectedOrder.produtos.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{item.produto.nome_produto}</p>
                                <p className="text-sm text-muted-foreground">
                                  Quantidade: {item.produto.quantidade} | Valor unitário:{" "}
                                  {formatCurrency(item.produto.valor_venda)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(item.produto.valor_total)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedOrder.observacoes && (
                    <Card>
                      <CardContent className="p-3">
                        <h3 className="font-semibold mb-2">Observações</h3>
                        <p className="text-sm">{selectedOrder.observacoes}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                    <p className="text-muted-foreground">Carregando pedidos...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" onClick={fetchOrders} className="mt-4 bg-transparent">
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!loading && !error && orders.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
                    <p className="text-muted-foreground">Você ainda não possui pedidos pendentes ou finalizados.</p>
                  </div>
                </div>
              )}

              {!loading && !error && orders.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Encontrados {orders.length} pedido(s) para {customer.nome}
                  </p>

                  {orders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-accent">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div className="space-y-2 mb-2 md:mb-0">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {order.codigo || order.numero || `Pedido #${order.id}`}
                              </span>
                            </div>
                            <Badge
                              className={`hover:bg-opacity-80 h-auto whitespace-normal text-center ${getStatusColor(order.nome_situacao || order.situacao).badge
                                }`}
                            >
                              {order.nome_situacao || order.situacao || "Status não informado"}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{formatDate(order.data_criacao || order.data)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{getProductCount(order)} produto(s)</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span
                                className={`font-medium ${getStatusColor(order.nome_situacao || order.situacao).text
                                  }`}
                              >
                                {formatCurrency(order.total || order.valor_total)}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchOrderDetail(order.id)}
                              className="bg-transparent"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Detalhar
                            </Button>
                          </div>
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
    </div>
  )
}
