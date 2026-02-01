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

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{customer.nome}</span>
              </div>

              <Button variant="outline" onClick={() => setShowOrders(true)} className="bg-transparent">
                <FileText className="w-4 h-4 mr-2" />
                <span>Consultar Pedidos</span>
              </Button>

              <Button variant="outline" onClick={() => setShowFinancial(true)} className="bg-transparent">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>Débitos</span>
              </Button>

              <Button variant="outline" onClick={() => setShowReturns(true)} className="bg-transparent">
                <RotateCcw className="w-4 h-4 mr-2" />
                <span>Devolução de Peças</span>
              </Button>

              <Button variant="outline" onClick={onViewQuote} className="relative bg-transparent">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span>Orçamento</span>
                {quoteItemsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {quoteItemsCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Mobile Navigation (Hamburger) */}
            <div className="md:hidden flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOrders(true)}
                className="mr-1"
                title="Meus Pedidos"
              >
                <FileText className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onViewQuote}
                className="mr-1 relative"
              >
                <ShoppingCart className="h-6 w-6" />
                {quoteItemsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {quoteItemsCount}
                  </Badge>
                )}
              </Button>

              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader className="text-left mb-6">
                    <SheetTitle>Menu</SheetTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <User className="w-4 h-4" />
                      <span>{customer.nome}</span>
                    </div>
                  </SheetHeader>
                  <div className="flex flex-col gap-4">
                    <Button
                      variant="outline"
                      onClick={() => { setShowFinancial(true); setIsMenuOpen(false); }}
                      className="justify-start"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Débitos
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => { setShowReturns(true); setIsMenuOpen(false); }}
                      className="justify-start"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Devolução de Peças
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

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
