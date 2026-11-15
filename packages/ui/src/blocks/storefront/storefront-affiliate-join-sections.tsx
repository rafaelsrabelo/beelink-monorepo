// Libs
import { ChevronDownIcon } from "lucide-react"

// Block
import type { AffiliateJoinPageView } from "@harness-monorepo/ui/lib/affiliate-join"
import { BAND } from "./storefront-band"

export interface StorefrontAffiliateJoinSectionsProps {
  view: Pick<AffiliateJoinPageView, "ctaLabel" | "stepsTitle" | "steps" | "benefits" | "questionsTitle" | "questions" | "closingTitle" | "closingText">
  onOpen: () => void
}

/**
 * The rest of the shop's "Seja afiliado" page (plan 2026-11-14): how it works, the benefits and the
 * questions — each left out when the shop wrote none — and the closing call, which opens the form.
 */
export function StorefrontAffiliateJoinSections({ view, onOpen }: StorefrontAffiliateJoinSectionsProps) {
  return (
    <>
      <section aria-label={view.stepsTitle} className={`${BAND} flex flex-col gap-6 pt-14`}>
        <h2 className="text-shop-text text-2xl font-extrabold shop-sm:text-3xl">
          {view.stepsTitle}
        </h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-5">
          {view.steps.map((step, index) => (
            <li key={index} className="border-shop-line flex flex-col gap-3 rounded-2xl border p-6">
              <span aria-hidden="true" className="bg-shop-primary text-shop-on-primary flex size-10 items-center justify-center rounded-full text-lg font-extrabold">
                {index + 1}
              </span>
              <h3 className="text-shop-text text-lg font-bold break-words">{step.title}</h3>
              <p className="text-shop-muted break-words">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {view.benefits.length > 0 ? (
        <section className={`${BAND} pt-10`}>
          <ul className="bg-shop-fill border-shop-line grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-7 rounded-2xl border p-7">
            {view.benefits.map((benefit, index) => (
              <li key={index} className="flex flex-col gap-1.5">
                <h3 className="text-shop-text font-bold break-words">{benefit.title}</h3>
                <p className="text-shop-muted text-sm break-words">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.questions.length > 0 ? (
        <section aria-label={view.questionsTitle} className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-14">
          <h2 className="text-shop-text text-2xl font-extrabold shop-sm:text-3xl">
            {view.questionsTitle}
          </h2>
          <div className="border-shop-line border-t">
            {view.questions.map((item, index) => (
              <details key={index} className="border-shop-line group border-b">
                <summary className="text-shop-text flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="break-words">{item.question}</span>
                  <ChevronDownIcon aria-hidden="true" className="text-shop-muted size-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-shop-muted pb-4 break-words">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${BAND} py-14`}>
        <div className="bg-shop-primary text-shop-on-primary flex flex-wrap items-center justify-between gap-6 rounded-3xl p-8 shop-sm:p-10">
          <div className="flex min-w-0 flex-[1_1_24rem] flex-col gap-2">
            <h2 className="text-2xl font-extrabold break-words shop-sm:text-3xl">{view.closingTitle}</h2>
            <p className="opacity-90 break-words">{view.closingText}</p>
          </div>
          <button type="button" onClick={onOpen} className="bg-shop-on-primary text-shop-primary min-h-12 rounded-xl px-7 font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
            {view.ctaLabel}
          </button>
        </div>
      </section>
    </>
  )
}
