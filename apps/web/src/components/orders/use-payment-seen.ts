"use client"

// React
import { useEffect, useRef } from "react"

// App
import { useMarkOrderPaymentSeen } from "@/services/orders/order-hooks"

/**
 * Opening a paid order is what tells the bell it was seen (BEELINK-207) — on the order's screen
 * and in the manager's alike. Once per order on screen: a say that fails is not asked again in a
 * loop, and the next opening asks once more.
 */
export function usePaymentSeen(slug: string, number: number, unseen: boolean): void {
  const { mutate: markSeen } = useMarkOrderPaymentSeen(slug, number)
  const asked = useRef<number | null>(null)
  useEffect(() => {
    if (!unseen || asked.current === number) return
    asked.current = number
    markSeen()
  }, [unseen, number, markSeen])
}
