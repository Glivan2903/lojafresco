"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle } from "lucide-react"

interface AddToCartModalProps {
    isOpen: boolean
    onClose: () => void
    productName: string
}

export function AddToCartModal({ isOpen, onClose, productName }: AddToCartModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl rounded-xl">
                <DialogHeader>
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-yellow-500" />
                    </div>
                    <DialogTitle className="text-center text-xl text-gray-800">
                        Produto Adicionado!
                    </DialogTitle>
                </DialogHeader>
                <div className="text-center py-4">
                    <p className="text-gray-600">
                        <strong>{productName}</strong> foi adicionado ao seu carrinho com sucesso.
                    </p>
                </div>
                <div className="flex justify-center pb-2">
                    <button
                        onClick={onClose}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-8 rounded-full shadow-sm transition-colors"
                    >
                        Continuar Comprando
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
