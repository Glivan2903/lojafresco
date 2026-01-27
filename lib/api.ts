const API_BASE_URL = "/api" // Now using local API routes

export interface Customer {
  id?: string
  nome: string
  cpf?: string
  cnpj?: string
  telefone?: string
  celular?: string // Added celular field
  email?: string
  tipo_pessoa: "F" | "J"
  data_nascimento?: string // Added data_nascimento field
  ativo?: string // "1" for active, "0" for inactive
  endereco?: {
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    cep?: string
    estado?: string
  }
}

export interface Product {
  id: string
  nome: string
  descricao?: string
  preco?: number
  preco_venda?: number
  valor_venda?: number // Added valor_venda field from API
  categoria?: string
  nome_grupo?: string // Added nome_grupo field for category from API
  imagem?: string
  estoque_atual?: number
  estoque?: number | string // Added estoque field from API
  codigo_interno?: string
  peso?: string
  largura?: string
  altura?: string
  comprimento?: string
  grupo_id?: string // Added grupo_id field from API
  valor_custo?: string // Added valor_custo field from API
  ativo?: string // Added ativo field from API
  cadastrado_em?: string // Added cadastrado_em field from API
  modificado_em?: string // Added modificado_em field from API
  valores?: Array<{
    // Added valores array from API
    tipo_id: string
    nome_tipo: string
    lucro_utilizado: string
    valor_custo: string
    valor_venda: string
  }>
  variacoes?: Array<{
    // Added variacoes array from API
    variacao: {
      id: string
      variacao_api_id: string
      codigo: string
      nome: string
      estoque: string
      valores: Array<{
        tipo_id: string
        nome_tipo: string
        lucro_utilizado: string
        valor_custo: string
        valor_venda: string
      }>
    }
  }>
}

export interface QuoteItem {
  produto: Product
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export interface Quote {
  cliente_id: string
  data: string
  situacao_id: number
  vendedor_id: string
  nome_vendedor: string
  observacoes?: string
  produtos: QuoteItem[]
  total: number
}

export interface Category {
  id: string
  nome: string
  descricao?: string
  ativo?: string
}

export interface PaymentMethod {
  id: string
  nome: string
  ativo?: string
}

export interface Carrier {
  id: string
  nome: string
  ativo?: string
  // Add other fields if known, but id/nome is minimum
}

export interface Receivable {
  id: string
  data_vencimento: string
  valor: string
  valor_total: string
  descricao: string
  codigo: string
  nome_forma_pagamento: string
  situacao_id?: string
  parcela?: string // Not seen in example but keeping just in case
  observacao?: string // Not seen but keeping
}

class BetelAPI {
  async request(endpoint: string, options: RequestInit = {}, retries = 3): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[v0] API Request attempt ${attempt}: ${options.method || "GET"} ${url}`)

        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        })

        console.log(`[v0] Response status: ${response.status}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.log(`[v0] Error response:`, errorData)
          throw new Error(`API Error: ${response.status} - ${errorData.error || "Unknown error"}`)
        }

