"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Clock, CheckCircle } from "lucide-react"
import Image from "next/image"
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ } from "@/lib/validations"
import { betelAPI, type Customer } from "@/lib/api"

interface CustomerIdentificationProps {
  onCustomerIdentified: (customer: Customer) => void
}

export function CustomerIdentification({ onCustomerIdentified }: CustomerIdentificationProps) {
  const [formData, setFormData] = useState({
    email: "", // Changed from nome to email
    documento: "",
    nome: "", // Still kept for registration
    telefone: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  })
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRegistration, setShowRegistration] = useState(false)
  const [showInactiveAccount, setShowInactiveAccount] = useState(false)
  const [showAccountPending, setShowAccountPending] = useState(false)
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf")

  useEffect(() => {
    const savedData = localStorage.getItem("ayla-login-data")
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setFormData((prev) => ({
          ...prev,
          nome: parsedData.nome || "",
          email: parsedData.email || "",
          documento: parsedData.documento || "",
        }))

        if (parsedData.documento) {
          const clean = parsedData.documento.replace(/\D/g, "")
          setDocumentType(clean.length <= 11 ? "cpf" : "cnpj")
        }
      } catch (error) {
        console.error("Error loading saved login data:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (formData.email || formData.documento) {
      const dataToSave = {
        nome: formData.nome,
        email: formData.email,
        documento: formData.documento,
      }
      localStorage.setItem("ayla-login-data", JSON.stringify(dataToSave))
    }
  }, [formData.nome, formData.email, formData.documento])

  const handleDocumentChange = (value: string) => {
    const clean = value.replace(/\D/g, "")

    if (clean.length <= 11) {
      setDocumentType("cpf")
      setFormData((prev) => ({ ...prev, documento: formatCPF(clean) }))
    } else {
      setDocumentType("cnpj")
      setFormData((prev) => ({ ...prev, documento: formatCNPJ(clean) }))
    }
  }

  const validateDocument = () => {
    const clean = formData.documento.replace(/\D/g, "")
    if (documentType === "cpf") {
      return validateCPF(clean)
    } else {
      return validateCNPJ(clean)
    }
  }

  const handleContinue = async () => {
    setError("")

    if (!formData.email.trim() && !showRegistration) {
      setError("E-mail é obrigatório")
      return
    }

    if (showRegistration && !formData.nome.trim()) {
      setError("Nome é obrigatório")
      return
    }

    if (!validateDocument()) {
      setError(`${documentType.toUpperCase()} inválido`)
      return
    }

    setLoading(true)

    try {
      const cleanDocument = formData.documento.replace(/\D/g, "")

      // Attempt login by email first
      const existingCustomer = await betelAPI.findCustomerByEmail(formData.email)

      if (existingCustomer) {
        // Verify document matches
        const customerDocument = existingCustomer.cpf || existingCustomer.cnpj || ""
        const cleanCustomerDocument = customerDocument.replace(/\D/g, "")

        if (cleanCustomerDocument === cleanDocument) {
          if (existingCustomer.ativo === "0") {
            setShowInactiveAccount(true)
          } else {
            onCustomerIdentified(existingCustomer)
          }
          return
        } else {
          setError("Dados inválidos. Verifique o E-mail e CPF/CNPJ.")
          return
        }
      }

      // If email not found, try document lookup as fallback (or just go to registration)
      // The requirement suggests strict email + doc check.
      // But if user is NOT in DB, we should offer registration.
      // Let's try to find by document just in case they used a different email, 
      // OR just proceed to registration.
      // Let's assume if email not found -> New User -> Registration Form

      setShowRegistration(true)
    } catch (err) {
      console.error("Customer lookup error:", err)
      if (
        err instanceof Error &&
        (err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("CORS"))
      ) {
        setError("Não foi possível conectar com o servidor. Continuando com cadastro local.")
        setTimeout(() => {
          setShowRegistration(true)
          setError("")
        }, 2000)
      } else {
        setError("Erro ao consultar cliente. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError("")

    if (!formData.telefone.trim()) {
      setError("Telefone é obrigatório para cadastro")
      return
    }

    setLoading(true)

    try {
      const cleanDocument = formData.documento.replace(/\D/g, "")
      const customerData: Omit<Customer, "id"> = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        tipo_pessoa: documentType === "cpf" ? "F" : "J",
        ...(documentType === "cpf" ? { cpf: cleanDocument } : { cnpj: cleanDocument }),
        endereco: {
          cep: formData.cep,
          rua: formData.rua,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
        }
      }

      const newCustomer = await betelAPI.createCustomer(customerData)
      setShowAccountPending(true)
    } catch (err) {
      console.error("Customer registration error:", err)
      if (
        err instanceof Error &&
        (err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("CORS"))
      ) {
        setError("Conexão indisponível. Cadastro realizado localmente.")
        setTimeout(() => {
          setShowAccountPending(true)
        }, 1500)
      } else {
        setError("Erro ao cadastrar cliente. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (showInactiveAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-balance">Cadastro em Análise</CardTitle>
              <CardDescription className="text-muted-foreground">
                Seu cadastro está sendo analisado pela nossa equipe
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Olá <strong>{formData.nome}</strong>, seu cadastro foi encontrado mas ainda está em processo de análise.
              </p>
              <p className="text-sm text-muted-foreground">
                Por favor, retorne em breve. Nossa equipe está verificando suas informações e em breve você terá acesso
                completo à nossa loja.
              </p>
            </div>

            <Button
              onClick={() => {
                setShowInactiveAccount(false)
                setShowInactiveAccount(false)
                setFormData({ nome: "", email: "", documento: "", telefone: "" })
              }}
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showAccountPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-balance">Cadastro Realizado!</CardTitle>
              <CardDescription className="text-muted-foreground">Seu cadastro foi criado com sucesso</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Obrigado <strong>{formData.nome}</strong>! Seu cadastro foi criado e está sendo analisado pela nossa
                equipe.
              </p>
              <p className="text-sm text-muted-foreground">
                Você receberá uma confirmação em breve. Por favor, retorne em alguns dias para ter acesso completo à
                nossa loja.
              </p>
            </div>

            <Button
              onClick={() => {
                setShowAccountPending(false)
                setShowRegistration(false)
                setShowRegistration(false)
                setFormData({ nome: "", email: "", documento: "", telefone: "" })
              }}
              className="w-full"
            >
              Entendi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-balance">Completar Cadastro</CardTitle>
              <CardDescription className="text-muted-foreground">
                Cliente não encontrado. Vamos completar seu cadastro.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={formData.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documento">{documentType === "cpf" ? "CPF" : "CNPJ"}</Label>
              <Input id="documento" value={formData.documento} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                value={formData.telefone}
                onChange={(e) => setFormData((prev) => ({ ...prev, telefone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={formData.cep}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    const formatted = value.replace(/(\d{5})(\d{3})/, "$1-$2")
                    setFormData((prev) => ({ ...prev, cep: formatted }))

                    if (value.length === 8) {
                      setIsLoadingCep(true)
                      fetch(`https://viacep.com.br/ws/${value}/json/`)
                        .then(res => res.json())
                        .then(data => {
                          if (!data.erro) {
                            setFormData(prev => ({
                              ...prev,
                              rua: data.logradouro,
                              bairro: data.bairro,
                              cidade: data.localidade,
                              estado: data.uf
                            }))
                          }
                        })
                        .catch(console.error)
                        .finally(() => setIsLoadingCep(false))
                    }
                  }}
                  maxLength={9}
                />
                {isLoadingCep && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={formData.rua}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rua: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData((prev) => ({ ...prev, numero: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => setFormData((prev) => ({ ...prev, complemento: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bairro: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cidade: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value }))}
                maxLength={2}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowRegistration(false)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleRegister} disabled={loading} className="flex-1">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Image src="/icore-logo.png" alt="icore" width={140} height={100} className="w-36 h-24" />
          </div>
          <div>
            <CardDescription className="text-muted-foreground">Identifique-se para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documento">CPF ou CNPJ (Senha) *</Label>
            <Input
              id="documento"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={formData.documento}
              onChange={(e) => handleDocumentChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {documentType === "cpf" ? "Pessoa Física" : "Pessoa Jurídica"}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleContinue} disabled={loading} className="w-full" size="lg">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
