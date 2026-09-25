"use client"

// React
import { useRef, useState, useSyncExternalStore } from "react"

// Next
import { useRouter } from "next/navigation"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// Types
import type { OrderCustomerOption, OrderDetailsIssues, OrderDetailsValues, OrderFormLine, OrderProductOption, OrderVariantOption } from "@harness-monorepo/ui/lib/order-form"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ORDER_QUANTITY_MAX, orderTotalsOf } from "@harness-monorepo/ui/lib/order-form"

// App
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { catalogKeys, useProduct, useProducts } from "@/services/catalog/catalog-hooks"
import { fetchProduct } from "@/services/catalog/catalog-requests"
import { useCreateOrder } from "@/services/orders/order-hooks"
import { moneyOf, orderPayloadOf, productOptionOf, variantOptionsOf } from "./new-order-mapping"

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_PAGE_SIZE = 8

/** Today in the shopkeeper's own calendar. Read on the client only: the server's clock is in another zone. */
function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const noSubscription = () => () => {}

/** The products, lines, details and totals of the order being written, and the save that sends it. */
export function useNewOrder(slug: string, customer: OrderCustomerOption | null, messages: UiMessages) {
  const text = messages.orders.form
  const router = useRouter()
  const queryClient = useQueryClient()
  const today = useSyncExternalStore(noSubscription, () => localDay(new Date()), () => "")

  const [productQuery, setProductQuery] = useState("")
  const [chosen, setChosen] = useState<OrderProductOption | null>(null)
  const [lines, setLines] = useState<OrderFormLine[]>([])
  const [details, setDetails] = useState<OrderDetailsValues>({
    fulfillment: "DELIVERY",
    deliveryFee: "",
    paymentMethod: null,
    discount: "",
    note: "",
    placedOn: "",
  })
  const [submitted, setSubmitted] = useState(false)
  /** What changed on the order, for a screen reader: an added line happens away from the focus. */
  const [announcement, setAnnouncement] = useState("")
  /** The product being read; an answer for one the shopkeeper already left behind is ignored. */
  const choosing = useRef<string | null>(null)

  const search = useDebouncedValue(productQuery.trim(), SEARCH_DEBOUNCE_MS)
  const products = useProducts(slug, { ...(search ? { search } : {}), pageSize: SEARCH_PAGE_SIZE })
  const detail = useProduct(slug, chosen?.id ?? "", { enabled: Boolean(chosen) })
  const save = useCreateOrder(slug)

  const lineName = (productName: string, label: string | null) => (label ? `${productName} (${label})` : productName)

  function add(product: OrderProductOption, variant: OrderVariantOption) {
    setAnnouncement(format(text.lineAdded, { name: lineName(product.name, variant.label) }))
    setLines((current) =>
      current.some((line) => line.variantId === variant.id)
        ? current.map((line) => (line.variantId === variant.id ? { ...line, quantity: Math.min(line.quantity + 1, ORDER_QUANTITY_MAX) } : line))
        : [
            ...current,
            { variantId: variant.id, productName: product.name, variantLabel: variant.label, unitPriceCents: variant.priceCents, quantity: 1, outOfStock: variant.outOfStock },
          ],
    )
  }

  /** A product with no options has one thing to add; it goes straight onto the order. */
  async function choose(product: OrderProductOption) {
    choosing.current = product.id
    setChosen(product)
    // Read fresh: the price on the line is the one the API is about to charge, not a cached one.
    const read = await queryClient
      .fetchQuery({ queryKey: catalogKeys.product(slug, product.id), queryFn: () => fetchProduct(slug, product.id), staleTime: 0 })
      .catch(() => null)
    if (choosing.current !== product.id) return
    const variants = read ? variantOptionsOf(read) : []
    if (read && read.options.length === 0 && variants.length === 1) {
      add(product, variants[0]!)
      choosing.current = null
      setChosen(null)
    }
  }

  const placedOn = details.placedOn || today
  const feeCents = details.fulfillment === "DELIVERY" ? moneyOf(details.deliveryFee) : 0
  const discountCents = moneyOf(details.discount)
  const totals = orderTotalsOf(lines, details.fulfillment, feeCents ?? 0, discountCents ?? 0)

  const issues: OrderDetailsIssues & { customer?: string; lines?: string } = {}
  if (feeCents === null) issues.deliveryFee = text.invalidMoney
  if (discountCents === null) issues.discount = text.invalidMoney
  if (!details.paymentMethod) issues.paymentMethod = text.missingPayment
  if (today && placedOn > today) issues.placedOn = text.placedAtInvalid
  if (!customer) issues.customer = text.missingCustomer
  if (!lines.length) issues.lines = text.missingItems

  /** Whether the order went out. A save under way, or one that already landed, is not sent twice. */
  function submit(): boolean {
    if (save.isPending || save.isSuccess) return true
    setSubmitted(true)
    if (Object.keys(issues).length || typeof totals === "string" || !customer || !details.paymentMethod) return false

    const payload = orderPayloadOf({ customerId: customer.id, lines, details: { ...details, placedOn }, paymentMethod: details.paymentMethod, totals, today })
    save.mutate(payload, { onSuccess: (order) => router.push(`/admin/${slug}/orders/${order.number}` as Parameters<typeof router.push>[0]) })
    return true
  }

  return {
    picker: {
      query: productQuery,
      onQueryChange: setProductQuery,
      products: (products.data?.products ?? []).map(productOptionOf),
      searching: search !== productQuery.trim() || products.isFetching,
      onChoose: (product: OrderProductOption) => void choose(product),
      chosen: chosen ? { product: chosen, variants: detail.data ? variantOptionsOf(detail.data) : null } : null,
      onBack: () => {
        choosing.current = null
        setChosen(null)
      },
      onAdd: (variant: OrderVariantOption) => chosen && add(chosen, variant),
    },
    lines: {
      lines,
      onQuantityChange: (variantId: string, quantity: number) =>
        setLines((current) => current.map((line) => (line.variantId === variantId ? { ...line, quantity } : line))),
      onRemove: (variantId: string) => {
        const gone = lines.find((line) => line.variantId === variantId)
        if (gone) setAnnouncement(format(text.lineRemoved, { name: lineName(gone.productName, gone.variantLabel) }))
        setLines((current) => current.filter((line) => line.variantId !== variantId))
      },
    },
    details: { value: { ...details, placedOn }, onChange: setDetails, today },
    productError: detail.error ?? products.error,
    totals,
    /** Shown once a save was tried: a form that opens covered in red asks nothing of anyone. */
    issues: submitted ? issues : {},
    announcement,
    submit,
    save,
  }
}
