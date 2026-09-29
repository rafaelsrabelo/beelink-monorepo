"use client"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { ConversationFailed } from "@harness-monorepo/ui/blocks/conversations/conversation-failed"
import { ConversationFilters } from "@harness-monorepo/ui/blocks/conversations/conversation-filters"
import { ConversationList } from "@harness-monorepo/ui/blocks/conversations/conversation-list"
import { ConversationListSkeleton } from "@harness-monorepo/ui/blocks/conversations/conversation-list-skeleton"
import { ConversationPager } from "@harness-monorepo/ui/blocks/conversations/conversation-pager"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// App
import { AppLink } from "@/components/app-link"
import { shopConversationRowsOf, shopConversationsAddressOf, shopConversationsHrefOf } from "@/lib/shop-conversation-view"
import { useShopConversations } from "@/services/conversations/shop-conversation-hooks"
import { ShopConversationLive } from "./shop-conversation-live"

export interface ConversationsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

/**
 * The shop's conversations (BEELINK-164): the list beside the one open, every state — filter,
 * search, open conversation — in the address. On a phone the conversation takes the screen, with
 * its way back to the list.
 */
export function ConversationsScreen({ slug, locale, messages }: ConversationsScreenProps) {
  const text = messages.conversations
  const router = useRouter()
  const address = shopConversationsAddressOf(useSearchParams())
  const list = useShopConversations(slug, { filter: address.filter, ...(address.q ? { q: address.q } : {}), ...(address.page > 1 ? { page: address.page } : {}) })
  const hrefOf = (next: Partial<typeof address>) => shopConversationsHrefOf(slug, { ...address, ...next })

  const filters = (["OPEN", "UNREAD", "ALL"] as const).map((filter) => ({
    key: filter,
    label: filter === "OPEN" ? text.filterOpen : filter === "UNREAD" ? text.filterUnread : text.filterAll,
    href: hrefOf({ filter, order: null, page: 1 }),
    active: filter === address.filter,
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 lg:px-6">
      <header className={cn("flex flex-col gap-1", address.order !== null && "max-lg:hidden")}>
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>

      {/* A height of its own, so the list and the conversation scroll inside and the answer stays in sight. */}
      <div className="grid h-[calc(100svh-10rem)] gap-4 lg:h-[min(78svh,760px)] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-label={text.title} className={cn("bg-card flex min-h-0 flex-col rounded-xl border", address.order !== null && "max-lg:hidden")}>
          <ConversationFilters
            key={address.q}
            filters={filters}
            search={address.q}
            onSearch={(q) => router.push(hrefOf({ q, order: null, page: 1 }) as Parameters<typeof router.push>[0])}
            linkComponent={AppLink}
            messages={messages}
          />
          <div className="min-h-0 flex-1 overflow-y-auto border-t">
            {list.isPending ? (
              <ConversationListSkeleton />
            ) : !list.data ? (
              <ConversationFailed message={text.failed} onRetry={() => void list.refetch()} messages={messages} />
            ) : (
              <>
                <ConversationList rows={shopConversationRowsOf(list.data, address, slug, { locale, messages })} current={address.order} linkComponent={AppLink} messages={messages} />
                <ConversationPager
                  newerHref={address.page > 1 ? hrefOf({ page: address.page - 1, order: null }) : null}
                  olderHref={address.page * list.data.pageSize < list.data.total ? hrefOf({ page: address.page + 1, order: null }) : null}
                  messages={messages}
                />
              </>
            )}
          </div>
        </section>

        <div className={cn("bg-card flex min-h-0 flex-col rounded-xl border p-4", address.order === null && "max-lg:hidden")}>
          {address.order !== null ? (
            <ShopConversationLive key={address.order} slug={slug} number={address.order} locale={locale} backHref={hrefOf({ order: null })} messages={messages} />
          ) : (
            <p className="text-muted-foreground m-auto text-sm">{text.pickOne}</p>
          )}
        </div>
      </div>
    </div>
  )
}
