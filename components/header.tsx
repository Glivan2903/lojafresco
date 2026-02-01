"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, User, LogOut, FileText } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { Customer } from "@/lib/api"
import { CustomerOrders } from "./customer-orders"
import { CustomerFinancial } from "./customer-financial"
import { CustomerReturns } from "./customer-returns"
import { DollarSign, RotateCcw } from "lucide-react"

interface HeaderProps {
  customer: Customer
  quoteItemsCount: number
  onViewQuote: () => void
  onLogout: () => void
  onLogoClick: () => void
}

export function Header({ customer, quoteItemsCount, onViewQuote, onLogout, onLogoClick }: HeaderProps) {
  const [showOrders, setShowOrders] = useState(false)
  const [showFinancial, setShowFinancial] = useState(false)
  const [showReturns, setShowReturns] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Link href="/" onClick={onLogoClick}>
                <Image src="/logo-icore-tech.png" alt="icore" width={180} height={50} className="h-14 w-auto" />
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{customer.nome}</span>
            </div>

            <Button variant="outline" onClick={() => setShowOrders(true)} className="bg-transparent">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Consultar Pedidos</span>
            </Button>

            <Button variant="outline" onClick={() => setShowFinancial(true)} className="bg-transparent">
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Débitos</span>
            </Button>

            <Button variant="outline" onClick={() => setShowReturns(true)} className="bg-transparent text-primary border-primary/20 hover:bg-primary/5">
              <RotateCcw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Devolução de Peças</span>
            </Button>

            <Button variant="outline" onClick={onViewQuote} className="relative bg-transparent">
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Orçamento</span>
              {quoteItemsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {quoteItemsCount}
                </Badge>
              )}
            </Button>

            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <CustomerOrders customer={customer} isOpen={showOrders} onClose={() => setShowOrders(false)} />
      <CustomerFinancial customer={customer} isOpen={showFinancial} onClose={() => setShowFinancial(false)} />
      <CustomerReturns customer={customer} isOpen={showReturns} onClose={() => setShowReturns(false)} />
    </>
  )
}
