"use client"

// React
import { useEffect, useId, useRef } from "react"

// Libs
import { CheckIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_COURIER_CARD, LANDING_CTA, LANDING_FOCUS_ON_GROUND } from "./landing-styles"

export interface LandingCourierSentProps {
  /** Which of the two is said: the application was taken, or its CPF was on the list already. */
  text: UiMessages["landing"]["couriers"]["form"]["sent" | "already"]
  /** "Enviar outro cadastro": the form comes back, empty. */
  onAgain: () => void
}

/**
 * What stands where the courier's form stood once there is nothing left to send: the application was
 * taken, or its CPF is on the list already (BEELINK-329). Either way it says who speaks next, and
 * where — the WhatsApp the person gave, since this step asks for no e-mail.
 *
 * It takes the focus as it arrives. The button the person pressed is gone with the form, and a focus
 * left on nothing starts the keyboard at the top of the page again; here it also reads the heading
 * out. The same card as the form, so nothing around it moves.
 */
export function LandingCourierSent({ text, onAgain }: LandingCourierSentProps) {
  const id = useId()
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    card.current?.focus()
  }, [])

  return (
    <div ref={card} tabIndex={-1} role="group" aria-labelledby={`${id}-title`} className={cn(LANDING_FOCUS_ON_GROUND, LANDING_COURIER_CARD, "items-start")}>
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-brand-yellow">
        <CheckIcon className="size-6" />
      </span>
      <h3 id={`${id}-title`} className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
        {text.title}
      </h3>
      <p className="text-[15px] leading-[1.5] text-brand-text">{text.text}</p>
      <button type="button" onClick={onAgain} className={cn(LANDING_CTA, "mt-1 h-12 cursor-pointer border-[1.5px] border-brand-ink px-5 text-[15px] font-bold")}>
        {text.again}
      </button>
    </div>
  )
}