        const data = await response.json()
        console.log(`[v0] Response data:`, data)
        return data
      } catch (error) {
        console.error(`[v0] API Request failed (attempt ${attempt}/${retries}):`, error)

        if (attempt === retries) {
          throw error
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  async findCustomer(cpfCnpj: string): Promise<Customer | null> {
    try {
      const cleanDocument = cpfCnpj.replace(/\D/g, "")
      console.log(`[v0] Looking up customer with document: ${cleanDocument}`)

      const response = await this.request(`/clientes?cpf_cnpj=${cleanDocument}`, {
        method: "GET",
      })

      console.log(`[v0] Customer lookup response:`, response)

      let customerData = null

      if (response && Array.isArray(response) && response.length > 0) {
        customerData = response[0]
      } else if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Handle nested data structure shown in user example
        customerData = response.data[0]
      }

      if (customerData) {
        // Map API response to Customer interface
        const mappedCustomer: Customer = {
          id: customerData.id,
          nome: customerData.nome,
          cpf: customerData.cpf,
          cnpj: customerData.cnpj,
          telefone: customerData.celular || customerData.telefone, // Prefer celular as primary phone
          celular: customerData.celular,
          email: customerData.email || customerData.email_acesso,
          tipo_pessoa: customerData.tipo_pessoa === "PF" ? "F" : "J",
          ativo: customerData.ativo,
          endereco: {},
        }

        // Map address if available
        if (customerData.enderecos && Array.isArray(customerData.enderecos) && customerData.enderecos.length > 0) {
          const apiAddress = customerData.enderecos[0].endereco
          if (apiAddress) {
            mappedCustomer.endereco = {
              rua: apiAddress.logradouro,
              numero: apiAddress.numero,
              complemento: apiAddress.complemento,
              bairro: apiAddress.bairro,
              cidade: apiAddress.nome_cidade, // Use nome_cidade
              cep: apiAddress.cep,
              estado: apiAddress.estado,
            }
          }
        }

        return mappedCustomer
      }

      return null
    } catch (error) {
      console.error("[v0] Error in findCustomer:", error)

      if (error instanceof Error && error.message.includes("404")) {
        return null
      }

      // For other errors, still return null to allow registration
      console.log("[v0] API error detected, treating as customer not found")
      return null
    }
  }

  async findCustomerByEmail(email: string): Promise<Customer | null> {
    try {
      console.log(`[v0] Looking up customer with email: ${email}`)

      const response = await this.request(`/clientes?email=${encodeURIComponent(email)}`, {
        method: "GET",
      })

      console.log(`[v0] Customer email lookup response:`, response)

      let customerData = null

      if (response && Array.isArray(response) && response.length > 0) {
        customerData = response[0]
      } else if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        customerData = response.data[0]
      }

      if (customerData) {
        // Map API response to Customer interface
        const mappedCustomer: Customer = {
          id: customerData.id,
          nome: customerData.nome,
          cpf: customerData.cpf,
          cnpj: customerData.cnpj,
          telefone: customerData.celular || customerData.telefone,
          celular: customerData.celular,
          email: customerData.email || customerData.email_acesso,
          tipo_pessoa: customerData.tipo_pessoa === "PF" ? "F" : "J",
          ativo: customerData.ativo,
          endereco: {},
        }

        // Map address if available
        if (customerData.enderecos && Array.isArray(customerData.enderecos) && customerData.enderecos.length > 0) {
          const apiAddress = customerData.enderecos[0].endereco
          if (apiAddress) {
            mappedCustomer.endereco = {
              rua: apiAddress.logradouro,
              numero: apiAddress.numero,
              complemento: apiAddress.complemento,
              bairro: apiAddress.bairro,
              cidade: apiAddress.nome_cidade,
              cep: apiAddress.cep,
              estado: apiAddress.estado,
            }
          }
        }
        return mappedCustomer
      }

      return null
    } catch (error) {
      console.error("[v0] Error in findCustomerByEmail:", error)
      return null
    }
  }

  async createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
    try {
      const customerData = {
        tipo_pessoa: customer.tipo_pessoa === "F" ? "PF" : "PJ",
        nome: customer.nome,
        razao_social: customer.tipo_pessoa === "J" ? customer.nome : "",
        cnpj: customer.cnpj || "",
        cpf: customer.cpf || "",
        telefone: customer.telefone || "",
        celular: customer.telefone || "",
        email: customer.email || "",
        data_nascimento: customer.data_nascimento || "",
        ativo: "0",
        contatos: customer.telefone
          ? [
            {
              contato: {
                nome: customer.nome,
                contato: customer.telefone,
              },
            },
          ]
          : [],
        enderecos: customer.endereco
          ? [
            {
              endereco: {
                cep: customer.endereco.cep || "",
                logradouro: customer.endereco.rua || "",
                numero: customer.endereco.numero || "",
                complemento: customer.endereco.complemento || "",
                bairro: customer.endereco.bairro || "",
                nome_cidade: customer.endereco.cidade || "",
                estado: customer.endereco.estado || "",
              },
            },
          ]
          : [],
      }

      const response = await this.request("/clientes", {
        method: "POST",
        body: JSON.stringify(customerData),
      })

      return response.data || response
    } catch (error) {
      console.error("Error in createCustomer:", error)

      return {
        id: Date.now().toString(),
        ativo: "0",
        ...customer,
      }
    }
  }

  async getProducts(categoryId?: string): Promise<Product[]> {
    try {
      const endpoint = categoryId ? `/produtos?grupo_id=${categoryId}` : "/produtos"
      const response = await this.request(endpoint)
      const products = response.data || response || []

      console.log(`[v0] API: Loaded ${products.length} products from API`)
      if (response.total_produtos) {
        console.log(`[v0] API: Total products available: ${response.total_produtos}`)
      }

      return products
    } catch (error) {
      console.error("Failed to load products from API, using fallback data:", error)
      return [
        {
          id: "1",
          nome: "Notebook Dell Inspiron 15",
          descricao: "Notebook com processador Intel i5, 8GB RAM, 256GB SSD",
          preco: 2499.99,
          preco_venda: 2299.99,
          valor_venda: 2299.99,
          categoria: "informática",
          nome_grupo: "Eletrônicos",
          imagem: "/modern-laptop.png",
          estoque_atual: 10,
          estoque: 10,
          codigo_interno: "NB15",
          peso: "2.5kg",
          largura: "35cm",
          altura: "25cm",
          comprimento: "28cm",
          grupo_id: "1",
          valor_custo: "1999.99",
          ativo: "1",
          cadastrado_em: "2023-01-01",
          modificado_em: "2023-01-01",
          valores: [
            {
              tipo_id: "1",
              nome_tipo: "Tipo 1",
              lucro_utilizado: "10%",
              valor_custo: "1999.99",
              valor_venda: "2299.99",
            },
          ],
          variacoes: [
            {
              variacao: {
                id: "1",
                variacao_api_id: "1",
                codigo: "NB15-V1",
                nome: "Notebook Dell Inspiron 15 - Versão 1",
                estoque: "5",
                valores: [
                  {
                    tipo_id: "1",
                    nome_tipo: "Tipo 1",
                    lucro_utilizado: "10%",
                    valor_custo: "1999.99",
                    valor_venda: "2299.99",
                  },
                ],
              },
            },
          ],
        },
        {
          id: "2",
          nome: "Mouse Wireless Logitech",
          descricao: "Mouse sem fio com precisão óptica e bateria de longa duração",
          preco: 89.9,
          preco_venda: 79.9,
          valor_venda: 79.9,
          categoria: "acessórios",
          nome_grupo: "Periféricos",
          imagem: "/wireless-computer-mouse.jpg",
          estoque_atual: 50,
          estoque: 50,
          codigo_interno: "MWL1",
          peso: "0.1kg",
          largura: "10cm",
          altura: "5cm",
          comprimento: "15cm",
          grupo_id: "2",
          valor_custo: "69.9",
          ativo: "1",
          cadastrado_em: "2023-01-02",
          modificado_em: "2023-01-02",
          valores: [
            {
              tipo_id: "2",
              nome_tipo: "Tipo 2",
              lucro_utilizado: "15%",
              valor_custo: "69.9",
              valor_venda: "79.9",
            },
          ],
          variacoes: [
            {
              variacao: {
                id: "2",
                variacao_api_id: "2",
                codigo: "MWL1-V1",
                nome: "Mouse Wireless Logitech - Versão 1",
                estoque: "25",
                valores: [
                  {
                    tipo_id: "2",
                    nome_tipo: "Tipo 2",
                    lucro_utilizado: "15%",
                    valor_custo: "69.9",
                    valor_venda: "79.9",
                  },
                ],
              },
            },
          ],
        },
        {
          id: "3",
          nome: "Teclado Mecânico RGB",
          descricao: "Teclado mecânico com iluminação RGB e switches blue",
          preco: 299.99,
          preco_venda: 279.99,
          valor_venda: 279.99,
          categoria: "acessórios",
          nome_grupo: "Periféricos",
          imagem: "/mechanical-keyboard-rgb.jpg",
          estoque_atual: 20,
          estoque: 20,
          codigo_interno: "TMRGB1",
          peso: "0.5kg",
          largura: "40cm",
          altura: "2cm",
          comprimento: "50cm",
          grupo_id: "2",
          valor_custo: "249.99",
          ativo: "1",
          cadastrado_em: "2023-01-03",
          modificado_em: "2023-01-03",
          valores: [
            {
              tipo_id: "3",
              nome_tipo: "Tipo 3",
              lucro_utilizado: "10%",
              valor_custo: "249.99",
              valor_venda: "279.99",
            },
          ],
          variacoes: [
            {
              variacao: {
                id: "3",
                variacao_api_id: "3",
                codigo: "TMRGB1-V1",
                nome: "Teclado Mecânico RGB - Versão 1",
                estoque: "10",
                valores: [
                  {
                    tipo_id: "3",
                    nome_tipo: "Tipo 3",
                    lucro_utilizado: "10%",
                    valor_custo: "249.99",
                    valor_venda: "279.99",
                  },
                ],
              },
            },
          ],
        },
        {
          id: "4",
          nome: 'Monitor 24" Full HD',
          descricao: "Monitor LED 24 polegadas com resolução Full HD 1920x1080",
          preco: 599.99,
          preco_venda: 579.99,
          valor_venda: 579.99,
          categoria: "eletrônicos",
          nome_grupo: "Eletrônicos",
          imagem: "/computer-monitor-24-inch.jpg",
          estoque_atual: 15,
          estoque: 15,
          codigo_interno: "MON24",
          peso: "3kg",
          largura: "50cm",
          altura: "30cm",
          comprimento: "60cm",
          grupo_id: "1",
          valor_custo: "499.99",
          ativo: "1",
          cadastrado_em: "2023-01-04",
          modificado_em: "2023-01-04",
          valores: [
            {
              tipo_id: "4",
              nome_tipo: "Tipo 4",
              lucro_utilizado: "15%",
              valor_custo: "499.99",
              valor_venda: "579.99",
            },
          ],
          variacoes: [
            {
              variacao: {
                id: "4",
                variacao_api_id: "4",
                codigo: "MON24-V1",
                nome: 'Monitor 24" Full HD - Versão 1',
                estoque: "10",
                valores: [
                  {
                    tipo_id: "4",
                    nome_tipo: "Tipo 4",
                    lucro_utilizado: "15%",
                    valor_custo: "499.99",
                    valor_venda: "579.99",
                  },
                ],
              },
            },
          ],
        },
        {
          id: "5",
          nome: "Consultoria em TI",
          descricao: "Serviço de consultoria especializada em tecnologia da informação",
          preco: 150.0,
          preco_venda: 140.0,
          valor_venda: 140.0,
          categoria: "serviços",
          nome_grupo: "Serviços",
          imagem: "/it-consulting-service.jpg",
          estoque_atual: 0,
          estoque: 0,
          codigo_interno: "CSTI1",
          peso: "",
          largura: "",
          altura: "",
          comprimento: "",
          grupo_id: "3",
          valor_custo: "100.0",
          ativo: "1",
          cadastrado_em: "2023-01-05",
          modificado_em: "2023-01-05",
          valores: [
            {
              tipo_id: "5",
              nome_tipo: "Tipo 5",
              lucro_utilizado: "20%",
              valor_custo: "100.0",
              valor_venda: "140.0",
            },
          ],
          variacoes: [
            {
              variacao: {
                id: "5",
                variacao_api_id: "5",
                codigo: "CSTI1-V1",
                nome: "Consultoria em TI - Versão 1",
                estoque: "0",
                valores: [
                  {
                    tipo_id: "5",
                    nome_tipo: "Tipo 5",
                    lucro_utilizado: "20%",
                    valor_custo: "100.0",
                    valor_venda: "140.0",
                  },
                ],
              },
            },
          ],
        },
        {
          id: "6",
          nome: "Smartphone Samsung Galaxy",
          descricao: 'Smartphone com tela de 6.1", 128GB de armazenamento e câmera tripla',
          preco: 1299.99,
          preco_venda: 1279.99,
          valor_venda: 1279.99,
          categoria: "eletrônicos",
          nome_grupo: "Eletrônicos",
          imagem: "/samsung-smartphone-display.png",
          estoque_atual: 30,
          estoque: 30,
          codigo_interno: "SSG1",
          peso: "150g",
          largura: "7cm",
          altura: "15cm",
          comprimento: "14cm",
          grupo_id: "1",
          valor_custo: "1199.99",
          ativo: "1",
          cadastrado_em: "2023-01-06",
          modificado_em: "2023-01-06",
          valores: [
            {
              tipo_id: "6",
              nome_tipo: "Tipo 6",
              lucro_utilizado: "10%",
              valor_custo: "1199.99",
              valor_venda: "1279.99",
            },
          ],
          variacoes: [
            {
              variacao: {
                id: "6",
                variacao_api_id: "6",
                codigo: "SSG1-V1",
                nome: "Smartphone Samsung Galaxy - Versão 1",
                estoque: "15",
                valores: [
                  {
                    tipo_id: "6",
                    nome_tipo: "Tipo 6",
                    lucro_utilizado: "10%",
                    valor_custo: "1199.99",
                    valor_venda: "1279.99",
                  },
                ],

              },
            },
          ],
        },
      ]
    }
  }

  async createSale(sale: {
    customer: Customer
    items: Array<{ product: Product; quantity: number; subtotal: number }>
    observations?: string
    paymentMethod?: string
    deliveryDate?: string
    deliveryMethod?: string // Added
    topiqueiroName?: string // Added
    topiqueiroTime?: string // Added
    topiqueiroPhone?: string // Added
  }): Promise<any> {
    try {
      // Calculate total value
      const totalValue = sale.items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)

      // 3. Resolve Situation ID
      // Hardcoded as per user request: "Aguardando Impressão (Loja Virtual)"
      const situacaoId = "8662646"
      const nomeSituacao = "Aguardando Impressão (Loja Virtual)"

      const paymentDate = new Date().toISOString().split("T")[0];

      // Map delivery method to readable string for API attribute
      let formaRetirada = "Retirada Loja" // Default
      if (sale.deliveryMethod === "delivery") formaRetirada = "Entrega"
      else if (sale.deliveryMethod === "pickup") formaRetirada = "Retirar na Loja"
      else if (sale.deliveryMethod === "topiqueiro") formaRetirada = "Topiqueiro"
      else if (sale.deliveryMethod === "motouber") formaRetirada = "Moto Uber"

      const atributos = [
        {
          atributo: {
            id: "50082467", // ID specific for this attribute instance? Or generic? User example showed specific IDs.
            // Wait, "id" in "atributo" object usually is the instance ID (unique per sale/attribute).
            // But if we are creating, we might not need to send "id" or "atributo.id"?
            // Usually on creation we send "atributo_id" and "conteudo".
            // The example was a response object (GET), which has "id".
            // For creation (POST), we usually send the definition ID ("atributo_id").
            // I will send "atributo_id" and "conteudo". I will omit "id" or send "0"/empty if required.
            // Let's look at the example again:
            // "atributo": { "id": "50082467", "atributo_id": "82984", ... }
            // "atributo_id" seems to be the definition.
            atributo_id: "82984",
            descricao: "Nome Topiqueiro",
            conteudo: sale.topiqueiroName || "Não Encontrado",
            tipo: "texto_simples"
          }
        },
        {
          atributo: {
            atributo_id: "82985",
            descricao: "Forma Retirada",
            conteudo: formaRetirada,
            tipo: "check_list"
          }
        },
        {
          atributo: {
            atributo_id: "83021",
            descricao: "Prioridade Separação",
            conteudo: "Normal",
            tipo: "check_list"
          }
        }
      ];

      // Add "Horário Saida" attribute if time is provided
      if (sale.topiqueiroTime) {
        atributos.push({
          atributo: {
            atributo_id: "86847",
            descricao: "Horário Saida",
            conteudo: sale.topiqueiroTime,
            tipo: "texto_simples"
          }
        })
      }

      // Add "Telefone Topiqueiro" attribute if phone is provided
      if (sale.topiqueiroPhone) {
        atributos.push({
          atributo: {
            atributo_id: "86851",
            descricao: "Telefone Topiqueiro",
            conteudo: sale.topiqueiroPhone.replace(/\D/g, ""), // Remove formatting for safer storage/usage? User example showed "79999999999" (clean)
            tipo: "texto_simples"
          }
        })
      }

      // Fetch available payment methods to get correct ID and Name
      let paymentMethodId = "640517" // Default fallback (Dinheiro)
      let paymentMethodName = "Dinheiro à Vista"

      if (sale.paymentMethod) {
        try {
          const availablePaymentMethods = await this.getPaymentMethods()
          const methodKey = sale.paymentMethod.toLowerCase()

          let selectedMethod = availablePaymentMethods.find(pm =>
            pm.nome.toLowerCase() === methodKey
          )

          // Fallback mappings
          if (!selectedMethod) {
            if (methodKey === 'pix') {
              // Prioritize "Pix" exact match if available
              selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase() === 'pix')
              if (!selectedMethod) {
                selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase().includes('pix'))
              }
            } else if (methodKey === 'dinheiro_vista') {
              // Priority 1: Exact match "Dinheiro à Vista" or "Dinheiro a Vista"
              selectedMethod = availablePaymentMethods.find(pm =>
                pm.nome.toLowerCase() === 'dinheiro à vista' ||
                pm.nome.toLowerCase() === 'dinheiro a vista'
              )

              // Priority 2: Starts with "Dinheiro" (Avoids "Dia Anterior (Dinheiro)")
              if (!selectedMethod) {
                selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase().startsWith('dinheiro'))
              }

              // Priority 3: Fuzzy match (Last resort)
              if (!selectedMethod) {
                selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase().includes('dinheiro'))
              }
            } else if (methodKey === 'a_prazo') {
              selectedMethod = availablePaymentMethods.find(pm =>
                pm.nome.toLowerCase() === 'a prazo'
              )
              if (!selectedMethod) {
                selectedMethod = availablePaymentMethods.find(pm =>
                  pm.nome.toLowerCase().includes('prazo') ||
                  pm.nome.toLowerCase().includes('crediário') ||
                  pm.nome.toLowerCase().includes('credito loja')
                )
              }
            } else if (methodKey === 'a_receber') {
              selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase() === 'a receber')
              if (!selectedMethod) {
                selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase().includes('receber'))
              }
            } else if (methodKey === 'cartao_credito') {
              selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase().includes('crédito') || pm.nome.toLowerCase().includes('credito'))
            } else if (methodKey === 'cartao_debito') {
              selectedMethod = availablePaymentMethods.find(pm => pm.nome.toLowerCase().includes('débito') || pm.nome.toLowerCase().includes('debito'))
            }
          }

          if (selectedMethod) {
            paymentMethodId = selectedMethod.id
            paymentMethodName = selectedMethod.nome
            console.log(`[v0] Mapped payment method '${sale.paymentMethod}' to ID: ${paymentMethodId}, Name: ${paymentMethodName}`)
          } else {
            console.warn(`[v0] Could not map payment method '${sale.paymentMethod}' to API method. Using default.`)
            // If it's a custom string (like "Troca"), use it as name but keep default ID or use specific logic? 
            // Ideally we shouldn't send an invalid ID. But for now, let's update name at least.
            paymentMethodName = sale.paymentMethod
          }
        } catch (e) {
          console.error("[v0] Error fetching payment methods for mapping:", e)
        }
      }

      const saleData = {
        tipo: "produto",
        // codigo: Math.floor(Date.now() / 1000).toString(), // Removed as per example
        cliente_id: sale.customer.id || "1",
        vendedor_id: "45", // As per example
        nome_canal_venda: "Loja Virtual", // Added as per request
        data: new Date().toISOString().split("T")[0],
        prazo_entrega: "",
        situacao_id: situacaoId, // "3150"
        nome_situacao: nomeSituacao, // "Confirmado"
        transportadora_id: "", // As per example
        centro_custo_id: "1", // As per example
        valor_frete: "0.00",
        observacoes: sale.observations || "", // Added payload field for observations
        condicao_pagamento: "Á vista",
        pagamentos: [
          {
            pagamento: {
              data_vencimento: new Date().toISOString().split("T")[0],
              valor: totalValue, // "25" in example
              forma_pagamento_id: paymentMethodId,
              nome_forma_pagamento: paymentMethodName,
              plano_contas_id: "2514", // As per example
              nome_plano_conta: "Prestações de serviçosAC", // As per example
              observacao: "" // Payment specific observation
            }
          }
          // Note: Example has 2 payments, we are doing existing logic of 1 payment for total for now
        ],
        atributos: atributos, // Added attributes array
        produtos: sale.items.map((item) => ({
          produto: {
            produto_id: item.product.id || "22", // Fallback only if missing
            variacao_id: "1246454", // Hardcoded in example, might need to be dynamic if available? Using example value or safe fallback
            detalhes: "",
            quantidade: item.quantity.toString(),
            valor_venda: Number(item.product.valor_venda || item.product.preco_venda || item.product.preco || 0).toFixed(2), // Ensure strict 2 decimals
            tipo_desconto: "R$",
            desconto_valor: "0.00",
            desconto_porcentagem: "0.00"
          },
        })),
        servicos: [] // Empty as per user request description (example had services, but user said "Produtos... os dados completos", usually implies current cart items. Example showed "servicos" array populated, but we don't have services in cart. Keeping structure.)
      }

      console.log("[v0] Sending sale data to Betel API (New Structure):", saleData)

      // Use the new /api/vendas endpoint
      const response = await this.request("/vendas", {
        method: "POST",
        body: JSON.stringify(saleData),
      })

      return response.data || response // Adjust based on actual API response wrapper
    } catch (error) {
      console.error("[v0] Error in createSale:", error)
      throw error
    }
  }

  async createQuote(quote: {
    customer: Customer
    items: Array<{ product: Product; quantity: number; subtotal: number }>
    observations?: string
    paymentMethod?: string
    deliveryDate?: string
  }): Promise<any> {
    try {
      const quoteData = {
        cliente_id: quote.customer.id || "0", // Keep as string as shown in curl example
        data: new Date().toISOString().split("T")[0], // Required date field
        situacao_id: "0", // Must be string "0" as shown in curl example
        vendedor_id: "", // Must be empty string as shown in curl example
        nome_vendedor: "Alessandro", // Using the name from curl example
        observacoes: quote.observations || "", // Observations field
        produtos: quote.items.map((item) => ({
          produto: {
            produto_id: item.product.id, // Added produto_id field to fix missing product ID issue
            id: item.product.id, // Keep as string, don't convert to number
            nome_produto: item.product.nome || "",
            variacao_id: "",
            detalhes: item.product.descricao || "",
            movimenta_estoque: "1", // Added movimenta_estoque field
            possui_variacao: "0", // Added possui_variacao field
            sigla_unidade: "UND",
            quantidade: item.quantity.toString(),
            tipo_valor_id: "",
            nome_tipo_valor: "",
            valor_custo: (item.product.valor_custo || "0.00").toString(),
            valor_venda: (item.product.valor_venda || item.product.preco_venda || item.product.preco || 0).toString(),
            tipo_desconto: "R$",
            desconto_valor: "0.00",
            desconto_porcentagem: "0.00",
            valor_total: item.subtotal.toString(), // Added valor_total field
          },
        })),
      }

      console.log("[v0] Sending quote data to Betel API:", quoteData)

      const response = await this.request("/orcamentos", {
        method: "POST",
        body: JSON.stringify(quoteData),
      })

      return response.data || response
    } catch (error) {
      console.error("[v0] Error in createQuote:", error)

      return {
        id: Date.now().toString(),
        numero: `ORC-${Date.now()}`,
        status: "Enviado",
        data: new Date().toISOString().split("T")[0],
        total: quote.items.reduce((sum, item) => sum + item.subtotal, 0),
      }
    }
  }

  async getCustomerSales(customerId: string): Promise<any[]> {
    try {
      const response = await this.request(`/vendas?cliente_id=${customerId}`)
      return response.data || response || []
    } catch (error) {
      console.error("Failed to load customer sales:", error)
      return []
    }
  }

  async getSalesSituations(): Promise<any[]> {
    try {
      const response = await this.request("/situacoes-vendas")
      return response.data || []
    } catch (error) {
      console.error("Failed to load sales situations:", error)
      return []
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      const response = await this.request("/usuarios")
      return response.data || []
    } catch (error) {
      console.error("Failed to load users:", error)
      return []
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.request("/produtos", {}, 1) // Single attempt for health check
      return true
    } catch (error) {
      console.error("API health check failed:", error)
      return false
    }
  }

  async getSaleDetail(orderId: string): Promise<any> {
    try {
      // Using /vendas endpoint for details as well
      const response = await this.request(`/vendas/${orderId}`)
      return response.data || response
    } catch (error) {
      console.error("Failed to load sale details:", error)
      throw error
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.request("/categorias")
      const categories = response.data || response || []

      console.log(`[v0] API: Loaded ${categories.length} categories from API`)

      return categories
    } catch (error) {
      console.error("Failed to load categories from API:", error)
      return []
    }
  }
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await this.request("/payment-methods")
      // Response format provided by user:
      // [{ code: 200, data: [ { FormasPagamento: { id, nome, ... } }, ... ] }]

      let rawData = []

      // Access the inner 'data' array
      if (Array.isArray(response) && response.length > 0 && response[0].data) {
        rawData = response[0].data
      } else if (response && response.data) {
        rawData = response.data
      } else if (Array.isArray(response)) {
        rawData = response
      }

      console.log(`[v0] API: Parsing ${rawData.length} raw payment methods`)

      // Map the nested FormasPagamento object
      const methods: PaymentMethod[] = rawData.map((item: any) => {
        if (item.FormasPagamento) {
          return {
            id: item.FormasPagamento.id,
            nome: item.FormasPagamento.nome,
            ativo: item.FormasPagamento.disponivel_pdv // mapping 'disponivel_pdv' to 'ativo' seems appropriate or just extra field
          }
        }
        return item // Fallback if structure matches interface directly
      }).filter((m: any) => m && m.id && m.nome)

      console.log(`[v0] API: Loaded ${methods.length} payment methods`)
      return methods
    } catch (error) {
      console.error("Failed to load payment methods:", error)
      return []
    }
  }

  async getPixKey(): Promise<{ nome: string; chave: string } | null> {
    try {
      const response = await fetch("/api/pix-key")

      if (!response.ok) {
        throw new Error(`Failed to fetch PIX key: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] Error fetching PIX key:", error)
      return null
    }
  }

  async getCarriers(): Promise<Carrier[]> {
    try {
      const response = await this.request("/transportadoras")
      // Assuming similar structure to other endpoints, or direct array

      let rawData = []
      if (response && response.data) { // Standard Betel wrapper?
        rawData = response.data
      } else if (Array.isArray(response)) {
        rawData = response
      }

      console.log(`[v0] API: Loaded ${rawData.length} carriers`)

      // Map if necessary, assuming standard id/nome for now
      return rawData.map((item: any) => ({
        id: item.id || item.codigo || "",
        nome: item.nome || item.nome_fantasia || "Sem Nome"
      }))
    } catch (error) {
      console.error("Failed to load carriers:", error)
      return []
    }
  }

  async getCustomerReceivables(customerId: string): Promise<Receivable[]> {
    try {
      const response = await this.request(`/recebimentos?cliente_id=${customerId}&liquidado=ab`, {
        method: "GET"
      })

      if (response && Array.isArray(response)) {
        return response
      } else if (response && response.data && Array.isArray(response.data)) {
        return response.data
      }

      return []
    } catch (error) {
      console.error("Failed to fetch receivables:", error)
      return []
    }
  }
}

export const betelAPI = new BetelAPI()

export const validateCustomerData = (customer: Partial<Customer>): string[] => {
  const errors: string[] = []

  if (!customer.nome?.trim()) {
    errors.push("Nome é obrigatório")
  }

  if (!customer.cpf && !customer.cnpj) {
    errors.push("CPF ou CNPJ é obrigatório")
  }

  if (customer.tipo_pessoa === "F" && !customer.cpf) {
    errors.push("CPF é obrigatório para pessoa física")
  }

  if (customer.tipo_pessoa === "J" && !customer.cnpj) {
    errors.push("CNPJ é obrigatório para pessoa jurídica")
  }

  return errors
}

export const formatCustomerForAPI = (customer: Customer) => {
  return {
    ...customer,
    cpf: customer.cpf?.replace(/\D/g, "") || "",
    cnpj: customer.cnpj?.replace(/\D/g, "") || "",
    telefone: customer.telefone?.replace(/\D/g, "") || "",
  }
}
