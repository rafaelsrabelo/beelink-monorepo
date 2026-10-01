"use client"

// React
import { useMemo, useRef, useState, useSyncExternalStore } from "react"

// Next
import { useRouter } from "next/navigation"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// Types
import type { OrderCustomerOption, OrderDetailsIssues, OrderDetailsValues, OrderFormLine, OrderProductOption, OrderVariantOption } from "@harness-monorepo/ui/lib/order-form"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { ORDER_QUANTITY_MAX, orderTotalsOf, overStock } from "@harness-monorepo/ui/lib/order-form"

// App
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { catalogKeys, useProduct, useProducts } from "@/services/catalog/catalog-hooks"
import { fetchProduct } from "@/services/catalog/catalog-requests"
import { customerKeys } from "@/services/customers/customer-hooks"
import { useCreateOrder, useOrderQuote } from "@/services/orders/order-hooks"
import { OrderRequestError, shortagesOf } from "@/services/orders/order-requests"
import { moneyOf, orderPayloadOf, productOptionOf, saleOf, shownTotalsOf, variantOptionsOf } from "./new-order-mapping"
import { useDeliveryTo } from "./use-delivery-to"

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_PAGE_SIZE = 8
/** A fee or a discount is typed a digit at a time: the sale is priced once the typing rests. */
const QUOTE_DEBOUNCE_MS = 400

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
  const deliveryTo = useDeliveryTo(slug, customer, details.fulfillment)

  const lineName = (productName: string, label: string | null) => (label ? `${productName} (${label})` : productName)

  function add(product: OrderProductOption, variant: OrderVariantOption) {
    setAnnouncement(format(text.lineAdded, { name: lineName(product.name, variant.label) }))
    setLines((current) =>
      current.some((line) => line.variantId === variant.id)
        ? current.map((line) => (line.variantId === variant.id ? { ...line, quantity: Math.min(line.quantity + 1, ORDER_QUANTITY_MAX) } : line))
        : [
            ...current,
            { variantId: variant.id, productName: product.name, variantLabel: variant.label, unitPriceCents: variant.priceCents, quantity: 1, available: variant.available },
          ],
    )
  }

  /** A product with no options has one thing to add; it goes straight onto the order. */
  async function choose(product: OrderProductOption) {
    choosing.current = product.id
    setChosen(product)
    // Read fresh: the price on the line is the one the API is about to charge, not a cached one.
    const read = await queryClient
      .fetchQuery({ queryKey: catalogKeys.product(slug, product.id), queryFn: () => fetchProduct(slug, product.id), staleTime: 0, retry: false })
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
  // The form's own sum: what is sent, and what refuses a typed amount before anything is asked.
  const own = orderTotalsOf(lines, details.fulfillment, feeCents ?? 0, discountCents ?? 0)
  const priceable = lines.length > 0 && feeCents !== null && discountCents !== null && typeof own !== "string" && today !== ""
  // By its amounts, never by `details` whole: a note typed is not a sale to price again.
  const sale = useMemo(
    () => (priceable ? saleOf({ lines, fulfillment: details.fulfillment, deliveryFeeCents: feeCents ?? 0, discountCents: discountCents ?? 0, placedOn, today }) : null),
    [priceable, lines, details.fulfillment, feeCents, discountCents, placedOn, today],
  )
  const asked = useDebouncedValue(sale, QUOTE_DEBOUNCE_MS)
  const quote = useOrderQuote(slug, asked)
  // The API's answer for what is on screen — not the last sale's, kept while this one is asked.
  const answered = sale !== null && asked === sale && !quote.isPlaceholderData && !quote.isPending
  const totals = shownTotalsOf(own, sale ? (quote.data ?? null) : null, answered && quote.error instanceof OrderRequestError ? quote.error.errorCode : null)

  const issues: OrderDetailsIssues & { customer?: string; lines?: string } = {}
  if (feeCents === null) issues.deliveryFee = text.invalidMoney
  if (discountCents === null) issues.discount = text.invalidMoney
  if (!details.paymentMethod) issues.paymentMethod = text.missingPayment
  if (today && placedOn > today) issues.placedOn = text.placedAtInvalid
  if (!customer) issues.customer = text.missingCustomer
  // The API refuses a delivery with nowhere to go; said here first, next to "Entrega" and "Retirada".
  if (deliveryTo && !deliveryTo.loading && deliveryTo.line === null) issues.fulfillment = text.deliveryAddressMissing
  if (!lines.length) issues.lines = text.missingItems
  else if (lines.some(overStock)) issues.lines = text.overStock

  /** Whether the order went out. A save under way, or one that already landed, is not sent twice. */
  function submit(): boolean {
    if (save.isPending || save.isSuccess) return true
    setSubmitted(true)
    if (Object.keys(issues).length || typeof totals === "string" || typeof own === "string" || !customer || !details.paymentMethod) return false

    // The amounts typed, never the API's price of them: the order is priced again as it is written.
    const payload = orderPayloadOf({ customerId: customer.id, lines, details: { ...details, placedOn }, paymentMethod: details.paymentMethod, totals: own, today })
    save.mutate(payload, {
      onSuccess: (order) => router.push(`/admin/${slug}/orders/${order.number}` as Parameters<typeof router.push>[0]),
      // The stock moved since the products were read: each short line learns how many are left, and says so.
      onError: (error) => {
        const left = new Map(shortagesOf(error).map((shortage) => [shortage.variantId, shortage.available]))
        if (left.size) setLines((current) => current.map((line) => (left.has(line.variantId) ? { ...line, available: left.get(line.variantId)! } : line)))
        // The record lost its address since it was read: read it again, so "Entregar em" stops saying otherwise.
        if (error instanceof OrderRequestError && error.errorCode === "ORDER_DELIVERY_ADDRESS_MISSING") {
          void queryClient.invalidateQueries({ queryKey: customerKeys.detail(slug, customer.id) })
        }
      },
    })
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
    details: { value: { ...details, placedOn }, onChange: setDetails, today, deliveryTo },
    productError: detail.error ?? products.error,
    totals,
    /** The sale is being priced: the amounts on screen are the ones before the last change. */
    pricing: sale !== null && !answered && !quote.isError,
    /** Shown once a save was tried: a form that opens covered in red asks nothing of anyone. */
    issues: submitted ? issues : {},
    announcement,
    submit,
    save,
  }
}
