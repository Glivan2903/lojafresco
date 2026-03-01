"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Clock, CheckCircle, Mail, Key, Eye, EyeOff, Lock, Settings, AlertTriangle } from "lucide-react"
import Image from "next/image"
import { validateCPF, validateCNPJ } from "@/lib/validations"
import { betelAPI, type Customer } from "@/lib/api"
import { AnimatedBackground } from "@/components/animated-background"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CustomerIdentificationProps {
  onCustomerIdentified: (customer: Customer) => void
}

export function CustomerIdentification({ onCustomerIdentified }: CustomerIdentificationProps) {
  const [formData, setFormData] = useState({
    email: "",
    documento: "",
    nome: "",
    telefone: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    data_nascimento: "",
  })
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRegistration, setShowRegistration] = useState(false)
  const [showCompleteRegistrationModal, setShowCompleteRegistrationModal] = useState(false)
  const [incompleteCustomerData, setIncompleteCustomerData] = useState<Customer | null>(null)
  const [showInactiveAccount, setShowInactiveAccount] = useState(false)
  const [showAccountPending, setShowAccountPending] = useState(false)
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf")
  const [showPassword, setShowPassword] = useState(false)

  const [showWarningModal, setShowWarningModal] = useState(false)



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
    // Treat as raw password input, but maintain document logic primarily for length check if needed
    // or just let them type. For smooth "password" feel, maybe don't force format?
    // But since it IS a CPF, formatting helps validation.
    // Let's stick to raw input for the "Password" feel as requested by the visual "Senha" label.
    // Just simple update. logic will strip non-digits on submit.
    setFormData((prev) => ({ ...prev, documento: value }))

    // Auto-detect type based on length of digits - DISABLED to respect explicit selection
    // const clean = value.replace(/\D/g, "")
    // if (clean.length <= 11) {
    //   setDocumentType("cpf")
    // } else {
    //   setDocumentType("cnpj")
    // }
  }

  const validateDocument = () => {
    const clean = formData.documento.replace(/\D/g, "")
    // Minimal validation to allow login attempts
    if (clean.length === 0) return false
    if (clean.length <= 11) {
      return validateCPF(clean)
    } else {
      return validateCNPJ(clean)
    }
  }

  const handleContinue = async () => {
    setError("")

    if (!formData.email.trim()) {
      setError("E-mail é obrigatório")
      return
    }

    if (!formData.documento.trim()) {
      setError("Senha (CPF/CNPJ) é obrigatória")
      return
    }

    // Attempt validation but allow if it looks vaguely correct to let backend decide?
    // Actually existing logic validates strict CPF/CNPJ.
    if (!validateDocument()) {
      // Relaxed error message since it's "Password"
      setError("Dados inválidos. Verifique suas credenciais.")
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
          // Normalize Address for Checking
          let addr = existingCustomer.endereco

          // Check if address is in array format from API
          if ((!addr || !addr.rua) && existingCustomer.enderecos && existingCustomer.enderecos.length > 0) {
            console.log("[Address Check] Using address from array:", existingCustomer.enderecos[0].endereco)
            addr = existingCustomer.enderecos[0].endereco
          }

          const rua = addr?.rua || addr?.logradouro
          const cidade = addr?.cidade || addr?.nome_cidade

          const hasMissingData = !existingCustomer.nome || !existingCustomer.email ||
            (!existingCustomer.cpf && !existingCustomer.cnpj) || !existingCustomer.telefone ||
            !addr || !rua || !addr.numero || !addr.bairro || !cidade || !addr.estado

          if (hasMissingData) {
            console.log("[Address Check] Required data incomplete, showing completion modal")
            setIncompleteCustomerData(existingCustomer)
            setFormData((prev) => ({
              ...prev,
              nome: existingCustomer.nome || "",
              email: existingCustomer.email || "",
              documento: existingCustomer.cpf || existingCustomer.cnpj || "",
              telefone: existingCustomer.telefone || existingCustomer.celular || "",
              cep: addr?.cep || "",
              rua: rua || "",
              numero: addr?.numero || "",
              complemento: addr?.complemento || "",
              bairro: addr?.bairro || "",
              cidade: cidade || "",
              estado: addr?.estado || "",
              data_nascimento: existingCustomer.data_nascimento || "",
            }))
            setDocumentType(existingCustomer.cnpj ? "cnpj" : "cpf")
            setShowCompleteRegistrationModal(true)
          } else {
            // No missing data, direct based on status
            if (existingCustomer.ativo === "1") {
              onCustomerIdentified(existingCustomer)
            } else {
              setShowInactiveAccount(true)
            }
          }
          return
        } else {
          setError("Credenciais inválidas.") // Generic security message
          return
        }
      }

      // If email not found, offer registration
      setFormData({
        ...formData,
        email: "",
        documento: "",
        nome: "",
        telefone: "",
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        data_nascimento: "",
      })
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
          setFormData({
            ...formData,
            email: "",
            documento: "",
            nome: "",
            telefone: "",
            cep: "",
            rua: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
            data_nascimento: "",
          })
          setShowRegistration(true)
          setError("")
        }, 2000)
      } else {
        setError("Erro ao realizar login. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError("")

    const requiredFields = [
      { key: "nome", label: "Nome da Loja" },
      { key: "email", label: "E-mail" },
      { key: "documento", label: "CPF/CNPJ" },
      { key: "telefone", label: "Telefone" },
      { key: "cep", label: "CEP" },
      { key: "rua", label: "Rua" },
      { key: "numero", label: "Número" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade", label: "Cidade" },
      { key: "estado", label: "Estado" },
    ] as const

    for (const field of requiredFields) {
      if (!formData[field.key as keyof typeof formData].trim()) {
        setError(`${field.label} é obrigatório`)
        return
      }
    }

    if (!validateDocument()) {
      setError("Documento inválido")
      return
    }

    setLoading(true)

    try {
      const cleanDocument = formData.documento.replace(/\D/g, "")

      if (documentType === "cpf" && cleanDocument.length !== 11) {
        setError("O CPF deve ter exatamente 11 números.")
        setLoading(false)
        return
      }

      if (documentType === "cnpj" && cleanDocument.length !== 14) {
        setError("O CNPJ deve ter exatamente 14 números.")
        setLoading(false)
        return
      }

      // Check for duplicates
      const [existingByDoc, existingByEmail] = await Promise.all([
        betelAPI.findCustomer(cleanDocument),
        betelAPI.findCustomerByEmail(formData.email)
      ])

      if (existingByDoc || existingByEmail) {
        setShowWarningModal(true)
        setLoading(false)
        return
      }

      const customerData: Omit<Customer, "id"> = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        tipo_pessoa: documentType === "cpf" ? "F" : "J",
        ...(documentType === "cpf" ? { cpf: cleanDocument, data_nascimento: formData.data_nascimento } : { cnpj: cleanDocument }),
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

      // Send WhatsApp notification
      try {
        await fetch("/api/send-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: `55${formData.telefone.replace(/\D/g, "")}`,
            body: `Olá *${formData.nome}*!\nRecebemos seu cadastro com sucesso ✅\n\nNossa equipe já está analisando seus dados para aprovação.\n\nEm breve entraremos em contato com você pelo WhatsApp com o retorno.\n\nObrigado pela confiança!\n\n*Equipe Icore Tech*`
          }),
        })
      } catch (msgError) {
        console.error("Failed to send WhatsApp notification", msgError)
      }

      toast({
        title: "Cadastro realizado!",
        description: "Seu cadastro foi realizado com sucesso. Aguarde a análise.",
      })

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

  const handleCompleteRegistration = async () => {
    setError("")

    const requiredFields = [
      { key: "nome", label: "Nome da Loja" },
      { key: "email", label: "E-mail" },
      { key: "documento", label: "CPF/CNPJ" },
      { key: "telefone", label: "Telefone" },
      { key: "cep", label: "CEP" },
      { key: "rua", label: "Rua" },
      { key: "numero", label: "Número" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade", label: "Cidade" },
      { key: "estado", label: "Estado" },
    ] as const

    for (const field of requiredFields) {
      if (!formData[field.key as keyof typeof formData].trim()) {
        setError(`${field.label} é obrigatório`)
        return
      }
    }

    if (!validateDocument()) {
      setError("Documento inválido")
      return
    }

    if (!incompleteCustomerData?.id) {
      setError("Erro interno: ID do cliente não encontrado.")
      return
    }

    setLoading(true)

    try {
      const cleanDocument = formData.documento.replace(/\D/g, "")

      if (documentType === "cpf" && cleanDocument.length !== 11) {
        setError("O CPF deve ter exatamente 11 números.")
        setLoading(false)
        return
      }

      if (documentType === "cnpj" && cleanDocument.length !== 14) {
        setError("O CNPJ deve ter exatamente 14 números.")
        setLoading(false)
        return
      }

      const customerData: Partial<Customer> = {
        tipo_pessoa: documentType === "cpf" ? "F" : "J",
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        ...(documentType === "cpf" ? { cpf: cleanDocument, data_nascimento: formData.data_nascimento } : { cnpj: cleanDocument }),
        ativo: incompleteCustomerData.ativo || "0", // preserve original status
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

      await betelAPI.updateCustomer(incompleteCustomerData.id, customerData)

      const isStillInactive = incompleteCustomerData.ativo === "0"

      toast({
        title: "Cadastro atualizado!",
        description: isStillInactive
          ? "Seus dados foram atualizados com sucesso. Seu cadastro continua em análise."
          : "Seus dados foram atualizados com sucesso.",
      })

      setShowCompleteRegistrationModal(false)

      if (isStillInactive) {
        setShowInactiveAccount(true)
      } else {
        // Resume active login session with updated data
        onCustomerIdentified({ ...incompleteCustomerData, ...customerData })
      }
    } catch (err) {
      console.error("Customer update error:", err)
      setError("Erro ao atualizar cadastro. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (showInactiveAccount) {
    return (
      <div className="min-h-screen bg-[#e5e5e5] flex items-center justify-center p-4">
        <Card className="w-full max-w-[400px] shadow-lg border-0 bg-[#D9D9D9]">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">Cadastro em Análise</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm text-gray-600">
              Olá <strong>{formData.nome}</strong>, seu cadastro está em análise.
            </p>
            <Button
              onClick={() => {
                setShowInactiveAccount(false)
                setFormData({ nome: "", email: "", documento: "", telefone: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", data_nascimento: "" })
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
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
      <div className="min-h-screen bg-[#e5e5e5] flex items-center justify-center p-4">
        <Card className="w-full max-w-[400px] shadow-lg border-0 bg-[#D9D9D9]">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">Cadastro Realizado!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Obrigado pela preferência, <strong>{formData.nome}</strong>!
              </p>
              <p className="text-sm text-gray-600">
                Seu cadastro foi recebido e nossa equipe está analisando seus dados.
              </p>
              <p className="text-sm text-gray-600 font-medium">
                Você receberá mais informações pelo WhatsApp em breve.
              </p>
            </div>
            <Button
              onClick={() => {
                setShowAccountPending(false)
                setShowRegistration(false)
                setFormData({ nome: "", email: "", documento: "", telefone: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", data_nascimento: "" })
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
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
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center justify-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Atenção
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Identificamos que este CPF/CNPJ ou e-mail já possui cadastro.</p>
                <p>Entre em contato pelo nosso WhatsApp para recuperar sua senha: 👉 <span className="font-bold">88 98863-8990</span></p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogCancel onClick={() => {
                setShowWarningModal(false)
                setFormData({
                  email: "",
                  documento: "",
                  nome: "",
                  telefone: "",
                  cep: "",
                  rua: "",
                  numero: "",
                  complemento: "",
                  bairro: "",
                  cidade: "",
                  estado: "",
                  data_nascimento: "",
                })
                setShowRegistration(true)
              }}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                onClick={() => window.open("https://wa.me/5588988638990", "_blank")}
              >
                Falar no WhatsApp
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AnimatedBackground />

        <Card className="w-full max-w-md shadow-2xl border-0 bg-[#E5E5E5] rounded-xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto flex flex-col items-center mb-4">
              {/* Logo area - reusing exact same logo structure as login */}
              <div className="relative w-48 h-20 mb-2">
                <Image
                  src="/logo-icore-tech.png"
                  alt="Icore"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-700">Completar Cadastro</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8">
            {/* Simplified registration fields for brevity in this view, strictly adhering to logic */}
            {/* PF/PJ Selector */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="personType"
                  value="cpf"
                  checked={documentType === "cpf"}
                  onChange={() => {
                    setDocumentType("cpf")
                    setFormData(prev => ({ ...prev, documento: "" })) // Clear document when switching type
                  }}
                  className="accent-yellow-500"
                />
                <span className="text-sm text-gray-700">Pessoa Física</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="personType"
                  value="cnpj"
                  checked={documentType === "cnpj"}
                  onChange={() => {
                    setDocumentType("cnpj")
                    setFormData(prev => ({ ...prev, documento: "" })) // Clear document when switching type
                  }}
                  className="accent-yellow-500"
                />
                <span className="text-sm text-gray-700">Pessoa Jurídica</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome" className="text-xs text-gray-500 ml-1">
                {documentType === "cpf" ? "Nome da Loja" : "Nome da Loja"}
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            {documentType === "cpf" && (
              <div className="space-y-2">
                <Label htmlFor="data_nascimento" className="text-xs text-gray-500 ml-1">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData((prev) => ({ ...prev, data_nascimento: e.target.value }))}
                  className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-xs text-gray-500 ml-1">E-mail</Label>
              <Input
                id="reg-email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-doc" className="text-xs text-gray-500 ml-1">{documentType === "cpf" ? "CPF" : "CNPJ"}</Label>
              <Input
                id="reg-doc"
                value={formData.documento}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "")
                  if (documentType === "cpf") {
                    v = v.slice(0, 11)
                    v = v.replace(/(\d{3})(\d)/, "$1.$2")
                    v = v.replace(/(\d{3})(\d)/, "$1.$2")
                    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                  } else {
                    v = v.slice(0, 14)
                    v = v.replace(/^(\d{2})(\d)/, "$1.$2")
                    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2")
                    v = v.replace(/(\d{4})(\d)/, "$1-$2")
                  }
                  setFormData((prev) => ({ ...prev, documento: v }))
                }}
                maxLength={documentType === "cpf" ? 14 : 18}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-xs text-gray-500 ml-1">Telefone *</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                value={formData.telefone}
                onChange={(e) => setFormData((prev) => ({ ...prev, telefone: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep" className="text-xs text-gray-500 ml-1">CEP</Label>
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
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Rua" value={formData.rua} onChange={e => setFormData(p => ({ ...p, rua: e.target.value }))} className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300" />
              <Input placeholder="Número" value={formData.numero} onChange={e => setFormData(p => ({ ...p, numero: e.target.value }))} className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro" className="text-xs text-gray-500 ml-1">Bairro</Label>
              <Input id="bairro" placeholder="Bairro" value={formData.bairro} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))} className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-xs text-gray-500 ml-1">Cidade</Label>
                <Input id="cidade" placeholder="Cidade" value={formData.cidade} onChange={e => setFormData(p => ({ ...p, cidade: e.target.value }))} className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado" className="text-xs text-gray-500 ml-1">Estado</Label>
                <Input id="estado" placeholder="Estado" value={formData.estado} onChange={e => setFormData(p => ({ ...p, estado: e.target.value }))} className="bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300" />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowRegistration(false)} className="flex-1 text-gray-600">
                Voltar
              </Button>
              <Button onClick={handleRegister} disabled={loading} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-sm">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showCompleteRegistrationModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <AnimatedBackground />

        <Card className="w-full max-w-md shadow-2xl border-0 bg-[#E5E5E5] rounded-xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto flex flex-col items-center mb-4">
              <div className="relative w-48 h-20 mb-2">
                <Image
                  src="/logo-icore-tech.png"
                  alt="Icore"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-700">Completar Cadastro</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Por favor, complete as informações obrigatórias para prosseguir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8">
            <div className="space-y-2">
              <Label htmlFor="comp-nome" className="text-xs text-gray-500 ml-1">
                {documentType === "cpf" ? "Nome Completo / Loja" : "Razão Social / Nome da Loja"}
              </Label>
              <Input
                id="comp-nome"
                value={formData.nome}
                disabled={!!incompleteCustomerData?.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            {documentType === "cpf" && (
              <div className="space-y-2">
                <Label htmlFor="comp-data_nascimento" className="text-xs text-gray-500 ml-1">Data de Nascimento</Label>
                <Input
                  id="comp-data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  disabled={!!incompleteCustomerData?.data_nascimento}
                  onChange={(e) => setFormData((prev) => ({ ...prev, data_nascimento: e.target.value }))}
                  className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comp-email" className="text-xs text-gray-500 ml-1">E-mail</Label>
              <Input
                id="comp-email"
                value={formData.email}
                disabled={!!incompleteCustomerData?.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-doc" className="text-xs text-gray-500 ml-1">{documentType === "cpf" ? "CPF" : "CNPJ"}</Label>
              <Input
                id="comp-doc"
                value={formData.documento}
                disabled={!!(incompleteCustomerData?.cpf || incompleteCustomerData?.cnpj)}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "")
                  if (documentType === "cpf") {
                    v = v.slice(0, 11)
                    v = v.replace(/(\d{3})(\d)/, "$1.$2")
                    v = v.replace(/(\d{3})(\d)/, "$1.$2")
                    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                  } else {
                    v = v.slice(0, 14)
                    v = v.replace(/^(\d{2})(\d)/, "$1.$2")
                    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2")
                    v = v.replace(/(\d{4})(\d)/, "$1-$2")
                  }
                  setFormData((prev) => ({ ...prev, documento: v }))
                }}
                maxLength={documentType === "cpf" ? 14 : 18}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-telefone" className="text-xs text-gray-500 ml-1">Telefone *</Label>
              <Input
                id="comp-telefone"
                placeholder="(11) 99999-9999"
                value={formData.telefone}
                disabled={!!(incompleteCustomerData?.telefone || incompleteCustomerData?.celular)}
                onChange={(e) => setFormData((prev) => ({ ...prev, telefone: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-cep" className="text-xs text-gray-500 ml-1">CEP</Label>
              <Input
                id="comp-cep"
                placeholder="00000-000"
                value={formData.cep}
                disabled={!!(incompleteCustomerData?.endereco?.cep || incompleteCustomerData?.enderecos?.[0]?.endereco?.cep)}
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
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Rua"
                value={formData.rua}
                disabled={!!(incompleteCustomerData?.endereco?.rua || incompleteCustomerData?.endereco?.logradouro || incompleteCustomerData?.enderecos?.[0]?.endereco?.logradouro)}
                onChange={e => setFormData(p => ({ ...p, rua: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
              <Input
                placeholder="Número"
                value={formData.numero}
                disabled={!!(incompleteCustomerData?.endereco?.numero || incompleteCustomerData?.enderecos?.[0]?.endereco?.numero)}
                onChange={e => setFormData(p => ({ ...p, numero: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-bairro" className="text-xs text-gray-500 ml-1">Bairro</Label>
              <Input
                id="comp-bairro"
                placeholder="Bairro"
                value={formData.bairro}
                disabled={!!(incompleteCustomerData?.endereco?.bairro || incompleteCustomerData?.enderecos?.[0]?.endereco?.bairro)}
                onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))}
                className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="comp-cidade" className="text-xs text-gray-500 ml-1">Cidade</Label>
                <Input
                  id="comp-cidade"
                  placeholder="Cidade"
                  value={formData.cidade}
                  disabled={!!(incompleteCustomerData?.endereco?.cidade || incompleteCustomerData?.endereco?.nome_cidade || incompleteCustomerData?.enderecos?.[0]?.endereco?.nome_cidade)}
                  onChange={e => setFormData(p => ({ ...p, cidade: e.target.value }))}
                  className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-estado" className="text-xs text-gray-500 ml-1">Estado</Label>
                <Input
                  id="comp-estado"
                  placeholder="Estado"
                  value={formData.estado}
                  disabled={!!(incompleteCustomerData?.endereco?.estado || incompleteCustomerData?.enderecos?.[0]?.endereco?.estado)}
                  onChange={e => setFormData(p => ({ ...p, estado: e.target.value }))}
                  className="bg-white border-0 shadow-sm rounded-lg text-gray-800 disabled:opacity-75 disabled:bg-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => {
                setShowCompleteRegistrationModal(false)
                setFormData({ nome: "", email: "", documento: "", telefone: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", data_nascimento: "" })
              }} className="flex-1 text-gray-600">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleCompleteRegistration();
                }}
                disabled={loading}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-sm"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Atualizar cadastro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
            <AlertDialogDescription>
              Se você já possui cadastro e não conseguiu realizar o login, entre em contato pelo whatsapp para cadastrar email e documento para poder acessar a loja para evitar duplicação de cadastro na base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowWarningModal(false)
              setFormData({
                email: "",
                documento: "",
                nome: "",
                telefone: "",
                cep: "",
                rua: "",
                numero: "",
                complemento: "",
                bairro: "",
                cidade: "",
                estado: "",
                data_nascimento: "",
              })
              setShowRegistration(true)
            }}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatedBackground />

      <Card className="w-full max-w-[400px] shadow-2xl border-0 bg-[#E5E5E5] rounded-xl overflow-hidden">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto flex flex-col items-center mb-4">
            {/* Logo area */}
            <div className="relative w-64 h-28 mb-4">
              <Image
                src="/logo-icore-tech.png"
                alt="Icore"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <h2 className="text-gray-500 font-normal text-sm">Faça login para continuar</h2>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-8 pb-8">
          <div className="space-y-4">

            {/* EMAIL FIELD */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs text-gray-500 ml-1">Email</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                  <Mail className="w-5 h-5" />
                </div>
                <Input
                  id="email"
                  placeholder=""
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-10 h-11 bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>
            </div>

            {/* PASSWORD (DOCUMENT) FIELD */}
            <div className="space-y-1">
              <Label htmlFor="documento" className="text-xs text-gray-500 ml-1">Senha</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                  <Key className="w-5 h-5" />
                </div>
                <Input
                  id="documento"
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  value={formData.documento}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-white border-0 shadow-sm rounded-lg text-gray-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-gray-300 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground ml-1">Utilize seu CPF ou CNPJ como senha.</p>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="text-red-500 text-xs text-center">
                {error}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <Button
              onClick={handleContinue}
              disabled={loading}
              className="w-full h-11 font-bold text-md shadow-sm mt-4 rounded-lg"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="mr-2">Entrar</span>
                </>
              )}
            </Button>

            {/* REGISTER LINK */}
            <div className="text-center text-sm text-gray-500 mt-4">
              Não tem uma conta?{" "}
              <button
                onClick={() => setShowWarningModal(true)}
                className="text-primary hover:underline font-medium"
              >
                Cadastre-se
              </button>
            </div>

            {/* SECURITY FOOTER */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs mt-6">
              <Lock className="w-3 h-3" />
              <span>Seus dados estão protegidos</span>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}
