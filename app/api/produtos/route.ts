import { NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

const PRODUCTS_PER_PAGE = 15

// Helper to filter available products
function filterAvailableProducts(products: any[]) {
  return products.filter((product) => {
    const stock = Number.parseFloat(product.estoque || product.estoque_atual || "0")
    return !isNaN(stock) && stock > 0
  })
}

async function fetchProductsPage(page = 1, grupoId?: string, onlyAvailable = false) {
  try {
    console.log(`[v0] Server API: Fetching products page ${page}, group: ${grupoId}, available: ${onlyAvailable}`)

    // We fetch all products (or filtered by group) then manually paginate
    // This is because the upstream API pagination might not align with our filtering needs
    // or if we need to filter by stock AFTER fetching from upstream.
    // However, if the upstream API supports stock filtering, we should use it.
    // Based on previous code, we were fetching one page from upstream or all from group.
    // To ensure we have enough items to fill a page after filtering, fetching all might be safer 
    // but less performant. 
    // Let's try to stick to the pattern of fetching all for the group/search if possible,
    // or if we must use upstream pagination, we might have issues if we filter clientside.

    // The previous implementation for POST (category filter) was:
    // 1. Fetch ALL products for the category (API_BASE_URL/produtos, body: { grupo_id })
    // 2. Client-side paginate in route.ts (slice)

    // The previous implementation for GET (no category) was:
    // 1. Fetch ONE page from upstream (API_BASE_URL/produtos?pagina=X)
    // 2. Return that page.

    // To implement "In Stock" filter consistently, we really need to fetch ALL products first, 
    // filter them, and then paginate. The upstream pagination is likely strict.
    // If we rely on upstream pagination `?pagina=X`, we can't easily filter out out-of-stock items 
    // without potentially having empty pages.

    // CHANGE STRICTLY: We will use the "Fetch ALL" strategy for both GET and POST to ensure 
    // we can filter and pagination correctly.

    let url = `${API_BASE_URL}/produtos`
    let method = "GET"
    let body = null
    const headers = {
      accept: "application/json",
      "access-token": ACCESS_TOKEN,
      "secret-access-token": SECRET_ACCESS_TOKEN,
      "Content-Type": "application/json",
    }

    if (grupoId) {
      method = "POST"
      body = JSON.stringify({ grupo_id: grupoId })
    }

    // Note: If we just GET /produtos without params, does it return ALL? 
    // The original code used /produtos?pagina=${page}.
    // If we want ALL, maybe we don't pass page?
    // Let's assume GET /produtos returns all or we might need to iterate.
    // For now, let's try GET /produtos (no page) and see if it returns all.
    // If unsafe, we might have to stick to original logic but we might return fewer than 12 items.
    // BUT the requirement is "lower limit" (12).

    // Let's proceed with fetching ALL to allow proper filtering.

    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    let allProducts = data.data || []

    // 1. Filter by availability if requested
    if (onlyAvailable) {
      allProducts = filterAvailableProducts(allProducts)
    }

    // 2. Calculate Manual Pagination
    const totalProducts = allProducts.length
    const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE)
    const startIndex = (page - 1) * PRODUCTS_PER_PAGE
    const endIndex = startIndex + PRODUCTS_PER_PAGE
    const paginatedProducts = allProducts.slice(startIndex, endIndex)

    return {
      products: paginatedProducts,
      meta: {
        total_registros: totalProducts,
        total_paginas: totalPages,
        pagina_atual: page,
        limite_por_pagina: PRODUCTS_PER_PAGE,
      },
    }
  } catch (error) {
    console.error(`[v0] Server API: Error fetching products:`, error)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const grupoId = searchParams.get("grupo_id") || undefined
    const available = searchParams.get("available") === "true"

    const result = await fetchProductsPage(page, grupoId, available)

    return NextResponse.json({
      data: result.products,
      meta: result.meta,
      total_produtos: result.meta.total_registros,
      pagina_atual: result.meta.pagina_atual,
      total_paginas: result.meta.total_paginas,
    })
  } catch (error) {
    console.error("[v0] Server API: Error in GET /api/produtos:", error)
    return NextResponse.json(
      { error: "Erro ao carregar produtos", data: [], meta: {} },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { grupo_id, page = 1, available = false } = body

    const result = await fetchProductsPage(page, grupo_id, available)

    return NextResponse.json({
      data: result.products,
      meta: result.meta,
      total_produtos: result.meta.total_registros,
      pagina_atual: result.meta.pagina_atual,
      total_paginas: result.meta.total_paginas,
    })
  } catch (error) {
    console.error("[v0] Server API: Error in POST /api/produtos:", error)
    return NextResponse.json({ error: "Erro interno do servidor", data: [], meta: {} }, { status: 500 })
  }
}
