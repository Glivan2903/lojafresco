"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Loader2,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Filter,
  Info,
  CheckCircle,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { betelAPI, type Product, type Customer, type Category } from "@/lib/api"
import { useDebounce } from "use-debounce"
import { AddToCartModal } from "@/components/add-to-cart-modal"

interface ProductCatalogProps {
  customer: Customer
  onAddToQuote: (product: Product, quantity: number) => void
  quoteItemsCount: number
  quoteItems?: Array<{ product: Product; quantity: number; subtotal: number }>
}

interface ProductWithQuantity extends Product {
  quantity: number
}

export function ProductCatalog({ customer, onAddToQuote, quoteItemsCount, quoteItems = [] }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 1000)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"card" | "list">("list")
  const [categories, setCategories] = useState<Category[]>([])
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [lastAddedProduct, setLastAddedProduct] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  useEffect(() => {
    loadCategories()
  }, [])


  useEffect(() => {
    // Reset to page 1 when filters change (except pagination)
    setCurrentPage(1)
  }, [selectedCategory, onlyAvailable, debouncedSearchTerm])

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const queryParams = new URLSearchParams()
      queryParams.append("page", currentPage.toString())
      queryParams.append("limit", "100")

      if (selectedCategory !== "all") {
        queryParams.append("grupo_id", selectedCategory)
      }

      if (onlyAvailable) {
        queryParams.append("available", "true")
      }

      if (debouncedSearchTerm) {
        queryParams.append("nome", debouncedSearchTerm)
      }

      console.log(`[v0] Fetching products with params: ${queryParams.toString()}`)
      const response = await fetch(`/api/produtos?${queryParams.toString()}`)

      const data = await response.json()

      console.log("[v0] Products response:", {
        products_count: data.data?.length,
        total_products: data.total_produtos,
        total_paginas: data.total_paginas,
      })

      if (data.data && Array.isArray(data.data)) {
        setProducts(data.data)
        setTotalPages(data.total_paginas || 1)
        setTotalProducts(data.total_produtos || 0)
      } else {
        setProducts([])
        setError("Nenhum produto encontrado")
      }
    } catch (err) {
      console.error("Error loading products:", err)
      setError("Erro ao carregar produtos. Tente novamente.")
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedCategory, onlyAvailable, debouncedSearchTerm])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])


  const loadCategories = async () => {
    try {
      const categoriesData = await betelAPI.getCategories()
      console.log("[v0] Categories loaded:", categoriesData)

      const blockedCategories = ["Insumos", "Mercadoria", "Conector", "Gaveta", "Insumoo", "Placa", "Slot", "Insumo"]

      const filteredCategories = categoriesData.filter(c =>
        !blockedCategories.some(blocked => c.nome.toLowerCase().includes(blocked.toLowerCase()))
      )

      const sortedCategories = filteredCategories.sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
      )

      setCategories(sortedCategories)
    } catch (err) {
      console.error("Error loading categories:", err)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    // Page reset is handled by the useEffect above
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }

  const getQuantityInCart = (productId: string) => {
    const cartItem = quoteItems.find((item) => item.product.id === productId)
    return cartItem ? cartItem.quantity : 0
  }

  const getAvailableStock = (product: Product) => {
    const totalStock = product.estoque || product.estoque_atual || 0
    const numStock = typeof totalStock === "string" ? Number.parseFloat(totalStock) : totalStock
    const quantityInCart = getQuantityInCart(product.id)
    return Math.max(0, numStock - quantityInCart)
  }

  const updateQuantity = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId)
    const availableStock = product ? getAvailableStock(product) : 0

    const validatedQuantity = Math.max(1, Math.min(quantity, availableStock))

    setProductQuantities((prev) => ({
      ...prev,
      [productId]: validatedQuantity,
    }))
  }

  const handleAddToQuote = (product: Product) => {
    const quantity = productQuantities[product.id] || 1
    const availableStock = getAvailableStock(product)

    if (quantity > availableStock) {
      const quantityInCart = getQuantityInCart(product.id)
      if (quantityInCart > 0) {
        setShowSuccessMessage(
          `Você já tem ${quantityInCart} unidades no carrinho. Estoque disponível: ${availableStock}`,
        )
      } else {
        setShowSuccessMessage(`Estoque insuficiente! Disponível: ${availableStock} unidades`)
      }
      return
    }

    onAddToQuote(product, quantity)
    setProductQuantities((prev) => ({ ...prev, [product.id]: 0 }))
    setLastAddedProduct(product.nome)
    setIsModalOpen(true)
  }

  const formatPrice = (product: Product) => {
    const price = product.valor_venda || product.preco_venda || product.preco
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price
    if (!numPrice || isNaN(numPrice)) {
      return "Consulte"
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numPrice)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPage === 1 || loading}
          className="h-8 bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="flex gap-1">
          {getPageNumbers().map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageClick(page)}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage === totalPages || loading}
          className="h-8 bg-transparent"
        >
          Próxima
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  const getProductImage = (product: Product) => {
    if (product.fotos && Array.isArray(product.fotos) && product.fotos.length > 0) {
      return product.fotos[0]
    }
    return null
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">


      <div className="sticky top-16 z-30 bg-background pt-3 pb-3 relative -mx-4 px-4 sm:mx-0 sm:px-0 border-b shadow-sm">
        <Search className="absolute left-0 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 ml-4 sm:ml-0" />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 border-yellow-400 focus-visible:ring-yellow-400 h-14 sm:h-16 text-lg sm:text-xl bg-background shadow-inner"
        />
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex gap-2 min-w-max">
              <Button
                key="all"
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange("all")}
                className="capitalize whitespace-nowrap"
              >
                Todos
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryChange(category.id)}
                  className="capitalize whitespace-nowrap"
                >
                  {category.nome.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="available-filter"
              checked={onlyAvailable}
              onCheckedChange={(checked) => {
                setOnlyAvailable(checked)
              }}
            />
            <Label htmlFor="available-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Apenas disponíveis
            </Label>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {Math.min((currentPage - 1) * 100 + 1, totalProducts)}-{Math.min(currentPage * 100, totalProducts)} de {totalProducts} produtos
          </span>
          <span>
            Página {currentPage} de {totalPages}
          </span>
        </div>
      </div>

      {renderPagination()}

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="text-muted-foreground space-y-2">
            <p className="text-base sm:text-lg">Nenhum produto encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
          </div>
        </div>
      )}

      {!loading && products.length > 0 && viewMode === "card" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
          {products.map((product) => {
            const quantity = productQuantities[product.id] || 1
            const availableStock = getAvailableStock(product)
            const isOutOfStock = availableStock <= 0

            return (
              <Card key={product.id} className="group hover:shadow-md transition-all duration-200 overflow-hidden">
                <CardHeader className="p-0">
                  <div className="aspect-square overflow-hidden bg-muted relative">
                    {getProductImage(product) && (
                      <img
                        src={getProductImage(product) || "/placeholder.svg"}
                        alt={product.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2 flex flex-col h-full">
                  <div className="space-y-1 flex-grow">
                    <CardTitle className="text-[10px] sm:text-xs leading-tight line-clamp-2 font-semibold min-h-[1.5rem] flex items-start -mt-1">
                      {product.nome}
                    </CardTitle>
                    {product.nome_grupo && (
                      <Badge variant="secondary" className="text-[8px] sm:text-xs px-1 py-0">
                        {product.nome_grupo.toLowerCase()}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    <div className="text-xs sm:text-sm font-bold text-primary">{formatPrice(product)}</div>

                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        disabled={quantity <= 1}
                        className="h-5 w-5 p-0"
                      >
                        <Minus className="w-2 h-2" />
                      </Button>
                      <span className="w-5 text-center font-medium text-[10px] sm:text-xs">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= availableStock}
                        className="h-5 w-5 p-0"
                      >
                        <Plus className="w-2 h-2" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-5 text-[10px] sm:text-xs bg-transparent"
                          >
                            <Info className="w-2 h-2 mr-1" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-lg">{product.nome}</DialogTitle>
                            <DialogDescription className="text-sm">Informações detalhadas do produto</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {getProductImage(product) && (
                              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                                <img
                                  src={getProductImage(product) || "/placeholder.svg"}
                                  alt={product.nome}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm">Descrição</h4>
                                <p className="text-sm text-muted-foreground">
                                  {product.descricao || "Sem descrição disponível"}
                                </p>
                              </div>
                              <div className="grid grid-cols-1 gap-4 text-sm">
                                <div>
                                  <h4 className="font-semibold">Preço</h4>
                                  <p className="text-primary font-bold">{formatPrice(product)}</p>
                                </div>
                              </div>
                              {product.codigo_interno && (
                                <div>
                                  <h4 className="font-semibold text-sm">Código</h4>
                                  <p className="text-sm text-muted-foreground">{product.codigo_interno}</p>
                                </div>
                              )}
                              {(product.peso || product.largura || product.altura || product.comprimento) && (
                                <div>
                                  <h4 className="font-semibold text-sm">Dimensões</h4>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    {product.peso && <p>Peso: {product.peso}kg</p>}
                                    {(product.largura || product.altura || product.comprimento) && (
                                      <p>
                                        Dimensões: {product.largura || "0"}cm × {product.altura || "0"}cm ×{" "}
                                        {product.comprimento || "0"}cm
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        onClick={() => handleAddToQuote(product)}
                        className="w-full h-5 text-[10px] sm:text-xs"
                        size="sm"
                        disabled={isOutOfStock}
                      >
                        <ShoppingCart className="w-2 h-2 mr-1" />
                        {isOutOfStock ? "Indisponível" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && products.length > 0 && viewMode === "list" && (
        <div className="space-y-1">
          {products.map((product) => {
            const quantity = productQuantities[product.id] || 1
            const availableStock = getAvailableStock(product)
            const isOutOfStock = availableStock <= 0

            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-2 px-2 sm:py-2 sm:px-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base leading-none mb-0.5">{product.nome}</h3>
                      <div className="flex items-center gap-2">
                        {product.nome_grupo && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                            {product.nome_grupo.toLowerCase()}
                          </Badge>
                        )}
                        <div className="text-sm sm:text-base font-bold text-primary">{formatPrice(product)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          disabled={quantity <= 1}
                          className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 sm:w-8 text-center font-medium text-sm">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= availableStock}
                          className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 h-7 sm:h-8"
                            >
                              <Info className="w-3 h-3 mr-1" />
                              Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-lg">{product.nome}</DialogTitle>
                              <DialogDescription className="text-sm">Informações detalhadas do produto</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {getProductImage(product) && (
                                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                                  <img
                                    src={getProductImage(product) || "/placeholder.svg"}
                                    alt={product.nome}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm">Descrição</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {product.descricao || "Sem descrição disponível"}
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 text-sm">
                                  <div>
                                    <h4 className="font-semibold">Preço</h4>
                                    <p className="text-primary font-bold">{formatPrice(product)}</p>
                                  </div>
                                </div>
                                {product.codigo_interno && (
                                  <div>
                                    <h4 className="font-semibold text-sm">Código</h4>
                                    <p className="text-sm text-muted-foreground">{product.codigo_interno}</p>
                                  </div>
                                )}
                                {(product.peso || product.largura || product.altura || product.comprimento) && (
                                  <div>
                                    <h4 className="font-semibold text-sm">Dimensões</h4>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      {product.peso && <p>Peso: {product.peso}kg</p>}
                                      {(product.largura || product.altura || product.comprimento) && (
                                        <p>
                                          Dimensões: {product.largura || "0"}cm × {product.altura || "0"}cm ×{" "}
                                          {product.comprimento || "0"}cm
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          onClick={() => handleAddToQuote(product)}
                          size="sm"
                          disabled={isOutOfStock}
                          className="text-xs sm:text-sm px-3 sm:px-4 h-7 sm:h-8"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          {isOutOfStock ? "Indisponível" : "Adicionar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {renderPagination()}

      <AddToCartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productName={lastAddedProduct}
      />
    </div>
  )
}
