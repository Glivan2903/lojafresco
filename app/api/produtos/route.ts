import { NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || ""
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ""
const SECRET_ACCESS_TOKEN = process.env.SECRET_ACCESS_TOKEN || ""

const PRODUCTS_PER_PAGE = 100

// Helper to filter available products
function filterAvailableProducts(products: any[]) {
  return products.filter((product) => {
    const stock = Number.parseFloat(product.estoque || product.estoque_atual || "0")
    return !isNaN(stock) && stock > 0
  })
}

async function fetchProductsPage(
  page = 1,
  grupoId?: string,
  onlyAvailable = false,
  limit = PRODUCTS_PER_PAGE,
  nome?: string, // New parameter for search
) {
  try {
    console.log(
      `[v0] Server API: Fetching products page ${page}, group: ${grupoId}, available: ${onlyAvailable}, limit: ${limit}, nome: ${nome}`,
    )

    // We pass the page parameter directly to the upstream API
    let url = `${API_BASE_URL}/produtos?pagina=${page}`

    // Attempt to pass limit if supported, otherwise rely on default
    url += `&limite=${limit}`

    // Add search term if provided
    if (nome) {
      url += `&nome=${encodeURIComponent(nome)}`
    }

    // Add group_id if provided (can be passed as query param too, based on instructions)
    if (grupoId) {
      url += `&grupo_id=${grupoId}`
    }

    const response = await fetch(url, {
      method: "GET", // Changing to GET as per instructions which use query params for everything
      headers: {
        accept: "application/json",
        "access-token": ACCESS_TOKEN,
        "secret-access-token": SECRET_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    let products = data.data || []

    // Capture the original count before filtering.
    // If the upstream API returns a full page (e.g. 100 items), it means there are likely more pages,
    // regardless of how many items remain after our local availability filter.
    const originalCount = products.length

    // 1. Filter by availability if requested
    // Note: This reduces the page size if items are filtered out,
    // but ensures we don't show out-of-stock items.
    if (onlyAvailable) {
      products = filterAvailableProducts(products)
    }

    // Try to find total count from upstream response
    // Common keys: total_registros, total, count, meta.total
    const totalRemote = data.total_registros || data.total || data.count || (data.meta && data.meta.total) || 0

    // Fallback logic for total pages if upstream doesn't provide it
    // If we have products, assume there might be at least this many.
    // If we received a full page, assume there's more.
    const estimatedTotal = totalRemote || (originalCount === limit ? (page + 1) * limit : page * limit)

    const totalPages = Math.ceil(estimatedTotal / limit)

    return {
      products: products,
      meta: {
        total_registros: totalRemote || estimatedTotal,
        total_paginas: totalPages,
        pagina_atual: page,
        limite_por_pagina: limit,
      },
    }
  } catch (error) {
    console.error(`[v0] Server API: Error fetching products:`, error)
    throw error
  }
}

async function fetchAllProductsFromUpstream(grupoId?: string, onlyAvailable = false) {
  // This function is kept for backward compatibility but might be less used now
  // that we are moving to server-side pagination.
  try {
    console.log(`[v0] Server API: Fetching ALL products (iterative), group: ${grupoId}, available: ${onlyAvailable}`)

    let allProducts: any[] = []
    let page = 1
    let keepFetching = true
    const SAFETY_LIMIT = 500 // Avoid infinite loops (allow up to 500 pages)
    const BATCH_SIZE = 100 // Try to fetch more per page to reduce requests

    while (keepFetching && page <= SAFETY_LIMIT) {
      console.log(`[v0] Server API: Fetching page ${page} with limit ${BATCH_SIZE}...`)
      // Use BATCH_SIZE for faster fetching
      const result = await fetchProductsPage(page, grupoId, false, BATCH_SIZE)

      if (result.products.length > 0) {
        allProducts = allProducts.concat(result.products)
      }

      // If we received fewer items than the limit, we've reached the end
      if (result.products.length < BATCH_SIZE) {
        keepFetching = false
        console.log(`[v0] Server API: Reached end of stream at page ${page} with ${result.products.length} items`)
      } else {
        // If we got a full page, check if the upstream reported total pages matches our current page
        if (result.meta.total_paginas && page >= result.meta.total_paginas) {
          keepFetching = false
          console.log(`[v0] Server API: Reached reported total pages ${result.meta.total_paginas}`)
        } else {
          page++
        }
      }
    }

    // 3. Filter if needed
    if (onlyAvailable) {
      allProducts = filterAvailableProducts(allProducts)
    }

    console.log(`[v0] Server API: Total products fetched and filtered: ${allProducts.length}`)

    return {
      products: allProducts,
      meta: {
        total_registros: allProducts.length,
        total_paginas: 1,
        pagina_atual: 1,
        limite_por_pagina: allProducts.length,
      },
    }
  } catch (error) {
    console.error("[v0] Server API: Error fetching all products:", error)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Always use page-based fetching if parameters are present, or default to page 1
    const page = Number.parseInt(searchParams.get("page") || "1")
    const grupoId = searchParams.get("grupo_id") || undefined
    const available = searchParams.get("available") === "true"
    const nome = searchParams.get("nome") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || String(PRODUCTS_PER_PAGE))

    let result
    // If specific "all" flag or no pagination params were traditionally used, we might use fetchAll
    // But for now, let's default to paginated fetching which is more efficient.
    // If the client REALLY wants everything, they loop. But usually they want a page.
    result = await fetchProductsPage(page, grupoId, available, limit, nome)

    return NextResponse.json({
      data: result.products,
      meta: result.meta,
      total_produtos: result.meta.total_registros,
      pagina_atual: result.meta.pagina_atual,
      total_paginas: result.meta.total_paginas,
    })
  } catch (error) {
    console.error("[v0] Server API: Error in GET /api/produtos:", error)
    return NextResponse.json({ error: "Erro ao carregar produtos", data: [], meta: {} }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { grupo_id, page, available = false, nome } = body
    const limit = body.limit || PRODUCTS_PER_PAGE

    const result = await fetchProductsPage(Number(page) || 1, grupo_id, available, limit, nome)

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
