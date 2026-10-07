import type {
  Across,
  ComponentDisplay,
  ComponentKind,
  ContactFieldType,
  DesignPublishProblemKind,
  ProductSource,
} from "../blocks/design/design-types"
import type { CashbackEntryKindValue } from "../lib/cashback"
import type { CouponRefusalValue } from "../lib/order-discounts"
import type { SectionCategory } from "../lib/section-registry"
import type { LeadStatus } from "../blocks/leads/lead-types"
import type { StoreType } from "../blocks/store/store-types"

/**
 * Every sentence the blocks render, in one shape. A new language implements this interface, so a
 * missing key is a compile error rather than a word in the wrong language on someone's screen.
 */
export interface UiMessages {
  /**
   * The language these sentences are written in. A block builds its own `Intl` formatters from it,
   * which is how a number or a list is spelled correctly without a formatter — an unserialisable
   * object — having to live in the dictionary.
   */
  locale: Locale
  validation: {
    emailInvalid: string
    passwordRequired: string
    passwordMin: string
    passwordMax: string
    nameMin: string
    passwordsDoNotMatch: string
    storeNameMin: string
    storeNameMax: string
    storeDescriptionMax: string
    textTooLong: string
    urlInvalid: string
    whatsappRequired: string
    whatsappInvalid: string
    zipCodeInvalid: string
    ufInvalid: string
    colorInvalid: string
    paymentMethodsMin: string
    inactiveAfterDaysRange: string
    slugMin: string
    slugMax: string
    slugInvalid: string
  }
  login: {
    title: string
    description: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    forgotPassword: string
    submit: string
    submitting: string
    hint: string
    noAccount: string
    signUp: string
  }
  signup: {
    title: string
    description: string
    nameLabel: string
    namePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordHint: string
    submit: string
    submitting: string
    hasAccount: string
    signIn: string
  }
  forgotPassword: {
    title: string
    description: string
    emailLabel: string
    emailPlaceholder: string
    submit: string
    submitting: string
    backToSignIn: string
    sentTitle: string
    sentDescription: string
    sentHint: string
  }
  resetPassword: {
    title: string
    description: string
    passwordLabel: string
    passwordHint: string
    confirmationLabel: string
    submit: string
    submitting: string
    backToSignIn: string
  }
  verifyEmail: {
    checkingTitle: string
    checkingDescription: string
    verifiedTitle: string
    verifiedDescription: string
    verifiedBody: string
    goToSignIn: string
    invalidTitle: string
    invalidDescription: string
    invalidBody: string
    resend: string
    resending: string
    resentBody: string
    backToSignIn: string
  }
  /** A card on the panel's home: one thing left to set up, or one already done. */
  setup: {
    /** Marks a card whose thing is already done. The tick alone says nothing out loud. */
    done: string
  }

  /** The bar at the top of the sidebar that says which shop you are working in. */
  workspace: {
    label: string
    /** Names the list for a screen reader, which otherwise reads a column of shop names. */
    switchLabel: string
    /**
     * Stands where the shop's name goes when there is none to put there — a slug in the address
     * this person does not own, which is the only way to reach the panel without a shop.
     */
    none: string
    create: string
    /** Said while the shops are still loading, so the bar is never a blank rectangle. */
    loading: string
  }

  dashboard: {
    signOut: string
    signingOut: string
    chartTitle: string
    chartDescription: string
    chartShortDescription: string
    range90: string
    range30: string
    range7: string
    rangePlaceholder: string
    seriesVisitors: string
    seriesDesktop: string
    seriesMobile: string
  }
  /**
   * The shop window. Its copy is the design system's because the window is a block like any other
   * — what is the shopkeeper's is the four colours it wears, not the words.
   */
  storefront: {
    /** "-40%", computed from the pair of prices and never stored beside them. */
    discount: string
    /** `{name}` — the promotion that set the product page's price, by the shopkeeper's name for it. */
    promotion: string
    /** `{price}` — what it cost before, under the product page's price: "De: R$ 149,90". */
    priceWas: string
    /** `{rating}` `{count}` — what a reader hears for the stars: "Nota 4,7 de 5, 128 avaliações". */
    ratingOf: string
    ratingOfOne: string
    backToShop: string
    orderThis: string
    /**
     * The shelf is empty, said on the product's own page.
     *
     * The page keeps answering when the stock runs out — its address is what a shopkeeper sends on
     * WhatsApp, and a 404 there is the most visible failure this product can produce. So the visitor
     * is told, and the way to order is what goes away.
     */
    soldOut: string
    soldOutHint: string
    /** `{option}: {value}` — the legend of one option on the product page. */
    chosenValue: string
    /** Read after a value no combination has: ", indisponível". */
    valueMissing: string
    /** Read after a value whose combination is sold out: ", esgotado". */
    /** A sold-out value's second line on its card or pill, where its price would be. */
    valueSoldOutNotify: string
    /** Said in place of the order button when the chosen combination is sold out. */
    combinationSoldOut: string
    notifyMe: string
    restockTitle: string
    /** `{product}` and `{variant}`. */
    restockDescription: string
    restockPhone: string
    restockPhonePlaceholder: string
    restockName: string
    restockSubmit: string
    restockSending: string
    restockSent: string
    restockCancel: string
    /** Names a gallery thumbnail, which is otherwise a button a screen reader calls "button". */
    photoOf: string
    /** Under the product photo, only where a pointer hovers. */
    galleryHint: string
    /** The thumbnails that did not fit: "+{count}". */
    galleryMore: string
    galleryMoreLabel: string
    /** A slide of the product photo, which opens the viewer. */
    galleryOpen: string
    galleryViewerTitle: string
    galleryClose: string
    photoPrevious: string
    photoNext: string
    /** The header's basket, which now has an address of its own. */
    cart: string
    /** `{count}` — the basket's accessible name, which says how many lines it holds. */
    cartWithCount: string
    /** The cart link's name with a single item: "Carrinho, 1 item". */
    cartWithOne: string
    /** The cart page (F2). `{name}` names the line a control acts on, for a reader. */
    cartSummary: string
    cartSubtotal: string
    /** The summary's last row, said once something was taken off. */
    cartTotal: string
    /** The delivery fee's row in the cart's summary (BEELINK-178). */
    cartDelivery: string
    cartDeliveryFree: string
    /** `{name}` `{value}` — a first-purchase promotion a visitor's cart would get, announced until they sign in (BEELINK-245). */
    cartFirstPurchaseOpen: string
    /** `{value}` — the same when several would apply, and none is named. */
    cartFirstPurchaseOpenUnnamed: string
    /** `{name}` — why it is not theirs, to a customer who has bought from the shop before. */
    cartFirstPurchaseClosed: string
    /** The same when several would apply, and none is named. */
    cartFirstPurchaseClosedUnnamed: string
    /** `{count}` — units that can be ordered now. */
    cartItems: string
    cartItemsOne: string
    cartQuantity: string
    cartDecrease: string
    cartIncrease: string
    cartRemove: string
    cartContinue: string
    /** A sold-out line: kept in view, out of the order. */
    cartUnavailable: string
    /** Lines whose product left the shop, taken out when the page opened. */
    cartGone: string
    couponLabel: string
    couponPlaceholder: string
    couponApply: string
    couponChecking: string
    couponRemove: string
    /** `{code}`: the remove button's name for a reader, who hears no chip beside it. */
    couponRemoveNamed: string
    /** `{code}`. */
    couponApplied: string
    /** A visitor is told where the code goes: only a signed-in customer's is checked. */
    couponSignedOut: string
    /** Why a code is not taken; `BELOW_MINIMUM` takes `{value}`. */
    couponRefusals: Record<CouponRefusalValue, string>
    /** Added to `NOT_APPLICABLE` on a pick-up, the one case it has a remedy for. */
    couponPickupHint: string
    couponFailed: string
    couponTooMany: string
    /** A coupon in force whose check did not come back: the order waits for it, or for its removal. */
    couponUnchecked: string
    /**
     * What the shop window shows of its offers, unasked: the strip under the header — the invitation
     * to open an account, or the first-order benefit — and the cart's "Cupons disponíveis". Every
     * number in them (`{value}`, `{amount}`) is the API's, formatted by the screen.
     */
    /** The first-purchase pop-up (BEELINK-306): what a visitor reads where the shopkeeper wrote nothing. */
    popup: {
      close: string
      /** `{beneficio}` — the announced benefit, in words. The default title while one is in force. */
      title: string
      text: string
      /** The default text when the benefit is a free delivery, which is no discount. */
      textFreeShipping: string
      /** The default button's label, by what the benefit is: a coupon is a code to get, a promotion applies by itself. */
      button: { COUPON: string; PROMOTION: string }
      /** What stands in for any sentence that names a benefit while none is in force. */
      plainTitle: string
      plainText: string
      plainButton: string
      /** A second line, under the text, on a promotion that is not over the whole cart. */
      selected: string
    }
    offers: {
      /** The strip's accessible name. */
      region: string
      /** `{value}` — "10%" or "R$ 15,00"; inside a sentence, so lower case. */
      benefitDiscount: string
      benefitFreeShipping: string
      /** `{amount}` — a second sentence, when the benefit asks for a minimum. */
      minimum: string
      /** A visitor, at a shop with nothing for a first purchase: what an account gives here. */
      signUp: string
      /** `{benefit}` — a visitor, at a shop with a first-purchase benefit over the whole cart. */
      signUpBenefit: string
      /** `{benefit}` — the same, when the promotion is over named products or categories. */
      signUpBenefitSelected: string
      signUpAction: string
      /** `{benefit}` — a customer with no order that stands; the code follows the sentence. */
      firstOrderCoupon: string
      /** `{benefit}` — the same customer, at a shop whose first-purchase benefit is a promotion. */
      firstOrderPromotion: string
      firstOrderPromotionSelected: string
      useInCart: string
      copy: string
      copied: string
      /** The clipboard refused: the code is selected, to be copied by hand. */
      copySelected: string
      dismiss: string
      cartHeading: string
      /** `{value}` — a row's own line, so capitalised. */
      cartBenefitDiscount: string
      cartBenefitFreeShipping: string
      /** `{amount}` */
      cartMinimum: string
      cartFirstPurchase: string
      /** `{amount}` — what the products are below the coupon's minimum by. */
      cartMissing: string
      cartApply: string
      /** `{code}` — the button's name: several rows share the page. */
      cartApplyNamed: string
      cartApplied: string
    }
    /** `{amount}`: the checkout's box, with what the shopper can spend now (BEELINK-244). */
    cashbackUse: string
    /** `{amount}`: the most this cart takes, when it is less than the balance. */
    cashbackUseCapped: string
    /** The cart has nothing credit may pay for: the discounts took the products to nothing. */
    cashbackUseNothing: string
    /** The box is ticked and the cart's price with it did not come back: the order waits for it, or for the box. */
    cashbackUseUnchecked: string
    /** Adding to the cart (F3), on a card and on the product page. */
    addToCart: string
    addedToCart: string
    /** `{name}` — said to a reader once the cart has it. */
    addedToCartStatus: string
    /** A card whose product has options: the page is where one is chosen. */
    seeOptions: string
    /** `{name}` — the name of a card's "+", which draws no word of its own. */
    addNamedToCart: string
    buyNow: string
    /** "Entregar em" in the header: the visitor's CEP, kept for the shipping quote to come. */
    deliverTo: { label: string; ask: string; field: string; save: string; note: string }
    /** A featured product sold out: its page, where "Avise-me" is. */
    seeProduct: string
    /** A countdown's units, under its digits. */
    countdownUnits: { days: string; hours: string; minutes: string; seconds: string }
    /** Its end in words, for a screen reader and before the digits start: "{date}, às {time}". */
    countdownEnds: string
    /** Drawn in the editor over a countdown the shop no longer shows. */
    countdownEnded: string
    viewCart: string
    /** The phone bar's short line after an add: "Adicionado · Ver carrinho". */
    addedShort: string
    /** The buy box's stock line; a count is never public. */
    inStock: string
    /** Under the buy box's buttons, for a shop that takes orders on WhatsApp. */
    finishOnWhatsApp: string
    soldBy: string
    payment: string
    /** Placing the order, then opening the shop's WhatsApp with its number (F4, H9). */
    checkoutWhatsApp: string
    /** Placing the order at a shop with no WhatsApp on file: it is placed all the same (H9). */
    checkoutPlace: string
    checkoutPlacing: string
    /** How the order is handed over, and the payment — the shop's methods. */
    checkoutFulfillment: string
    checkoutDelivery: string
    /** `{address}`: the shopper's address on file, where a delivery goes. */
    checkoutDeliverTo: string
    checkoutPickup: string
    /** No street and city on file: delivery is off, and where to add them. */
    checkoutNoAddress: string
    /** Until the product computes a fee, the shop tells it. */
    checkoutFeeLater: string
    /** {fee} {window} — under the delivery choice, once the shop's rules quote one (BEELINK-178). */
    checkoutDeliveryArrives: string
    checkoutDeliveryFree: string
    checkoutDeliveryFreeAbove: string
    /** {distance} {radius} */
    checkoutOutOfRange: string
    checkoutOutOfRangePickup: string
    checkoutOutOfRangeAddress: string
    checkoutNoWay: string
    checkoutShippingUnavailable: string
    checkoutShippingChanged: string
    /** A window in words: {from} {to}, or {count} when both ends are the same. */
    windowMinutes: string
    windowMinutesOne: string
    windowHours: string
    windowHoursOne: string
    windowDays: string
    windowDaysOne: string
    /** A carrier's window (BEELINK-186): a range, several days alike ({count}), and a single day. */
    windowBusinessDays: string
    windowBusinessDaysOne: string
    windowBusinessDay: string
    /** The ways to deliver, when there are several to choose among (BEELINK-186). */
    checkoutWayChoose: string
    checkoutWayOwn: string
    /** {fee} {window} */
    checkoutCarrierArrives: string
    checkoutNoDeliveryHere: string
    /** The CPF of who receives a carrier's delivery, asked once (BEELINK-187). */
    checkoutRecipientDocument: string
    checkoutRecipientDocumentHint: string
    checkoutRecipientDocumentIssue: string
    /** {window} — on an order that goes by carrier. */
    orderWindowCarrier: string
    /** {window} — on an order, when the quote said it would arrive. */
    orderWindowOwn: string
    checkoutPayment: string
    checkoutChoosePayment: string
    /**
     * The refusals a shopper can meet placing the order, as the screen picks them. `{items}` names the
     * lines — "Moletom cinza: só restam 1" — and the `…Any` sentences stand in when none can be named.
     */
    checkoutStockShort: string
    checkoutStockShortAny: string
    /** `{name}` `{left}`; `{name}`. */
    checkoutStockLeft: string
    checkoutStockNone: string
    checkoutProductGone: string
    checkoutProductGoneAny: string
    checkoutPaymentGone: string
    checkoutAddressGone: string
    checkoutAddressChosenGone: string
    checkoutSignedOut: string
    checkoutTooMany: string
    checkoutFailed: string
    /** `{reason}`: a sentence of `couponRefusals`, for an order refused over its coupon. */
    checkoutCouponGone: string
    /** The shopper's cashback moved between the price on screen and the order (BEELINK-244): the cart was priced again. */
    checkoutCashbackGone: string
    /** The checkout's online ways, charged at the shop's own Asaas account (BEELINK-205). */
    checkoutPayNow: string
    checkoutPayLater: string
    checkoutPayPixHint: string
    checkoutPayCardHint: string
    checkoutInstallments: string
    /** `{amount}`: the whole total, in one payment. */
    checkoutInstallmentFull: string
    /** `{count}`, `{amount}`: each instalment, with no interest. */
    checkoutInstallmentOption: string
    /** While the delivery fee is not agreed, the total is open: no amount is promised. */
    checkoutInstallmentOpenFull: string
    checkoutInstallmentOpen: string
    /** `{minimum}`: Asaas's least charge. */
    checkoutOnlineBelowMinimum: string
    checkoutOnlineOnlyBelowMinimum: string
    checkoutOnlineFeeLater: string
    checkoutNothingToPay: string
    checkoutPayerDocument: string
    checkoutPayerDocumentHint: string
    checkoutPayerDocumentIssue: string
    checkoutPayOnline: string
    checkoutBelowMinimumGone: string
    /** After an order charged online is placed: its payment is the next screen (BEELINK-205). */
    checkoutSentPayHint: string
    /** The payment screen of one order (BEELINK-205). `{number}`. */
    paymentTitle: string
    paymentBack: string
    paymentAmount: string
    paymentPixTitle: string
    paymentPixSteps: string
    paymentPixQrAlt: string
    paymentPixCode: string
    paymentPixCopy: string
    paymentPixCopied: string
    paymentPixSelected: string
    /** `{date}`: until when the charge is paid here. */
    paymentValidUntil: string
    paymentConfirmsHere: string
    paymentPixWaitingTitle: string
    paymentPixWaitingBody: string
    paymentPixExpiredTitle: string
    paymentPixExpiredBody: string
    paymentPixRenew: string
    paymentCardTitle: string
    paymentCardBody: string
    paymentCardOpen: string
    paymentNewTab: string
    paymentInstallmentsFull: string
    /** `{count}`, `{amount}`. */
    paymentInstallments: string
    paymentCardExpiredTitle: string
    paymentCardExpiredBody: string
    paymentNoneTitle: string
    paymentNoneBody: string
    paymentCancelledTitle: string
    paymentCancelledBody: string
    paymentCreate: string
    paymentCreating: string
    paymentAwaitingTotalTitle: string
    paymentAwaitingTotalBody: string
    paymentPaidTitle: string
    paymentPaidBody: string
    paymentRefundedTitle: string
    paymentRefundedBody: string
    paymentOrderCancelledTitle: string
    paymentOrderCancelledBody: string
    paymentUnreadTitle: string
    paymentUnreadBody: string
    paymentRetry: string
    paymentAddDocument: string
    /** Why a charge was not made, by the API's code. */
    paymentRefusedNotOnline: string
    paymentRefusedOrderCancelled: string
    paymentRefusedAwaitingTotal: string
    paymentRefusedAlreadyPaid: string
    paymentRefusedInProgress: string
    paymentRefusedBelowMinimum: string
    paymentRefusedDocumentMissing: string
    paymentRefusedRefused: string
    paymentRefusedUnavailable: string
    paymentRefusedSignedOut: string
    paymentRefusedTooMany: string
    paymentRefusedFailed: string
    /** Where an order's online payment stands, on its page and its card (BEELINK-205). */
    orderPayAwaiting: string
    orderPayAwaitingTotal: string
    orderPayApproved: string
    orderPayOverdue: string
    orderPayCancelled: string
    orderPayRefunded: string
    orderPayPartlyRefunded: string
    orderPayNow: string
    /** `{method}`: Pix, or the credit card. */
    orderPaymentOnline: string
    /** `{method}`, `{count}`. */
    orderPaymentOnlineInstallments: string
    orderCancelRefusedPaid: string
    /** A visitor at the checkout: ordering asks who they are, the cart waits (G4). */
    checkoutSignInPrompt: string
    checkoutSignIn: string
    checkoutSignUp: string
    /** Over the shopper's details, as the shop keeps them. */
    checkoutFor: string
    checkoutEdit: string
    /** A shopper with no phone on file: the shop has no way to reach them but the WhatsApp itself. */
    checkoutPhoneMissing: string
    /** The cart once the order is placed: `{number}`, then what happens next — on WhatsApp, or at the shop. */
    checkoutSent: string
    checkoutSentHint: string
    checkoutSentShopHint: string
    checkoutRetry: string
    /** The message itself. `{number}` `{shop}`; `{qty}` `{name}` `{total}`; `{total}`; `{name}`. */
    orderGreeting: string
    orderLine: string
    orderTotal: string
    orderCustomer: string
    /** `{phone}`, `{address}` — the shopper's lines under the order. */
    orderPhone: string
    orderAddress: string
    orderPickup: string
    /** `{method}`. */
    orderPayment: string
    /** The shop's sign-in page (G2): its three faces, and what each one says. */
    signInTitle: string
    signUpTitle: string
    forgotTitle: string
    signInLead: string
    signUpLead: string
    forgotLead: string
    signInName: string
    signInEmail: string
    signInPassword: string
    signInPasswordHint: string
    /** Beside Google's "G", on the sign-in and sign-up faces. */
    continueWithGoogle: string
    /** Between the Google button and the e-mail form. */
    signInOr: string
    signInSubmit: string
    signUpSubmit: string
    forgotSubmit: string
    toSignUp: string
    toSignIn: string
    toForgot: string
    /** `{email}` — after signing up: the link is on its way. */
    signUpSent: string
    /** After asking for a new password: said alike for any address. */
    forgotSent: string
    /** The shop's own pages for a shopper's e-mailed links (BEELINK-149). */
    verifyEmailTitle: string
    newPasswordTitle: string
    newPasswordLead: string
    newPasswordLabel: string
    newPasswordRepeat: string
    newPasswordSubmit: string
    linkSpentVerify: string
    linkSpentReset: string
    linkResend: string
    linkAskAgain: string
    linkSpentTitle: string
    linkSpentSignIn: string
    /** The shopper's own access to their account (BEELINK-150). */
    securityTitle: string
    securityChangeLead: string
    securityCurrentPassword: string
    securityChangeSubmit: string
    securityGoogleLead: string
    securityCreateSubmit: string
    securityEverywhereLead: string
    securityEverywhereSubmit: string
    securityPasswordChanged: string
    securityLinkSent: string
    signedOutEverywhere: string
    /** "Baixar meus dados" and "Excluir minha conta" (BEELINK-152). */
    privacyTitle: string
    privacyLead: string
    privacyDownload: string
    privacyDownloadHint: string
    privacyDownloadFailed: string
    privacyDelete: string
    privacyDeleteLead: string
    /** `{amount}`: what deleting the account takes from the shopper's cashback (BEELINK-244). */
    privacyDeleteCashback: string
    privacyDeletePassword: string
    privacyDeleteEmail: string
    privacyDeleteSubmit: string
    privacyPasswordWrong: string
    accountDeleted: string
    /** The shopper's notices by e-mail (BEELINK-151). */
    noticesTitle: string
    noticesLead: string
    noticesOrders: string
    noticesOrdersHint: string
    noticesFavorites: string
    noticesFavoritesHint: string
    noticesCashback: string
    noticesCashbackHint: string
    noticesOffers: string
    noticesOffersHint: string
    noticesOffersSince: string
    noticesSave: string
    noticesSaved: string
    emailConfirmed: string
    passwordReplaced: string
    signOut: string
    /** `{name}` — the header's greeting once signed in: "Olá, Bia". */
    accountHello: string
    /** The shopper's page at a shop (G3). */
    accountLead: string
    accountDetails: string
    accountAddress: string
    accountPhone: string
    /** The profile's own fields (BEELINK-147): the e-mail shown, the CPF and the birth date. Their refusals are the web's `errors`. */
    accountFullName: string
    accountEmailFixed: string
    accountCpf: string
    accountCpfHint: string
    accountBirthDate: string
    accountBirthDateHint: string
    accountZipCode: string
    accountStreet: string
    accountNumber: string
    accountComplement: string
    accountNeighborhood: string
    accountCity: string
    accountState: string
    accountSave: string
    accountSaved: string
    /**
     * The phone refused because the shop already has it on another record — most likely one the
     * shopkeeper made from a WhatsApp sale. Says to talk to the shop, who can merge the two.
     */
    accountPhoneTaken: string
    /** The shopper's saved addresses (BEELINK-148): the cards, their form and the cart's choice. */
    addressesTitle: string
    addressesAdd: string
    addressesDefault: string
    addressesEdit: string
    addressesRemove: string
    addressesMakeDefault: string
    addressesEditLabel: string
    addressesRemoveLabel: string
    addressesMakeDefaultLabel: string
    addressesLimit: string
    addressesSaved: string
    addressesRemoved: string
    addressesDefaultSet: string
    addressFormNew: string
    addressFormEdit: string
    addressLabel: string
    addressLabelHint: string
    addressLabelPlaceholder: string
    addressRecipient: string
    addressRecipientHint: string
    addressLookup: string
    addressLookupPending: string
    addressLookupNotFound: string
    addressLookupFailed: string
    addressMakeDefault: string
    addressSave: string
    addressCancel: string
    addressesRemoveAsk: string
    addressZipCodeFormat: string
    addressStateFormat: string
    checkoutAddressChoose: string
    checkoutAddAddress: string
    checkoutAddAnotherAddress: string
    /** The product page (5b). `{name}` — the shop, over the title. */
    visitShop: string
    /** The buy column's landmark name. */
    buyBoxLabel: string
    descriptionHeading: string
    /** The product page's related rail: what it is, never "customers who viewed" — nothing is tracked. */
    relatedHeading: string
    specsHeading: string
    /** The technical table's row for the product's category. */
    specCategory: string
    /** "Sobre este item": the description's first list, in the info column. */
    aboutItem: string
    /** Down to the rest of the description; the "›" is drawn apart. */
    fullDescription: string
    /** The line over "Minha conta" in the header, for a visitor not signed in. */
    accountGreeting: string
    /** The shopper's area (J3): its menu, in the design's order, and the way back to it on a phone. */
    accountOverview: string
    accountOrders: string
    accountFavorites: string
    accountReviews: string
    accountCashback: string
    accountProfile: string
    accountMessages: string
    /** The account's cashback tab (BEELINK-244). */
    accountCashbackTab: {
      balance: string
      pending: string
      pendingHint: string
      /** `{amount}`, `{date}`: the soonest part of the balance to expire. */
      nextExpiry: string
      noExpiry: string
      howToUse: string
      /** `{rate}`: the shop's rule, while its cashback is on. */
      earns: string
      /** `{rate}`, `{minimum}`. */
      earnsFrom: string
      credits: string
      /** `{number}`. */
      order: string
      /** A credit the shopkeeper gave, from no order. */
      shopCredit: string
      /** `{left}`, `{amount}`: a credit partly spent. */
      left: string
      /** `{date}`. */
      expiresOn: string
      neverExpires: string
      waitsDelivery: string
      statement: string
      empty: string
      emptyStatement: string
      kinds: Record<CashbackEntryKindValue, string>
      failed: string
    }
    /** The header's account menu (J21): its heading's link to the front, and the profile in the shopper's words. */
    accountMenuOverview: string
    accountMenuProfile: string
    accountBack: string
    /** The front (6c): the order on its way, the last one when none is, and the shopper's details. */
    accountInProgress: string
    accountInProgressEyebrow: string
    accountTrackOrder: string
    accountShipTo: string
    accountMoreInProgress: string
    accountMoreInProgressMany: string
    accountLastOrder: string
    accountSeeOrders: string
    accountDetailsEdit: string
    accountDetailsPhone: string
    accountDetailsEmail: string
    accountDetailsNoPhone: string
    accountDetailsNoAddress: string
    accountDetailsAddressIncomplete: string
    /** An order's steps (6c, 6f): one per status the shopper follows, the pick-up's last in its own words. */
    orderSteps: string
    orderStepPlaced: string
    orderStepAccepted: string
    orderStepPreparing: string
    orderStepOut: string
    orderStepDelivered: string
    orderStepPickedUp: string
    /** Read after a step's name by a screen reader; the marks say it to the eye. */
    orderStepDone: string
    orderStepTodo: string
    /** Meus pedidos (J4): the list's toolbar, tabs, cards, the cancel and its refusals, and the empty states. */
    ordersFilterLabel: string
    ordersSearchLabel: string
    ordersSearchPlaceholder: string
    ordersFilter: string
    ordersPeriod: string
    ordersAllTime: string
    ordersLastMonths: string
    ordersTabAll: string
    ordersTabActive: string
    ordersTabDelivered: string
    ordersTabCancelled: string
    orderPlacedOn: string
    orderTotalLabel: string
    orderShipTo: string
    orderPickupLabel: string
    /** `{number}`. */
    orderNumber: string
    orderStatusReceived: string
    orderStatusAccepted: string
    orderStatusPreparing: string
    orderStatusOut: string
    /** `{date}`. */
    orderStatusDelivered: string
    orderStatusPickedUp: string
    orderStatusCancelled: string
    orderCancelledByShop: string
    /** bee-link's own cancellation, of an order charged online that nobody paid in time (BEELINK-208). */
    orderCancelledBySystem: string
    orderEventBySystem: string
    /** Refunds on the customer's order (BEELINK-208): "{amount}", "{date}". */
    orderPayRefunding: string
    orderRefundsTitle: string
    orderRefundDone: string
    orderRefundProcessing: string
    orderRefundCardNote: string
    orderEventRefund: string
    /** A paid order is not cancelled from the customer's side. */
    orderCancelPaidHint: string
    orderCancelledByYou: string
    /** `{date}`. */
    orderPlacedByYou: string
    orderPlacedByShop: string
    orderReceivedHint: string
    /** `{qty}`; `{count}`. */
    orderQty: string
    orderMoreItem: string
    orderMoreItems: string
    orderCancel: string
    /** `{number}`. */
    orderCancelTitle: string
    orderCancelBody: string
    orderCancelKeep: string
    /** The dialog's X: closing it keeps the order, but it reads as a close. */
    orderCancelClose: string
    orderCancelConfirm: string
    orderCancelling: string
    orderCancelRefusedAccepted: string
    orderCancelRefusedDone: string
    orderCancelFailed: string
    /** The session ended between the page and the cancel. */
    orderCancelSignedOut: string
    /** Over the list once a cancel lands: the order may leave the tab shown, so it is said. */
    orderCancelledNotice: string
    ordersEmpty: string
    ordersEmptyCta: string
    ordersNoResults: string
    ordersClear: string
    /** The list could not be read: never shown as an empty list, which would say there are none. */
    ordersUnavailable: string
    ordersRetry: string
    /**
     * The heart (J15): on a card's photo and on the product's page. `{name}` is the product's. Signed
     * out it is a link to sign in, which comes back with the product liked.
     */
    favoriteToggle: string
    favoriteSignIn: string
    /** The product page's buy box says it in words: to add, and once added. */
    favoriteAddText: string
    favoriteSavedText: string
    /** A like the API refused, in the notice at the foot of the screen. `{count}` is the cap. */
    favoriteFailed: string
    favoriteLimit: string
    favoriteLimitLink: string
    favoriteNoticeClose: string
    /** Favoritos (6g): the tab's filters, order, cards, the remove and the empty states. */
    favoritesFilterLabel: string
    favoritesTabAll: string
    favoritesTabDropped: string
    favoritesTabOnSale: string
    favoritesTabSoldOut: string
    favoritesSortLabel: string
    favoritesSortRecent: string
    favoritesSortPrice: string
    favoritesSortDiscount: string
    favoritesSortApply: string
    /** `{amount}`, already formatted. */
    favoriteDrop: string
    /** `{date}`. */
    favoriteLikedOn: string
    favoriteRemove: string
    favoriteSoldOut: string
    /** Drawn beside "Esgotado" and never read: it is asked on the product's page. */
    favoriteSoldOutNotify: string
    favoriteRemoved: string
    favoritesEmpty: string
    favoritesEmptyCta: string
    favoritesNoResults: string
    favoritesClear: string
    /** The list could not be read: never shown as an empty list. */
    favoritesUnavailable: string
    favoritesRetry: string
    /** Over the tab (J16): the notices of a favourite go by e-mail, and where to change them. */
    favoritesHintOn: string
    favoritesHintOff: string
    favoritesHintChange: string
    favoritesHintTurnOn: string
    /** The account's front (6c, BEELINK-159): the purchases to rate and the favourites' rail. */
    overviewReviewsTitle: string
    overviewSeeAll: string
    overviewReviewComment: string
    overviewReviewOpen: string
    quickRatingGroup: string
    favoritesRailTitle: string
    favoritesRailCountOne: string
    favoritesRailCountMany: string
    favoritesRailDroppedOne: string
    favoritesRailDroppedMany: string
    favoritesRailDrop: string
    /** Avaliar compras (6c, J18): the tab, its two sections, the stars, the form and what came of it. */
    orderReviewProduct: string
    reviewsPendingTitle: string
    reviewsPendingHint: string
    reviewsNothingPending: string
    reviewsSentTitle: string
    /** `{date}`. */
    reviewDeliveredOn: string
    reviewRatingLegend: string
    reviewStarOne: string
    /** `{count}`. */
    reviewStarMany: string
    /** `{rating}`: the stars read as one sentence. */
    reviewRatedLabel: string
    reviewCommentLabel: string
    reviewCommentPlaceholder: string
    reviewSend: string
    reviewSave: string
    reviewEdit: string
    reviewHiddenByShop: string
    reviewSent: string
    reviewSaved: string
    /** A rating or comment the shop refused: the form's own words, not the panel's. */
    reviewInvalid: string
    /** The product page's reviews (D14, 5b): the summary, the histogram's rows and each review. */
    productReviewsTitle: string
    productReviewsCountOne: string
    /** `{count}`. */
    productReviewsCountMany: string
    productReviewsStarOne: string
    /** `{stars}`. */
    productReviewsStarMany: string
    /** `{stars}`, `{percent}`: what a reader hears for a row of the histogram. */
    productReviewsRowOne: string
    productReviewsRowMany: string
    productReviewsAll: string
    productReviewsVerified: string
    /** `{date}`. */
    productReviewsOn: string
    productReviewsNoneForRating: string
    productReviewsNonePage: string
    reviewsEmpty: string
    reviewsEmptyCta: string
    /** The list could not be read: never shown as nothing to rate. */
    reviewsUnavailable: string
    reviewsRetry: string
    /** The order's own page (J5): its trail, its status and history, its lines, payment and address, and the receipt. */
    orderDetails: string
    orderReceipt: string
    orderUpdatedAt: string
    orderHistory: string
    orderEventCancelled: string
    orderEventReadyForPickup: string
    orderEventPlacedByYou: string
    orderEventPlacedByShop: string
    orderEventByYou: string
    orderEventByShop: string
    orderItemsTitle: string
    orderEach: string
    orderPaymentTitle: string
    orderSubtotal: string
    orderDelivery: string
    orderFree: string
    /** A delivery whose fee the shop has not told yet (BEELINK-170), and its total beside it. */
    orderFeeToAgree: string
    orderTotalPlusFee: string
    /** The same on a "Meus pedidos" card, which has no fee row to say "a combinar" in. */
    orderCardTotalPlusFee: string
    /** `{value}`: under a card's total. */
    orderCardSaving: string
    /** `{value}`, `{code}`. */
    orderCardSavingCoupon: string
    /** `{code}`: a coupon that took nothing yet — a free delivery whose fee is not agreed. */
    orderCardCoupon: string
    orderTotalRow: string
    orderPaymentAgreed: string
    orderUnavailable: string
    receiptTitle: string
    receiptShop: string
    receiptCustomer: string
    receiptDate: string
    receiptNotInvoice: string
    receiptPrint: string
    receiptBack: string
    /** Buying an order again (J6): the button, and what the cart says of it. */
    reorder: string
    reorderAll: string
    reorderDone: string
    reorderNone: string
    reorderLeft: string
    reorderOffSale: string
    reorderSoldOut: string
    reorderLimitedOne: string
    reorderLimitedMany: string
    reorderFailed: string
    reorderTrimmed: string
    /** The window a delivery should arrive in, and how it comes (J7). */
    orderEstimateRange: string
    orderEstimateDay: string
    orderTrackingOwn: string
    orderTrackingCode: string
    orderTrackingCopy: string
    orderTrackingCopied: string
    /** The clipboard refused: the code is selected instead, for the shopper to copy by hand. */
    orderTrackingSelected: string
    orderTrackingCarrierLink: string
    orderTrackingOwnLink: string
    /** The order's conversation in the shop window (K3): the header's icon, the list, one conversation. */
    conversationsTitle: string
    /** The word beside the header's balloon, as the cart's; the link's names below start with it. */
    conversationsLabel: string
    conversationsLink: string
    conversationsLinkWithOne: string
    conversationsLinkWithCount: string
    conversationsClose: string
    conversationsBack: string
    conversationsEmpty: string
    conversationsEmptyHint: string
    conversationsFailed: string
    conversationClosedTag: string
    /** A row's last line when the shopper wrote it: "Você: {body}". */
    conversationYouSaid: string
    conversationUnreadOne: string
    conversationUnreadMany: string
    conversationViewOrder: string
    conversationStart: string
    conversationClosed: string
    conversationSent: string
    conversationRead: string
    conversationFromShop: string
    /** A status notice in the conversation (BEELINK-236), by status — PICKED_UP is a pick-up's DELIVERED. */
    conversationNotices: { RECEIVED: string; ACCEPTED: string; PREPARING: string; OUT_FOR_DELIVERY: string; DELIVERED: string; PICKED_UP: string; CANCELLED: string; PAYMENT_APPROVED: string; CANCELLED_UNPAID: string; /** "{amount}". */ PAYMENT_REFUNDED: string }
    /** A delivery's notice with the cashback it made usable (BEELINK-239): "{notice}", then "{amount}" — the punctuation between them is the copy's. */
    conversationCashback: string
    /** The buy box (BEELINK-243): `{amount}`, the most the chosen price and quantity earn — the cart's discounts can only lower it. */
    productCashback: string
    /** The buy box, under the shop's minimum: `{rate}`, `{minimum}`. */
    productCashbackFrom: string
    /** The cart's summary: `{amount}` the order would earn. */
    cartCashbackEarns: string
    /** A visitor's cart, whose first-purchase promotion may lower it once identified: `{amount}`. */
    cartCashbackEarnsUpTo: string
    /** The cart's summary, under the minimum: `{amount}` missing, `{rate}`. */
    cartCashbackMissing: string
    /** An order's cashback, to its customer: `{amount}`, `{date}`. */
    orderCashback: { PENDING: string; AVAILABLE: string; AVAILABLE_UNTIL: string; SPENT: string; VOIDED: string; EXPIRED: string }
    conversationFromYou: string
    conversationLabel: string
    conversationPlaceholder: string
    conversationSend: string
    conversationSending: string
    conversationTooLong: string
    conversationRefusedClosed: string
    conversationRefusedRate: string
    conversationRefusedSignedOut: string
    conversationRefusedUnknown: string
    conversationFailed: string
    /** The basket's own page. Empty until there is anything that can put a line in it. */
    cartEmpty: string
    cartEmptyHint: string
    account: string
    noPhoto: string
    search: string
    searchAction: string
    /** Names the select before the field: which category the search is narrowed to. */
    searchScope: string
    /** The select's first option: the whole shop. */
    searchScopeAll: string
    /**
     * Distinct from `search`, which is the field's accessible name: a placeholder is gone the
     * moment someone types, so it can never be the only label a field has (WCAG 3.3.2).
     */
    searchPlaceholder: string
    /** A link back to the unfiltered address, never a button that empties a field in place. */
    searchClear: string
    /** The search page's own title, which is what it has before anyone has typed anything. */
    searchHeading: string
    /**
     * "{count} resultados para {term}". `{count}` arrives already spelled by the block's own
     * `Intl.NumberFormat`, since a formatter cannot live in a dictionary.
     */
    searchResults: string
    /**
     * The `{count} === 1` form. A key rather than a branch, because choosing between them cannot
     * be a function; both languages have exactly these two forms and no third.
     */
    searchResultsOne: string
    /** `{term}`. Says back what was searched for, because "nothing found" alone hides a typo. */
    searchEmpty: string
    /** Names the list that opens under the field, which is otherwise announced as "list". */
    searchSuggestionsLabel: string
    /** "Ver todos os {count} resultados" — the way out of a list that only shows the first few. */
    searchSeeAll: string
    /** Said while the list is being fetched, so a slow connection is not silence. */
    searchLoading: string
    categoriesLabel: string
    allCategories: string
    /** The menu's last item: the catalogue narrowed to what is on sale. */
    dailyOffers: string
    /** Names the trail for a screen reader, which otherwise reads a row of links with no purpose. */
    breadcrumbLabel: string
    /** The first crumb. The shop's own name would repeat the logo standing right above it. */
    breadcrumbHome: string
    empty: string
    emptyHint: string
    /** An empty shelf with filters in force, and its way out to the same address as "Limpar tudo". */
    emptyFiltered: string
    emptyFilteredHint: string
    emptySeeAll: string
    /** An empty category or search, and its way out to the whole catalogue. */
    emptyCatalog: string
    /** The shelf could not be read: an outage, never "nothing found". */
    shelfFailed: string
    shelfFailedHint: string
    shelfRetry: string
    productsHeading: string
    /**
     * "{count} produtos", under the catalogue's title and on a category's card. One pair serves
     * both because it is the same sentence about the same things.
     */
    productCount: string
    /** The `{count} === 1` form; see `searchResultsOne`. */
    productCountOne: string
    /** The catalogue page, which is the whole shop — the home is a landing and shows a selection. */
    catalogTitle: string
    /** Rendered only while a filter is on: an offer to clear nothing reads as a broken control. */
    clearFilters: string
    /** The order the list is asked for. The screen renders the picker only if it can ask for one. */
    sortLabel: string
    /** The shop's own order, first in the sort list: "Mais relevantes". */
    sortRelevance: string
    sortNewest: string
    /** "Maior desconto": the biggest saving first. */
    sortDiscount: string
    /** The sort's submit button, drawn only when scripting is off: a change submits by itself otherwise. */
    sortApply: string
    /** `{from}` `{to}` `{total}` — the listing's count in 5a: "1–16 de 86 resultados". */
    resultsRange: string
    resultsOne: string
    resultsNone: string
    /** The word before a searched term in the count: "… resultados para "whey"". */
    resultsFor: string
    /** The listing's filter column (5a): its heading, and the link that takes every filter off. */
    filtersTitle: string
    filtersClear: string
    /** `{label}` — a chip's accessible name: "Remover filtro 300 g". */
    filterRemove: string
    filterCategory: string
    /** The chip of `desconto=1`. */
    filterOnSale: string
    /** `{percent}` — the chip of `desconto=<n>`: "10% ou mais". */
    filterDiscountAtLeast: string
    /** `{min}` `{max}` — a price range's chip, whole reais already formatted. */
    filterPriceBetween: string
    filterPriceUpTo: string
    filterPriceFrom: string
    filterDiscount: string
    /** The phone's door to the filters: "Filtrar", and "Filtrar ({n})" with `{n}` in force. */
    filtersOpen: string
    filtersOpenCount: string
    filtersClose: string
    /** `{count}` — the sheet's footer, which closes it on the shelf as it now stands. */
    filtersShowResults: string
    filtersShowResultsOne: string
    filtersShowResultsNone: string
    filterPrice: string
    /** `{min}` — the last quick range: "Acima de R$ 200". */
    filterPriceAbove: string
    filterPriceMin: string
    filterPriceMax: string
    /** The min/max form's button. */
    filterPriceApply: string
    /** What each slider thumb is called to a reader. */
    filterPriceLowest: string
    filterPriceHighest: string
    /** Opens the rest of a long group — past the first five values. */
    filterShowMore: string
    sortPriceAsc: string
    sortPriceDesc: string
    /** The categories index, and the same heading over the home's band of them. */
    categoriesTitle: string
    /** A shop is allowed to sell without categories, and that page still has to say something. */
    categoriesEmpty: string
    /** Names the nav for a screen reader, which otherwise reads a row of digits with no purpose. */
    paginationLabel: string
    paginationPrevious: string
    paginationNext: string
    /** "Página {current} de {total}". */
    paginationStatus: string
    /** `{page}`. The accessible name of a numbered link, whose text is a digit and nothing more. */
    paginationPage: string
    /** The home's band of products: a selection with a way into the catalogue, not the catalogue. */
    featuredHeading: string
    /** What an untitled showcase of the newest products, or of those on sale, is headed by. */
    newestHeading: string
    onSaleHeading: string
    /** The rail's arrows. They are an addition on top of native scrolling, never the only way in. */
    railPrevious: string
    railNext: string
    /**
     * The line above a band's heading. Platform copy and not the shopkeeper's, so it says what is
     * true of every shop — a shop's own words for its bands belong to a panel field that does not
     * exist yet, and inventing a voice for someone else's shop is worse than a plain sentence.
     */
    featuredEyebrow: string
    categoriesEyebrow: string
    seeAll: string
    /** The button of a banner whose words stand beside its picture. */
    learnMore: string
    /** Its name for a screen reader, after the banner: two "Saiba mais" in a list of links say nothing. */
    learnMoreAbout: string
    /**
     * `{section}`. The accessible name of a "see all" link, because a home with three of them
     * hands a screen reader the same two words three times (WCAG 2.4.4).
     */
    seeAllOf: string
    /** Read out while a showcase's products are on their way; the cards themselves are hidden. */
    loadingShelf: string
    /** A site's header menu and its footer column: the page's named bands. */
    siteMenu: string
    footerNavigation: string
    order: string
    socialLabel: string
    /** Names a footer column. The links inside are addresses, so the screen builds them. */
    footerShop: string
    footerContact: string
    /** "© {year} {name}. Todos os direitos reservados." — the year is the screen's. */
    copyright: string
    /**
     * The cookie strip of a shop with a Meta Pixel (BEELINK-271). It says what happens on a yes and
     * on a no, and never calls one of them the better answer.
     */
    consent: {
      title: string
      /** {privacy} is the link to the privacy policy, worded by `legal.privacy`. */
      body: string
      refuse: string
      accept: string
      /** On a strip opened again from the footer: the answer in force. */
      current: Record<"granted" | "denied", string>
      /** Said aloud once an answer is given, since the strip leaves the page with it. */
      saved: Record<"granted" | "denied", string>
      /** The footer's way back to the choice. */
      footerLink: string
    }
    /**
     * What the shop takes, said to a customer rather than to the shopkeeper. `admin.store.payment`
     * has the same four names, and they are not reusable here: its hints explain a checkbox to the
     * person ticking it ("Pagamento em espécie na entrega"), which is not what a band above the
     * products is for.
     */
    payments: {
      money: string
      pix: string
      creditCard: string
      debitCard: string
      /** Credit and debit together, as the buy box lists them. */
      card: string
    }
    /** A site's contact form, as the visitor fills it in. */
    contact: {
      /** The one field every form asks, first: who is writing. */
      nameLabel: string
      /** Said after a label a visitor may skip, so the required ones need no asterisk legend. */
      optional: string
      selectPlaceholder: string
      submit: string
      sending: string
      sentTitle: string
      sentText: string
      /** Beside the form, when the site has a WhatsApp: the other way in. */
      whatsappLead: string
      whatsappAction: string
      /**
       * The trap's label. Read only by what reads the markup — a screen reader never reaches it,
       * the field is `aria-hidden` — so it says plainly what a person should do if they ever do.
       */
      trapLabel: string
    }
    /** An icon with no words announces itself as "link" and nothing else. */
    networks: {
      whatsapp: string
      instagram: string
      tiktok: string
      youtube: string
      spotify: string
    }
  }
  /** The panel's catalogue screens: what a shopkeeper fills in, never what a visitor reads. */
  /** The shop's posters: what the landing page shows above everything it sells. */
  /** The design mode: the shop drawn on the left, its posters arranged on the right. */
  design: {
    title: string
    description: string
    empty: string
    emptyHint: string
    /** The grip. It names the banner, because a list of "drag" tells a screen reader nothing. */
    dragHandle: string
    /** The product bands, as a row in the arrangement. It is dragged like a poster. */
    productList: string
    /** What a component is called in the editor when the shopkeeper has not titled it. */
    kinds: Record<ComponentKind, string>
    /**
     * What a block of this kind is still missing, said on the placeholder the page draws for it.
     * Keyed by the whole union so a kind added later cannot ship without its sentence.
     */
    emptyAction: Record<ComponentKind, string>
    /** A showcase shown again in the draft, whose products the page has not been served yet. */
    showcaseOnPublish: string
    /** A categories block with no category the shop window would show — said to the owner, not a visitor. */
    categoriesHiddenAction: string
    /**
     * Why a block draws nothing, said in its sheet, with the way out. `{count}` is how many
     * categories have no product yet.
     */
    emptyStates: {
      categoriesUnlinked: { title: string; body: string; bodyOne: string; action: string }
      categoriesNone: { title: string; body: string; action: string }
      categoriesHidden: { title: string; body: string; action: string }
      categoriesDrafts: { title: string; body: string; action: string }
      productsNone: { title: string; body: string; action: string }
      productsOffShelf: { title: string; body: string; action: string }
      sourceEmpty: { title: string; body: string }
      featuredUnavailable: { title: string; body: string }
      countdownEnded: { title: string; body: string }
      countdownUnset: { title: string; body: string }
      /** Said after a link that leaves the arrangement's draft where it is. */
      opensInNewTab: string
    }
    /** The gallery a block is added from. */
    /** The gallery of whole-page models, opened from the editor's bar. */
    templateGallery: {
      /** The bar's entry. */
      open: string
      title: string
      description: string
      /** The cards, named for a screen reader. */
      listLabel: string
      /** The switch that keeps only the models suggested for the shop's category. */
      recommendedOnly: string
      recommended: string
      needsProduct: string
      view: string
      /** The button's name for a screen reader: `{name}` is the model's. */
      viewNamed: string
      selected: string
      loading: string
      loadingPreview: string
      previewFailed: string
      retry: string
      /** On a card whose model is built around a product, until one is chosen. */
      chooseProduct: string
      /** On a card whose model asks for something this gallery cannot choose. */
      previewUnavailable: string
      product: string
      productPlaceholder: string
      productEmpty: string
      productHint: string
      empty: string
      failed: string
      /** In the large preview's place, before a model is chosen. */
      largeHint: string
      /** The large preview, named: `{name}` is the model's. */
      previewOf: string
      back: string
      apply: string
      /** Beside the button, while the chosen model is built around a product and none is chosen. */
      applyNeedsProduct: string
      /** Beside the button, for a model that asks for something this gallery cannot choose. */
      applyUnavailable: string
    }
    /** The question before a model replaces a page's draft. */
    templateApply: {
      /** `{name}` is the model's. */
      title: string
      /** `{page}` is the page's name. */
      replaces: string
      shopUnchanged: string
      /** Said only when the draft holds changes the shop does not serve yet. */
      unpublishedLost: string
      cancel: string
      confirm: string
      applying: string
      /** When the API refused with a code the screen has no sentence for. */
      failed: string
    }
    /** The line the editor shows once a model is in the draft. */
    templateApplied: {
      /** `{name}` is the model's. */
      applied: string
      /** Above the page's problems, when the model left any. */
      problemsTitle: string
      checking: string
      publish: string
      dismiss: string
    }
    gallery: {
      title: string
      description: string
      searchLabel: string
      searchPlaceholder: string
      /** Said when the search matches nothing. */
      empty: string
      /** The shelves on the left, Recomendadas first. */
      categories: Record<"RECOMMENDED" | SectionCategory, string>
      categoriesLabel: string
      /** Over the grid while searching: what matched in every shelf. */
      results: string
      add: string
      /** The button's name for a screen reader: `{name}` is the section's. */
      addNamed: string
      /** What a card's preview says where the shop has nothing of its own to show yet. */
      samples: {
        bannerTitle: string
        headingTitle: string
        headingSubtitle: string
        paragraph: string
        announcement: string
        contactTitle: string
        benefits: { shipping: string; pix: string; exchange: string }
        contact: { email: string; phone: string; message: string }
        faqTitle: string
        faq: { question: string; answer: string }[]
        callToAction: { title: string; body: string; label: string }
        imageText: { title: string; body: string }
        featuredTitle: string
        countdownTitle: string
      }
      /** Where the section goes, said under the title: `{before}`, `{after}` and `{band}` are names. */
      placement: {
        between: string
        first: string
        last: string
        only: string
        inBand: string
        inBandFirst: string
        beside: string
      }
      /** One line of what a kind is, read beside its wireframe and searched with its name. */
      hints: Record<ComponentKind, string>
      /** A row of banners, by `{count}`: "3 banners lado a lado". */
      bannersAcross: string
      /** The line under a row of banners, by how many it holds. */
      bannersAcrossHints: Record<Exclude<Across, 1>, string>
    }
    /** A showcase's own questions: where its products come from, how many, and in what shape. */
    showcase: {
      sourceLabel: string
      sources: Record<ProductSource, string>
      /** One sentence under the source, saying what it draws. */
      sourceHints: Record<ProductSource, string>
      categoryLabel: string
      categorySearch: string
      categoryNone: string
      picksLabel: string
      picksSearch: string
      picksNone: string
      /** `{name}` is the product's. Each button is named for the product it acts on. */
      pickAdd: string
      pickUp: string
      pickDown: string
      pickRemove: string
      /** A pick whose product is not among the ones the panel loaded — deleted, or past the first hundred. */
      pickUnknown: string
      searchEmpty: string
      optionsLoading: string
      optionsFailed: string
      limitLabel: string
      limitHint: string
    }
    /** A block's slice of its band, named so it cannot be read as the band's own width. */
    spanLabel: string
    spanFull: string
    spanTwoThirds: string
    spanHalf: string
    spanThird: string
    /** The band's width, said beside the block's so the two are never mistaken for each other. */
    spanBandLabel: string
    /** A banner's choice between showing its pictures one at a time or all together. */
    displayLabel: string
    /** "Aparece em", with the two screens a block can show on, and what a row says of one on a single screen. */
    visibleOn: {
      label: string
      desktop: string
      phone: string
      /** Under the field: the last screen cannot be turned off here. */
      hint: string
      onlyDesktop: string
      onlyPhone: string
    }
    /** Each layout's name, as the Layout tab and the bar offer it. */
    displays: Record<ComponentDisplay, string>
    /** A block with no layout chosen whose look no layout repeats: a strip saved before it had a choice. */
    displayAuto: string
    /** A categories block's card: the photo with the name, or the artwork alone. */
    cardStyle: {
      label: string
      photoWithName: string
      photoWithNameHint: string
      artOnly: string
      /** Says the file to make and what a category with no picture does. */
      artOnlyHint: string
    }
    categoriesRailHint: string
    categoriesGridHint: string
    show: string
    hide: string
    /** Said to a screen reader while a banner is being moved. `{name}` and `{position}`. */
    dragStart: string
    dragOver: string
    dragEnd: string
    dragCancel: string
    publish: string
    publishing: string
    /** Shown while the saved draft differs from what the shop serves. */
    unpublished: string
    /** The browser's own leave-confirmation cannot be worded; this is said on screen instead. */
    leaveWarning: string
    previewNotice: string
    /** Said under the colour pickers: there is no ink field, and this is why. */
    colorsHint: string
    saveColors: string
    tabBlocks: string
    tabColors: string
    /** Publicar's dialog: what the draft would serve that the owner may not mean, and a note. */
    publishDialog: {
      /** "Publicar {page}". */
      title: string
      intro: string
      checking: string
      none: string
      /** The check did not answer: the owner may publish without it, or ask again. */
      checkFailed: string
      checkRetry: string
      /** Each problem, with `{block}` and `{band}` for where it is. */
      problems: Record<DesignPublishProblemKind, string>
      note: string
      notePlaceholder: string
      publish: string
      publishAnyway: string
      publishing: string
      cancel: string
    }
    /** A page's versions, in the Páginas tab. */
    history: {
      heading: string
      empty: string
      loadFailed: string
      retry: string
      /** "Versão {number}". */
      version: string
      live: string
      /** "{when} · {author}". */
      by: string
      restore: string
      /** "Restaurar a versão {number}?" */
      restoreTitle: string
      restoreBody: string
      restoreConfirm: string
      cancel: string
      restoring: string
      failed: string
      /** "Versão {number} restaurada…": the draft holds it, and the shop has not changed. */
      restored: string
    }
    tabPages: string
    /** A shop's pages in design mode: the switcher in the bar and the Páginas tab. */
    pages: {
      /** The switcher's name for a screen reader: "Trocar de página — {page}". */
      switchTo: string
      heading: string
      home: string
      status: { DRAFT: string; PUBLISHED: string; ARCHIVED: string }
      /** Beside a landing the shop links to: from its footer, and from a site's menu. */
      inMenu: string
      newLanding: string
      /** "Arquivadas ({count})", collapsed under the rest. */
      archived: string
      /** A row's menu, named for its page: "Ações de {page}". */
      actions: string
      publish: string
      unpublish: string
      archive: string
      restore: string
      settings: string
      view: string
      /** The home's row, which no menu changes: it is the shop's own address. */
      homeHint: string
      empty: string
      /** The bar's button and status on a landing that is not up. */
      publishPage: string
      notPublished: string
      /** Why a row's action failed, said under the list. */
      failed: string
      /** The list itself could not be read, and the way to ask again. */
      loadFailed: string
      retry: string
      /** Why the bar's Publicar did not put the page up, when the API gave no reason of its own. */
      publishFailed: string
      /** The "Nova landing page" and "Configurações da página" dialogs. */
      form: {
        newTitle: string
        newDescription: string
        settingsTitle: string
        settingsDescription: string
        name: string
        namePlaceholder: string
        address: string
        addressChecking: string
        addressAvailable: string
        addressTaken: string
        addressInvalid: string
        template: string
        /**
         * Every model of the API's catalogue, by its id: the API answers ids and these are their words.
         * The dialog draws the four a landing is made from; "servicos-b2b" is a site's home, and the
         * last four are a shop's.
         */
        templates: Record<
          | "servicos-b2b"
          | "lancamento"
          | "promocao-relampago"
          | "colecao"
          | "em-branco"
          | "vitrine-com-capa"
          | "por-categorias"
          | "ofertas"
          | "catalogo-enxuto",
          { title: string; description: string }
        >
        /** Under the templates on a site, which sells no product. */
        siteBlankOnly: string
        product: string
        productPlaceholder: string
        productEmpty: string
        productHint: string
        inMenu: string
        inMenuHint: string
        usesChrome: string
        usesChromeHint: string
        seo: string
        seoHint: string
        seoTitle: string
        seoDescription: string
        seoImage: string
        cancel: string
        create: string
        creating: string
        save: string
        saving: string
      }
    }
    /** The full-screen editor's frame: its bar, its three columns and, on a narrow screen, its drawers. */
    frame: {
      /** "← Painel": back to the shop's home in the panel. */
      back: string
      /** The one page there is until landing pages arrive. */
      homePage: string
      published: string
      viewInShop: string
      /** The buttons that open the two side columns as drawers on a narrow screen. */
      structure: string
      inspector: string
      tabSections: string
      tabTheme: string
      /** The right column while no block is chosen. */
      inspectorEmpty: string
      leaveTitle: string
      leaveBody: string
      leaveStay: string
      leaveGo: string
      /** The bar's status while a change is on its way to the server. */
      saving: string
      /** Another tab wrote to the page since this one read it: the only way on is a reload. */
      conflictTitle: string
      conflictBody: string
      conflictReload: string
      /** A drawer's own close button, where the panel in it has none of its own. */
      close: string
      /** The landmarks' names. */
      barLabel: string
      structureLabel: string
      inspectorLabel: string
      previewLabel: string
    }
    /** The chosen block's panel: Conteúdo, Layout and Estilo, and what each one says of itself. */
    inspector: {
      /** "Editar {name}": the tabs' name for a reader. */
      tabsLabel: string
      content: string
      layout: string
      style: string
      /** Said to a reader beside a tab holding what keeps Salvar off. */
      needsAttention: string
      /** The Layout tab's promise: what changes there shows at once, and waits for Publicar. */
      layoutNote: string
      /** Above a band's style when it holds several blocks. `{count}`. */
      sharedWith: string
      /** The panel's title while a band is chosen on its own. */
      editBand: string
    }
    addBlock: string
    /** Opens the gallery at a band's foot: what puts two blocks side by side. */
    addToBand: string
    /** The "+" between bands and between blocks. `{position}` counts from 1; `{band}` is the band's name. */
    insertBand: string
    insertBlock: string
    /** A block's own button, and its name for a reader: `{name}` is the block beside which it adds. */
    addBeside: string
    addBesideOf: string
    /** Moves a band's only block up, beside the last block of the band above: `{name}` is that block. */
    joinAbove: string
    /** The bar over the chosen block or band in the preview, and what the editor says as it acts. `{name}` is what it acts on. */
    bar: {
      label: string
      moveUp: string
      moveDown: string
      layout: string
      duplicate: string
      hide: string
      /** On something hidden: the same button brings it back. */
      show: string
      delete: string
      /** Said after a move: `{position}` counts from 1. */
      movedTo: string
      /** Said after Ocultar: it leaves the shop on Publicar. */
      hidden: string
      shown: string
      /** Said after Duplicar: the copy waits for Publicar like any other change. */
      duplicated: string
      /** Said when the keys choose something. */
      chosen: string
      /** Said instead of choosing, while the open panel has fields not yet saved. */
      unsaved: string
    }
    /** The bin on a block's row, and the question the dialog asks before it runs. */
    deleteBlock: string
    /** Said in place of the kind when a block has nothing for the shop window to draw. */
    emptyBlock: string
    deleteBlockConfirm: string
    /** A band has no name of its own, so it is called by where it sits. `{position}`. */
    bandNumber: string
    addBand: string
    deleteBand: string
    /** The swatch on a single-block band's card, which opens the band's own sheet. */
    editBand: string
    /** The preview's two widths, and what the pair is called. */
    previewDevice: { label: string; phone: string; desktop: string }
    deleteBandConfirm: string
    /** A band's own colour, and the one value that means "the page's own". */
    bandColour: string
    bandColourNone: string
    bandWidth: string
    bandWidthFull: string
    bandWidthContained: string
    bandWidthHelp: string
    /** Under the strip's band's name: it is drawn above the header, edge to edge, whatever the band says. */
    stripBandHelp: string
    /** What a band is called on the page. Named bands are a site's menu. */
    bandName: string
    bandNamePlaceholder: string
    bandNameHelp: string
    /** The panel that opens on a component's row. */
    editComponent: string
    closeInspector: string
    bodyLabel: string
    bodyPlaceholder: string
    columnsLabel: string
    columnsAuto: string
    done: string
    /** One picture of a banner: `{position}` of `{total}`. */
    slidePosition: string
    addSlide: string
    /** Said beside the add button while a banner has one picture: the second makes a carousel. */
    carouselHint: string
    /** The same hint, for a banner whose pictures share the space. */
    gridHint: string
    /** Under a banner laid out on its first picture alone: the others wait for another layout. */
    firstOnlyHint: string
    /** One promise with no title yet. `{position}`. */
    benefitPosition: string
    addBenefit: string
    benefitIcon: string
    benefitTitle: string
    benefitDetail: string
    /** A button's own words, where a block has one: a call to action's, an image with text's. */
    button: {
      label: string
      placeholder: string
      /** Said while the button leads somewhere and says nothing: Salvar waits for it. */
      labelMissing: string
      /** Said while the button claims a destination it does not name yet. */
      targetMissing: string
    }
    /** When a countdown ends. */
    countdown: {
      ends: string
      help: string
    }
    /** Which product is featured. */
    featured: {
      chosen: string
      none: string
      /** A pick the list does not have: deleted, or past what was loaded. */
      unknown: string
      search: string
    }
    /** An image with text's picture and what it shows. */
    imageText: {
      image: string
      imageHelp: string
      alt: string
      altHelp: string
    }
    /** A FAQ's questions, as its owner writes them. */
    faq: {
      legend: string
      /** One question with no words yet. `{position}`. */
      position: string
      question: string
      answer: string
      add: string
      /** Each button named for its question: "Subir {question}". */
      up: string
      down: string
      remove: string
      /** Said while a question has no answer: Salvar waits for it. */
      answerMissing: string
    }
    /** Where a heading or a paragraph sits. */
    alignLabel: string
    alignLeft: string
    alignCenter: string
    alignRight: string
    /** The strip's colour, and what it is called when it has none of its own. */
    announcementColour: string
    announcementColourNone: string
    /** The fields of a contact form, as its owner declares them. */
    contact: {
      fieldsLabel: string
      /** Said once above the list: the name is not a field, it is always asked. */
      fieldsHelp: string
      /** `{position}`. What a field with no label yet is called. */
      fieldPosition: string
      fieldLabel: string
      fieldType: string
      fieldRequired: string
      fieldOptions: string
      fieldOptionsHelp: string
      addField: string
      removeField: string
      /** Shown while no required e-mail or phone is left: the rule the API enforces. */
      reachBack: string
      types: Record<ContactFieldType, string>
    }
  }
  /** What arrived through a site's contact form, as its owner works through it. */
  /** The panel's customers, as the CRM: who never bought, who buys, and who stopped. */
  customers: {
    title: string
    description: string
    searchLabel: string
    searchPlaceholder: string
    /** The stage tabs: what they filter by, "Todos", and each stage in the plural. */
    stageFilterLabel: string
    all: string
    tabs: { LEAD: string; CUSTOMER: string; INACTIVE: string }
    sortLabel: string
    sorts: { RECENT: string; LAST_ORDER: string; MOST_ORDERS: string; TOP_SPENT: string }
    /** The columns. */
    customer: string
    stage: string
    orders: string
    spent: string
    lastOrder: string
    place: string
    stages: { LEAD: string; CUSTOMER: string; INACTIVE: string }
    /** Beside the Inativo badge: "há {days} dias". */
    inactiveFor: string
    /** Beside an e-mail its owner never confirmed. */
    unverified: string
    /** Beside the stage: another record of the shop may be the same person. */
    possibleDuplicate: string
    /** The accessible name of a row's link: "Abrir a ficha de {name}". */
    open: string
    /** A card's line: "{count} pedidos", its singular, and none. */
    ordersCount: string
    ordersOne: string
    ordersNone: string
    /** A card's line: "Último pedido em {date}". */
    lastOrderOn: string
    /** The button in full, where there is room; its short form in the table's column. */
    whatsapp: string
    whatsappShort: string
    /** The button's accessible name, holding both forms: "Chamar no WhatsApp: {name}". */
    whatsappLabel: string
    /** Why the button is off. */
    whatsappNoPhone: string
    empty: string
    emptyHint: string
    emptySearch: string
    /** A tab with no one in it. */
    emptyStage: string
    range: string
    previous: string
    next: string
    /**
     * The WhatsApp conversation the list opens, from the shop to the customer: a greeting, then one
     * sentence for where they stand. Fixed per stage; the shopkeeper does not edit them.
     */
    message: {
      /** `{name}` is the first name, `{shop}` the shop's. */
      greeting: string
      /** An invitation to the first order. */
      LEAD: string
      CUSTOMER: string
      /** "Faz tempo que você não passa aqui". */
      INACTIVE: string
    }
    /** A customer's record: who they are, their numbers, their orders, and the way to correct them. */
    record: {
      /** The way back to the list. */
      back: string
      /** Under the name: "Na loja desde {date}". */
      since: string
      newOrder: string
      numbers: string
      orders: string
      spent: string
      /** Total spent over the valid orders. */
      averageTicket: string
      firstOrder: string
      lastOrder: string
      daysSince: string
      details: string
      name: string
      email: string
      emailVerified: string
      emailUnverified: string
      /** A customer the shop registered, who has no account and so no e-mail. */
      noEmail: string
      /** Under the e-mail while editing: why it is not a field. */
      emailFixed: string
      phone: string
      noPhone: string
      address: string
      noAddress: string
      cpf: string
      noCpf: string
      birthDate: string
      noBirthDate: string
      edit: string
      save: string
      saving: string
      cancel: string
      saved: string
      history: string
      historyEmpty: string
      historyEmptyHint: string
      /** The accessible name of a history row's link: "Abrir o pedido #{number}". */
      openOrder: string
      /** The shop's other records that may be this person, and the way to make the two one. */
      duplicates: {
        title: string
        lead: string
        /** Why each is listed: the refused phone, or the name. */
        reasons: { PHONE: string; NAME: string }
        /** In place of the e-mail, for a record the shop registered. */
        noAccount: string
        /** The button, and its accessible name: "Juntar com {name}". */
        merge: string
        mergeLabel: string
        /** The dialog's title: "Juntar com {name}?". */
        confirmTitle: string
        /** This record is kept and `{name}`'s goes. */
        confirmHere: string
        /** `{name}` has the account: it is kept, and this record goes. */
        confirmThere: string
        /** What else moves, and that it is for good. */
        confirmFill: string
        confirm: string
        merging: string
        cancel: string
        /** Said on the record kept, once the two are one. */
        merged: string
      }
    }
  }
  /** The panel's orders: the list, and later the order and its form. */
  orders: {
    /** An order's shipping label, bought from the shop's Melhor Envio wallet (BEELINK-187). */
    label: {
      title: string
      /** {carrier} */
      intro: string
      balance: string
      balanceUnknown: string
      volume: string
      volumeHint: string
      weight: string
      length: string
      width: string
      height: string
      invoiceKey: string
      invoiceKeyHint: string
      buy: string
      buying: string
      retry: string
      generate: string
      print: string
      printing: string
      cancel: string
      cancelling: string
      cancelConfirmTitle: string
      cancelConfirmText: string
      cancelConfirm: string
      keep: string
      /** {price} {date} */
      statusInCart: string
      statusPaid: string
      statusGenerated: string
      statusCancelled: string
      protocol: string
      tracking: string
      trackingPending: string
      blockersTitle: string
      blockers: Record<"NOT_CARRIER" | "ORDER_CANCELLED" | "NOT_CONNECTED" | "NO_SENDER_DOCUMENT" | "NO_ORIGIN" | "NO_RECIPIENT_DOCUMENT" | "RECIPIENT_ADDRESS_INCOMPLETE", string>
      openIntegrations: string
      openStore: string
      openWallet: string
      issues: { volume: string; invoiceKey: string }
      errors: {
        /** {balance} {price} */
        LABEL_BALANCE_INSUFFICIENT: string
        /** {reason} */
        LABEL_REFUSED: string
        LABEL_NOT_CANCELLABLE: string
        LABEL_NOT_AVAILABLE: string
        LABEL_INVALID: string
        LABEL_NOT_GENERATED: string
        INTEGRATION_NOT_CONNECTED: string
        INTEGRATION_UNREACHABLE: string
        UNKNOWN: string
      }
    }
    title: string
    description: string
    /** The way to register one, from the list's header and its empty state. */
    newOrder: string
    searchLabel: string
    searchPlaceholder: string
    filterLabel: string
    all: string
    /** The list's second filter, by where the money stands (BEELINK-207). */
    paymentFilterLabel: string
    paymentFilters: Record<"ALL" | "PAID" | "PENDING" | "STRAY" | "REFUNDED", string>
    /** Where an online payment stands, beside the way it is paid in a row of the list. */
    paymentStates: Record<"paid" | "awaiting" | "refunding" | "refunded" | "partlyRefunded", string>
    /** A row's flag: money arrived that the order did not ask for. */
    paymentStray: string
    /** A delivery's total while its fee is not agreed (BEELINK-170): "R$ 239,70 + frete". */
    totalPlusFee: string
    /** An order's discount, a row per part — shared by the shop window and the panel (BEELINK-194). */
    discountRows: {
      promotion: string
      /** `{name}`: the one promotion that took it. */
      promotionNamed: string
      promotions: string
      /** `{code}`. */
      coupon: string
      /** What the shopkeeper typed. */
      manual: string
      /** The customer's credit spent on the order: its own row, after the discounts. */
      cashback: string
      /** A free-delivery coupon's value while the fee is not agreed, in place of an amount. */
      freeDelivery: string
      /** `{name}`, `{value}`: under a line a promotion took something off. */
      linePromotion: string
      /** `{label}`, `{value}`: a row as one line of a message. */
      line: string
    }
    /** Keyed by the wire's status, spelled out: this package imports no contracts. */
    statuses: Record<"RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED", string>
    payments: Record<"MONEY" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD", string>
    fulfillments: Record<"DELIVERY" | "PICKUP", string>
    number: string
    placedAt: string
    customer: string
    items: string
    /** "{count} itens", and its singular. */
    itemsCount: string
    itemsOne: string
    total: string
    payment: string
    status: string
    /** The accessible name of a row's link: "Abrir o pedido #{number}, de {name}". */
    open: string
    empty: string
    emptyHint: string
    emptyFiltered: string
    range: string
    previous: string
    next: string
    /** The new-order form's words. */
    form: {
      title: string
      description: string
      back: string
      customer: string
      customerSearchLabel: string
      customerSearchPlaceholder: string
      customerNone: string
      customerChange: string
      customerCreate: string
      customerName: string
      customerPhone: string
      customerPhoneHint: string
      customerNameInvalid: string
      customerPhoneInvalid: string
      customerAddress: string
      zipCode: string
      street: string
      number: string
      complement: string
      neighborhood: string
      city: string
      state: string
      zipCodeInvalid: string
      stateInvalid: string
      customerSave: string
      customerSaving: string
      customerCancel: string
      customerExists: string
      customerUse: string
      products: string
      productSearchLabel: string
      productSearchPlaceholder: string
      productNone: string
      productBack: string
      productChoose: string
      variantAdd: string
      outOfStock: string
      /** A line past what is left: "Só há {count} em estoque". */
      onlyLeft: string
      linesEmpty: string
      linesTitle: string
      lineAdded: string
      lineRemoved: string
      quantity: string
      decrease: string
      increase: string
      remove: string
      fulfillment: string
      detailsTitle: string
      deliveryFee: string
      payment: string
      discount: string
      note: string
      notePlaceholder: string
      placedAt: string
      summary: string
      subtotal: string
      fee: string
      total: string
      discountTooLarge: string
      totalTooLarge: string
      /** The API could not price the sale: the total on screen is the form's own, without the day's promotions. */
      unpriced: string
      /** `{amount}`: the box that spends the chosen customer's cashback on the sale (BEELINK-244). */
      cashbackUse: string
      /** `{amount}`: the most this sale takes, when it is less than the customer's balance. */
      cashbackCapped: string
      /** The box is ticked and the sale's price with it could not be read: the order waits for it, or for the box. */
      cashbackUnpriced: string
      invalidMoney: string
      missingCustomer: string
      missingItems: string
      /** Said under the lines while one asks for more than the shop has. */
      overStock: string
      missingPayment: string
      placedAtInvalid: string
      /** Before where a delivery goes, in one line: "Entregar em: Av. Paulista, 1000 — …". */
      deliverTo: string
      /** The chosen customer has no street and city, so there is nowhere to deliver. */
      deliveryAddressMissing: string
      save: string
      saving: string
    }
    detail: {
      title: string
      back: string
      placedAt: string
      customer: string
      noPhone: string
      deliverTo: string
      /** A delivery placed before orders kept where they went. */
      deliveryNotRecorded: string
      /** Where the buyer came from (BEELINK-275), on an order placed from the cart. */
      origin: {
        label: string
        /** No campaign and no ad click kept. */
        direct: string
        /** A click on a Meta ad was kept. Never the identifier. */
        metaAd: string
        /** "campanha {name}". */
        campaign: string
        /** "Conteúdo: {value}". */
        content: string
        /** "Termo: {value}". */
        term: string
      }
      /** Who receives it, when not the customer: "Recebe: {name}". */
      recipient: string
      items: string
      subtotal: string
      fee: string
      total: string
      fulfillment: string
      payment: string
      note: string
      history: string
      /** Who brings a delivery and when it should arrive (J7), told on the opened order. */
      deliveryTitle: string
      deliveryKind: string
      deliveryKinds: Record<"OWN" | "CARRIER", string>
      deliveryCarrier: string
      deliveryService: string
      deliveryCode: string
      deliveryLink: string
      deliveryLinkHint: string
      deliveryWindow: string
      deliveryFrom: string
      deliveryUntil: string
      deliverySave: string
      deliveryClear: string
      deliverySaved: string
      deliveryNeeded: string
      actors: Record<"SHOPKEEPER" | "CUSTOMER" | "SYSTEM" | "CARRIER", string>
      /** The order's online payment, as the shop reads it (BEELINK-207). */
      onlinePayment: {
        title: string
        method: string
        /** "{count}" instalments. */
        installments: string
        inFull: string
        amount: string
        status: string
        statuses: Record<"PENDING" | "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED" | "FAILED", string>
        /** What a status means to the shop, under it; the ones that need no more words have none. */
        statusHints: Record<"CONFIRMED" | "RECEIVED" | "OVERDUE" | "CANCELLED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED", string>
        /** Asaas's own word, where it says more than ours. */
        providerStatuses: Record<"AWAITING_RISK_ANALYSIS" | "RECEIVED_IN_CASH" | "REFUND_REQUESTED" | "REFUND_IN_PROGRESS" | "CHARGEBACK_REQUESTED" | "CHARGEBACK_DISPUTE" | "AWAITING_CHARGEBACK_REVERSAL", string>
        paidAt: string
        expiresAt: string
        /** Charged online, and no charge was made yet. */
        none: string
        lastError: string
        strayTitle: string
        strayReasons: Record<"ORDER_CANCELLED" | "ORDER_ALREADY_PAID", string>
        /** "{amount}", "{method}", "{date}". */
        strayLine: string
        strayAction: string
        /** "{amount}": the link to the refund of money the order did not ask for. */
        strayRefund: string
        /** Money given back (BEELINK-208): the rows, the link to the form, and each refund's line. */
        refunded: string
        refunding: string
        refundable: string
        refund: string
        refundsTitle: string
        refundStatuses: Record<"REQUESTED" | "PROCESSING" | "DONE" | "REFUSED" | "DENIED", string>
        refundOrigins: Record<"PANEL" | "CANCELLATION" | "ASAAS", string>
        refundStray: string
        /** Under a refund Asaas has not answered about. */
        refundRequestedHint: string
      }
      /** The refund's own screen (BEELINK-208): how much, why, and what happens next. */
      refund: {
        /** "{number}". */
        title: string
        cancelTitle: string
        strayTitle: string
        back: string
        paid: string
        refunded: string
        refunding: string
        left: string
        amount: string
        /** "{amount}": the most it may be. */
        amountHint: string
        amountRequired: string
        /** "{amount}". */
        amountTooMuch: string
        reason: string
        reasonHint: string
        reasonRequired: string
        pixNote: string
        cardNote: string
        cancelNote: string
        /** "{amount}". */
        submit: string
        submitCancel: string
        submitting: string
        nothing: string
      }
      markAs: Record<"RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED", string>
      statusLabel: string
      moreStatuses: string
      cancel: string
      cancelTitle: string
      cancelBody: string
      cancelKeep: string
      cancelConfirm: string
      cancelled: string
      whatsapp: string
      whatsappGreeting: string
      whatsappLine: string
      whatsappFee: string
      /** A delivery's fee not agreed yet (BEELINK-170): on the order, in its message, and the form that tells it. */
      feeToAgree: string
      /** What the checkout promised the customer (BEELINK-178): the row's label, and its value with {window}. */
      quotedWindow: string
      quotedWindowValue: string
      whatsappFeeToAgree: string
      feeFormTitle: string
      feeFormHint: string
      feeFormLabel: string
      feeFormSave: string
      feeFormSaved: string
      feeFormInvalid: string
      whatsappPickup: string
      whatsappTotal: string
      whatsappPayment: string
      whatsappStatus: string
    }
  }
  /** The panel's reviews (J19): the list, its filters, its actions and the menu's count of new ones. */
  reviews: {
    title: string
    intro: string
    statusLabel: string
    statusAll: string
    statusPublished: string
    statusHidden: string
    ratingLabel: string
    ratingAll: string
    /** The pill says "5★" to the eye, this to a reader; `{count}`. */
    ratingStarOne: string
    ratingStars: string
    /** `{name}`. */
    productChip: string
    clearProduct: string
    /** The chip's name for a product none of the page's reviews names. */
    productUnknown: string
    /** `{name}`. */
    onlyThisProduct: string
    /** `{rating}`. */
    ratedLabel: string
    noComment: string
    /** `{name}`, `{date}`. */
    byOn: string
    hidden: string
    hide: string
    publish: string
    /** `{name}`: which customer's review a button acts on. */
    hideLabel: string
    publishLabel: string
    empty: string
    emptyHint: string
    emptyFiltered: string
    failed: string
    retry: string
    /** `{from}`, `{to}`, `{total}`. */
    range: string
    /** The menu's count; `{count}`. */
    navNewOne: string
    navNew: string
  }
  /** The panel's promotions and coupons (BEELINK-192): what both screens share, then each one's own. */
  discounts: {
    statusLabel: string
    failed: string
    retry: string
    /** `{from}`, `{to}`, `{total}`. */
    range: string
    edit: string
    pause: string
    resume: string
    save: string
    cancel: string
    kindLabel: string
    kindPercent: string
    kindFixed: string
    percentLabel: string
    amountLabel: string
    startsAtLabel: string
    /** Which clock the two fields are read on. */
    startsAtHelp: string
    endsAtLabel: string
    endsAtHelp: string
    /** Who a promotion or a coupon is for (BEELINK-245): the choice's legend, and its two options. */
    audienceLabel: string
    audienceEveryone: string
    audienceFirstPurchase: string
    /** What counts as a first purchase, said under the choice once it is the one made. */
    audienceFirstPurchaseHelp: string
    /** The mark a list's row carries when it is for a first purchase only. */
    firstPurchaseBadge: string
    /** `{from}`, `{to}`. */
    periodFromTo: string
    /** `{from}`. */
    periodFrom: string
    /** A field the screen refuses before sending, each a sentence of its own. */
    issues: {
      required: string
      percent: string
      amount: string
      date: string
      endsBeforeStart: string
      products: string
      categories: string
      code: string
      limit: string
    }
    promotions: {
      title: string
      intro: string
      /** The filter's words, in the plural; and each row's, in the singular. */
      tabs: Record<"ALL" | "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED", string>
      status: Record<"ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED", string>
      create: string
      editTitle: string
      empty: string
      emptyHint: string
      emptyFiltered: string
      nameLabel: string
      namePlaceholder: string
      scopeLabel: string
      scopeCart: string
      scopeProducts: string
      scopeCategories: string
      amountCartHelp: string
      amountUnitHelp: string
      productsLabel: string
      productSearchLabel: string
      productSearchPlaceholder: string
      productNone: string
      productsChosen: string
      productsEmpty: string
      /** Said once the list holds as many as one promotion takes. */
      productsFull: string
      /** `{name}`. */
      productAdd: string
      productRemove: string
      categoriesLabel: string
      categoriesHelp: string
      categoriesEmpty: string
      /** `{discount}`. */
      summaryCart: string
      /** `{discount}`, `{count}`. */
      summaryProductsOne: string
      summaryProducts: string
      summaryCategoriesOne: string
      summaryCategories: string
      /** A promotion every product it named was deleted from; `{discount}`. */
      summaryNothing: string
      /** `{amount}`. */
      perUnit: string
      /** `{name}`: which promotion a button acts on. */
      editLabel: string
      pauseLabel: string
      resumeLabel: string
    }
    /** The first-purchase pop-up's own screen in the panel (BEELINK-306). */
    popup: {
      title: string
      intro: string
      /** The way here from the coupons' and the promotions' lists. */
      open: string
      back: string
      enabled: string
      enabledHelp: string
      image: string
      imageHelp: string
      titleLabel: string
      textLabel: string
      buttonLabel: string
      /** `{placeholder}` — the literal `{beneficio}`. Under the three sentences. */
      copyHelp: string
      /** `{count}`, `{max}`. */
      counter: string
      benefit: string
      benefitAuto: string
      /** `{label}`, `{benefit}` — one promotion or coupon the form may name. */
      benefitPromotion: string
      benefitCoupon: string
      /** The option that stands for a named one no longer in force. */
      benefitGone: string
      benefitHelp: string
      /** `{benefit}`. */
      announcing: string
      announcingNothing: string
      /** When the one named is out of force. */
      announcingGone: string
      /** With no benefit, when a sentence was written by hand: it is shown as written. */
      announcingTyped: string
      trigger: string
      triggerArrival: string
      triggerLeave: string
      triggerLeaveHelp: string
      delay: string
      delayHelp: string
      seconds: string
      where: string
      preview: string
      previewHelp: string
      previewDesktop: string
      previewPhone: string
      previewWidth: string
      save: string
      saving: string
      saved: string
      failed: string
      retry: string
      issues: { title: string; text: string; buttonLabel: string; delay: string; typedDiscount: string }
      errors: { POPUP_SETTINGS_INVALID: string; POPUP_TEXT_PROMISES_NUMBER: string; POPUP_BENEFIT_INVALID: string; UNKNOWN: string }
    }
    coupons: {
      title: string
      intro: string
      tabs: Record<"ALL" | "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED" | "EXHAUSTED", string>
      status: Record<"ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED" | "EXHAUSTED", string>
      create: string
      editTitle: string
      empty: string
      emptyHint: string
      emptyFiltered: string
      codeLabel: string
      codeHelp: string
      kindFreeShipping: string
      freeShipping: string
      minSubtotalLabel: string
      minSubtotalHelp: string
      maxUsesLabel: string
      maxUsesHelp: string
      maxUsesPerCustomerLabel: string
      maxUsesPerCustomerHelp: string
      /** The switch that lets the shop window say the code to a customer it is for. */
      shownInStoreLabel: string
      shownInStoreHelp: string
      /** On the list, beside a coupon the shop window shows. */
      shownBadge: string
      /** `{amount}`. */
      minimum: string
      usesNone: string
      usesOne: string
      /** `{count}`. */
      uses: string
      /** `{used}`, `{max}`. */
      usesOf: string
      viewUses: string
      /** `{code}`. */
      usesTitle: string
      usesIntro: string
      usesEmpty: string
      usesClose: string
      /** `{number}`. */
      useOrder: string
      /** `{name}`, `{date}`. */
      useByOn: string
      /** `{amount}`. */
      useTook: string
      useCancelled: string
      /** `{code}`: which coupon a button acts on. */
      editLabel: string
      pauseLabel: string
      resumeLabel: string
      usesLabel: string
    }
  }
  /** The panel's conversations: the tab, one conversation, and the one inside an order (BEELINK-164). */
  conversations: {
    title: string
    intro: string
    filterOpen: string
    filterUnread: string
    filterAll: string
    filtersLabel: string
    searchLabel: string
    searchPlaceholder: string
    empty: string
    emptyHint: string
    failed: string
    retry: string
    unreadOne: string
    unreadMany: string
    closedTag: string
    youSaid: string
    orderLine: string
    viewOrder: string
    viewCustomer: string
    back: string
    pickOne: string
    older: string
    newer: string
    threadFailed: string
    noneYet: string
    noneClosed: string
    closed: string
    /** The customer deleted their account (BEELINK-152): the order may still be on its way, and no answer reaches them. */
    customerLeft: string
    sent: string
    read: string
    fromCustomer: string
    /** A status notice, as the shop reads what its customer was told (BEELINK-236). */
    notices: { RECEIVED: string; ACCEPTED: string; PREPARING: string; OUT_FOR_DELIVERY: string; DELIVERED: string; PICKED_UP: string; CANCELLED: string; PAYMENT_APPROVED: string; CANCELLED_UNPAID: string; /** "{amount}". */ PAYMENT_REFUNDED: string }
    /** A delivery's notice with the cashback its customer was told they earned: "{notice}", "{amount}". The shop's notices end with no full stop. */
    noticeCashback: string
    fromShop: string
    replyLabel: string
    replyPlaceholder: string
    send: string
    sending: string
    tooLong: string
    refusedClosed: string
    refusedUnknown: string
    orderSection: string
    navUnread: string
    navUnreadOne: string
  }
  /** What the shop sold, read back in groups (BEELINK-275). */
  reports: {
    salesByOrigin: {
      title: string
      description: string
      /** Names the group of period links. */
      periodLabel: string
      /** `{days}`. One period on offer: "30 dias". */
      periodDays: string
      /** `{from}`, `{to}`: the days the numbers are of, as dates. */
      periodRange: string
      /** `{from}`, `{to}`. The table's caption, for a screen reader. */
      caption: string
      columns: { origin: string; orders: string; revenue: string; share: string }
      /** The line of sales the shopkeeper registered in the panel, which have no origin. */
      panel: string
      /** `{count}`, `{total}`. Under a campaign some of whose orders came by a kept Meta ad click. */
      metaAdOrders: string
      total: string
      /** Where a share cannot be said: nothing was sold for money in the period. */
      noShare: string
      empty: {
        title: string
        /** How an origin gets recorded; the example link follows it. */
        text: string
        exampleLabel: string
      }
      notes: {
        title: string
        /** `{link}` is not in it: the example is drawn after the sentence, as text. */
        links: string
        counted: string
        older: string
        metaClicks: string
        meta: string
      }
      failed: string
      retry: string
    }
    /** The shop's funnel (BEELINK-276): four steps the shop window counts, and its orders. */
    funnel: {
      title: string
      description: string
      /** `{from}`, `{to}`. The list's name, for a screen reader. */
      caption: string
      steps: Record<FunnelStepKey, string>
      /** What a step counts, in a few words: events, never people. */
      stepHints: Record<FunnelStepKey, string>
      /** `{count}`: how many of this step for every hundred of the one before. The first step has none. */
      rates: Record<Exclude<FunnelStepKey, "PAGE_VIEW">, string>
      /** `{count}`: how many fewer than the step before. Said only when there are fewer. */
      drop: string
      panelSalesOne: string
      /** `{count}`. */
      panelSalesMany: string
      /** `{day}`. Said when the shop's first counted day falls inside the period. */
      countingSince: string
      empty: { title: string; text: string }
      notes: {
        title: string
        events: string
        above: string
        purchases: string
        anonymous: string
        owner: string
        since: string
        /** `{months}`. */
        retention: string
      }
      failed: string
      retry: string
    }
    /** The page that lists the reports. */
    index: {
      title: string
      description: string
      /** Names the list of reports. */
      listLabel: string
      origins: { title: string; text: string }
      funnel: { title: string; text: string }
    }
  }
  leads: {
    title: string
    description: string
    empty: string
    emptyHint: string
    /** Said instead when a status filter is on, which is a different fact from "nothing yet". */
    emptyFiltered: string
    all: string
    filterLabel: string
    name: string
    contact: string
    received: string
    status: string
    statuses: Record<LeadStatus, string>
    /** `{name}`. The accessible name of the control that opens one lead. */
    open: string
    /** `{name}`. Names a row's status select, which otherwise reads as "combobox". */
    statusOf: string
    answers: string
    noAnswers: string
    email: string
    phone: string
    whatsapp: string
    delete: string
    deleteConfirm: string
    /** "1–20 de 137", for the pager under the table. */
    range: string
    previous: string
    next: string
  }
  banners: {
    title: string
    description: string
    create: string
    edit: string
    empty: string
    emptyHint: string
    titleLabel: string
    titlePlaceholder: string
    subtitleLabel: string
    subtitleHelp: string
    imageLabel: string
    imageHelp: string
    layoutLabel: string
    /** Where on the page the banner lives: the top, or the body. */
    placementLabel: string
    placementHero: string
    placementBody: string
    placementHelp: string
    /** A hero's width. A poster in the body is already inside the page's measure. */
    widthLabel: string
    widthFull: string
    widthContained: string
    widthHelp: string
    layoutFull: string
    layoutHalves: string
    layoutThirds: string
    /** Category, product or an address outside the shop — the three a banner may point at. */
    targetLabel: string
    targetCategory: string
    targetProduct: string
    targetExternal: string
    /** A poster that says something and goes nowhere. */
    targetNone: string
    /** Heads the hero's own pictures on the banners screen. */
    heroHeading: string
    targetNoneHelp: string
    categoryLabel: string
    categoryNone: string
    productLabel: string
    productNone: string
    externalLabel: string
    externalHelp: string
    activeLabel: string
    activeHelp: string
    /** Marks a banner the shopkeeper hid; the landing page shows none of it. */
    hidden: string
    /** Marks one that leaves the shop, since that is not visible from the picture. */
    opensOutside: string
    moveUp: string
    moveDown: string
    save: string
    saving: string
    cancel: string
    delete: string
    deleteConfirm: string
  }
  catalog: {
    /** The description's toolbar. What it writes is Markdown; see blocks/catalog/rich-text.ts. */
    editor: {
      toolbar: string
      bold: string
      italic: string
      bulletList: string
      numberedList: string
    }
    /** A product's photos: dropped or picked, several at once, ordered by the shopkeeper. */
    media: {
      label: string
      drop: string
      hint: string
      help: string
      uploading: string
      cover: string
      /** `{number}` — which photo, because the remove and reorder buttons count them. */
      photo: string
      remove: string
      moveEarlier: string
      /** What a photo is of, when it names no value: every combination. */
      ofEvery: string
      /** `{number}` `{summary}` — the button under a photo that says what it is of, and opens the choice. */
      ofButton: string
      /** `{number}` — the choice's title. */
      ofTitle: string
      ofHint: string
      /** `{option}` — the button that takes one option's values off the photo. */
      ofAnyValue: string
      /** `{number}` — an option not named yet, called by its place. */
      ofUnnamedOption: string
    }
    /** The sections the product form is cut into, in the order they are read. */
    sections: {
      basics: string
      basicsHint: string
      media: string
      organization: string
      organizationHint: string
      pricing: string
      pricingHint: string
      inventory: string
      inventoryHint: string
      shipping: string
      shippingHint: string
      variations: string
      variationsHint: string
      /** Said in the price and stock sections of a product with options, in place of their fields. */
      perCombination: string
    }
    /** The variations editor: options, their values, and a row per combination. */
    variations: {
      addLabel: string
      /** The presets offered as buttons, in the order they are drawn. */
      presetSize: string
      presetColor: string
      presetWeight: string
      presetFlavour: string
      presetOther: string
      /** The name field of an option; `{number}` is its place. */
      optionName: string
      optionNamePlaceholder: string
      /** `{name}`. */
      removeOption: string
      /** `{name}`. */
      removeValue: string
      /** `{name}`. */
      dragValue: string
      /** `{name}`: the swatch picker of one value. */
      valueColor: string
      /** `{name}`: the field that adds a value to that option. */
      newValue: string
      newValuePlaceholder: string
      addValue: string
      empty: string
      limit: string
      /** `{count}`. */
      combinations: string
      /** `{count}`. */
      selected: string
      noneSelected: string
      samePrice: string
      setStock: string
      /** `{count}`. */
      samePriceTitle: string
      /** `{count}`. */
      setStockTitle: string
      apply: string
      cancel: string
      columnCombination: string
      columnPrice: string
      columnStock: string
      columnSku: string
      /** Grams, per combination. */
      columnWeight: string
      columnSelling: string
      selectAll: string
      /** `{label}` is "P · Areia", in every row-level name below. */
      selectRow: string
      priceOf: string
      stockOf: string
      skuOf: string
      weightOf: string
      sellingOf: string
      /** Before the row of values that choose every combination with them. */
      selectByValue: string
      /** `{name}`. */
      selectValue: string
      /** In the stock cell while the product is not counted. */
      notCounted: string
      /** `{name}`. */
      removeOptionTitle: string
      /** `{from}` and `{to}`: the number of combinations before and after. */
      removeOptionBody: string
      removeOptionConfirm: string
      /** `{count}`. */
      tooMany: string
      optionNameRequired: string
      valuesRequired: string
      valueTaken: string
      /** `{label}`. */
      priceRequired: string
    }
    fields: {
      costLabel: string
      costHint: string
      skuLabel: string
      skuHint: string
      barcodeLabel: string
      trackStockLabel: string
      trackStockHint: string
      stockLabel: string
      weightLabel: string
      weightHint: string
      /** In place of the weight field on a product with variations. */
      weightPerCombination: string
      dimensionsLabel: string
      dimensionsHint: string
      lengthLabel: string
      widthLabel: string
      heightLabel: string
      newCategory: string
    }
    products: {
      title: string
      description: string
      create: string
      edit: string
      empty: string
      emptyHint: string
      nameLabel: string
      namePlaceholder: string
      slugLabel: string
      slugHelp: string
      descriptionLabel: string
      /**
       * The price, typed in reais and stored in whole cents. The field says the currency out loud
       * because the number it takes and the number the database keeps are not the same number.
       */
      priceLabel: string
      priceHelp: string
      compareLabel: string
      compareHelp: string
      categoryLabel: string
      categoryNone: string
      /** On sale or still being written — never "available", which reads as a stock question. */
      statusLabel: string
      statusHelp: string
      statusActive: string
      statusDraft: string
      /**
       * Active, but the shelf is empty. A third state and not a second badge, because what a
       * shopkeeper asks of this column is "is it on sale?", and "Ativo" beside a zero answered yes
       * when the truth was no.
       */
      statusSoldOut: string
      /** Under a product's name, for a shop that ships by carrier (BEELINK-184). */
      carrierNoWeight: string
      carrierNoSize: string
      /** Opens the product's own page on the shop window. */
      view: string
      /** Said instead, on a draft: it has no public page to open. */
      viewDraft: string
      /** Made here or bought to resell. Not a manufacturer's name; see the ProductOrigin enum. */
      originLabel: string
      originHelp: string
      originInHouse: string
      originResale: string
      /** Shown where the shopkeeper has not answered, in the form and in the table alike. */
      originUnset: string
      imagesLabel: string
      imagesHelp: string
      imageAdd: string
      imageRemove: string
      save: string
      saving: string
      cancel: string
      /** Beside the save button while an edit is not saved. */
      unsaved: string
      /** Asked when Cancel would throw an edit away. */
      leaveTitle: string
      leaveBody: string
      leaveConfirm: string
      keepEditing: string
      delete: string
      deleteConfirm: string
      uncategorised: string
      /**
       * The table's column headers, and what a cell says when it has nothing to say. They are
       * their own object because a header is not a field label: "Estoque" heads a column of
       * numbers, while the field that sets it is a checkbox called "Controlar estoque".
       */
      /**
       * The toolbar over the table. `any*` are the "no filter" options, named after what they let
       * through rather than "Todos", which reads as a filter that selects everything.
       */
      filters: {
        searchLabel: string
        searchPlaceholder: string
        anyStatus: string
        anyCategory: string
        anyOrigin: string
        anyStock: string
        inStock: string
        outOfStock: string
        /** A product the shop does not count at all — not one with none left. */
        untracked: string
        clear: string
        /** Said in place of the table when a filter matches nothing. */
        noResults: string
        noResultsHint: string
      }
      pager: {
        previous: string
        next: string
        /** "{from}–{to} de {total}" — the range, because the page number is not the question. */
        range: string
      }
      table: {
        code: string
        name: string
        status: string
        stock: string
        category: string
        origin: string
        price: string
        /** Names the column of buttons for a screen reader; the header itself is not drawn. */
        actions: string
        noCode: string
        /** Said where `trackStock` is off — which is not the same as none left. */
        stockUntracked: string
      }
      /** Said when the price typed is not a number, or is zero. */
      priceInvalid: string
      /** Said when the "was" price is not above the price — a discount that is not one. */
      compareInvalid: string
    }

    categories: {
      title: string
      description: string
      /** The button that opens an empty form, and the heading of that form. */
      create: string
      edit: string
      empty: string
      emptyHint: string
      nameLabel: string
      namePlaceholder: string
      slugLabel: string
      /** Shows the whole public URL, so a shopkeeper sees the address before saving it. */
      slugHelp: string
      descriptionLabel: string
      descriptionHelp: string
      imageLabel: string
      bannerLabel: string
      /** Under the banner field: what it is and where it shows. */
      bannerHelp: string
      /** The same, on a subcategory's form: with none of its own it shows its parent's. */
      bannerHelpChild: string
      /** The select that puts a category under another. Two levels, so a child cannot be chosen. */
      parentLabel: string
      parentNone: string
      parentHelp: string
      activeLabel: string
      activeHelp: string
      /** The shape it takes on the landing page. There is no separate banner: the poster is this. */
      showcaseLabel: string
      showcaseHelp: string
      showcaseNone: string
      showcaseFull: string
      showcaseHalves: string
      showcaseThirds: string
      save: string
      cancel: string
      delete: string
      /** Said before a delete, because the products survive it and the subcategories do not. */
      deleteConfirm: string
      /** "{count} produtos" — the same sentence the window says, on the row of a list. */
      productCount: string
      productCountOne: string
      /** Marks a row the shopkeeper switched off; the window shows none of it. */
      hidden: string
      subcategoryOf: string
      saved: string
      removed: string
    }
  }

  /**
   * The admin chrome: the yellow bar across the top and the rail down the side.
   *
   * `searchShortcut` ships as two finished strings rather than a symbol the block picks apart,
   * because ⌘ on Windows is simply wrong and a dictionary cannot hold a function to choose. The
   * machine-readable form is `aria-keyshortcuts`, which is ARIA token syntax and never translated.
   */
  /** Sentences more than one family of blocks needs. */
  /** Bee-link's terms of use and privacy policy (BEELINK-171): their pages, and where accepting them is said. */
  legal: {
    terms: string
    privacy: string
    /** Beside "Criar conta": creating the account is accepting. {terms} and {privacy} are links. */
    signUpNotice: string
    /** Beside "Continuar com Google", which may open an account with no form. */
    googleNotice: string
    /** Beside setting a password from an e-mailed link: the first screen of an imported account, or its owner's. */
    resetNotice: string
    /** The two links side by side, where nothing is being accepted. */
    links: string
    footerTitle: string
  }
  shared: {
    confirmDeleteTitle: string
    delete: string
    deleting: string
    cancel: string
  }
  shell: {
    brand: string
    menuOpen: string
    navLabel: string
    /** The desktop control that narrows the rail to icons, and the one that widens it back. */
    railCollapse: string
    railExpand: string
    searchPlaceholder: string
    searchLabel: string
    searchShortcut: string
    searchShortcutApple: string
    notifications: string
    /** `{count}` — how many are unread. */
    notificationsUnread: string
    notificationsUnreadOne: string
    /** The bell's menu and the toast that tells of what came in (BEELINK-163). */
    notificationsTitle: string
    notificationsEmpty: string
    notificationsSeeOrders: string
    notificationNewOrder: string
    notificationNewMessage: string
    /** An order charged online was paid (BEELINK-207): the toast and the bell's row. `{number}`. */
    notificationOrderPaid: string
    /** A toast: money arrived that the order did not ask for (BEELINK-206). `{number}`. */
    notificationStrayCancelled: string
    notificationStrayDuplicate: string
    notificationOrderDetail: string
    notificationMessageDetail: string
    notificationOpen: string
    storeMenu: string
    yourStores: string
    noStore: string
    createStore: string
    language: string
    signOut: string
  }
  store: {
    /** Keyed by the union, so adding a selling mode is a compile error in every dictionary. */
    typeLabels: Record<StoreType, string>
    card: {
      /**
       * Entering the shop, not configuring it. It used to read "Gerenciar" and point at the
       * settings page — which made the front door of a shop the one screen inside it that is about
       * paperwork rather than about the shop.
       */
      manage: string
      loading: string
      viewStorefront: string
      logoAlt: string
    }
    empty: {
      title: string
      description: string
      action: string
    }
    create: {
      title: string
      description: string
      tabIdentity: string
      tabAddress: string
      tabSocial: string
      tabAppearance: string
      /** Read only by a screen reader: a coloured dot alone is not a verdict. */
      tabHasError: string
      next: string
      back: string
      /**
       * "Passo {current} de {total}". Filled with `format()`, never a function — see the note on
       * that helper. A dictionary is handed to a Client Component as a prop and React serialises
       * every prop, so one function anywhere in it fails the whole tree.
       */
      stepProgress: string
      /** Read only by a screen reader, after a step that is already filled in. */
      stepDone: string
      submit: string
      submitting: string
      /** The home a new shop opens with: its default page, or a model of the catalogue. Shops only. */
      openingPage: {
        heading: string
        /** What happens when nothing is picked. */
        hint: string
        /** What opens the choices, which start folded away. */
        choose: string
        /** The radio group's name. */
        legend: string
        defaultTitle: string
        defaultDescription: string
        /** Under the choices: a shop with no product opens a model nearly bare, and how it fills in. */
        emptyShopNote: string
      }
    }
    image: {
      /**
       * The call to action inside the drop area, and the file input's accessible name — the same
       * string on purpose. A control should be called what it is seen to say (WCAG 2.5.3).
       */
      dropCta: string
      /** Replaces the call to action while a file is held over the area. */
      dropActive: string
      /**
       * "Formatos aceitos: JPEG, GIF ou PNG de até 2 MB." Composed from what the field actually
       * enforces, so the promise and the refusal cannot disagree. The list arrives unjoined and
       * the size in megabytes: which connector and which decimal mark to use is this file's call.
       */
      /** `{formats}` and `{size}`, both already spelled for the locale by the field. */
      specFormats: string
      /** "Dimensão recomendada: 1600 x 838 pixels." Rendered only when a size is recommended. */
      /** `{width}` and `{height}`, in pixels. */
      specDimensions: string
      /**
       * The block's own verdict on a file it refused to send anywhere. Not an errorCode — nothing
       * was asked of the API, so there is no code to translate (rule 5 stands).
       */
      /** `{size}`, in megabytes. */
      tooLarge: string
      /** `{formats}`. */
      wrongFormat: string
      uploading: string
      replace: string
      clear: string
    }
    settings: {
      title: string
      description: string
      tabIdentity: string
      tabAddress: string
      tabSocial: string
      tabPayment: string
      tabCustomers: string
      save: string
      saving: string
      loading: string
    }
    identity: {
      legend: string
      /** What is being made — a shop or a site — chosen once, at creation. */
      typeLabel: string
      typeShopHint: string
      typeSiteHint: string
      nameLabel: string
      namePlaceholder: string
      slugLabel: string
      slugHint: string
      slugEditableHint: string
      descriptionLabel: string
      descriptionPlaceholder: string
      descriptionHint: string
      categoryLabel: string
      categoryPlaceholder: string
      categoryNone: string
      logoLabel: string
      logoPlaceholder: string
      logoHint: string
      logoAlt: string
    }
    address: {
      legend: string
      hint: string
      zipCodeLabel: string
      zipCodePlaceholder: string
      /** Shown inside the suggestion list while a search is in flight. */
      searching: string
      noSuggestions: string
      zipCodeHint: string
      /** Read by a screen reader in place of the map, which carries no information of its own. */
      mapAlt: string
      lookup: string
      lookingUp: string
      streetLabel: string
      streetPlaceholder: string
      numberLabel: string
      numberPlaceholder: string
      complementLabel: string
      complementPlaceholder: string
      neighborhoodLabel: string
      neighborhoodPlaceholder: string
      cityLabel: string
      cityPlaceholder: string
      stateLabel: string
      statePlaceholder: string
    }
    social: {
      legend: string
      hint: string
      whatsappLabel: string
      whatsappPlaceholder: string
      whatsappHint: string
      instagramLabel: string
      /** One placeholder for every handle field: the prefix beside it says which network it is. */
      handlePlaceholder: string
      tiktokLabel: string
      spotifyLabel: string
      spotifyPlaceholder: string
      youtubeLabel: string
    }
    appearance: {
      layoutLegend: string
      layoutDefault: string
      layoutDefaultHint: string
      layoutBanner: string
      layoutBannerHint: string
      bannerImageLabel: string
      bannerImagePlaceholder: string
      bannerImageHint: string
      bannerAlt: string
      cardLayoutLegend: string
      cardLayoutGrid: string
      cardLayoutGridHint: string
      cardLayoutHorizontal: string
      cardLayoutHorizontalHint: string
      colorsLegend: string
      colorsHint: string
      presetsLabel: string
      colorPickerSuffix: string
      backgroundLabel: string
      primaryLabel: string
      /** The foot. There is no ink label: the ink is derived from what it sits on. */
      footerLabel: string
      headerLabel: string
      previewLabel: string
      previewSample: string
      previewAction: string
    }
    customers: {
      legend: string
      inactiveAfterDays: string
      days: string
      hint: string
    }
    payment: {
      legend: string
      hint: string
      money: string
      moneyHint: string
      pix: string
      pixHint: string
      creditCard: string
      creditCardHint: string
      debitCard: string
      debitCardHint: string
    }
  }
  /**
   * Beelink's own landing page, at the site's root (BEELINK-256). A heading drawn in two weights
   * comes as two strings — the light line and the strong one — so the block never splits a sentence.
   */
  landing: {
    brand: string
    /** The logo's link, for a reader. */
    homeLabel: string
    /** Around the signed-out forms: the way back to the landing, and the brand's photographs beside them — the carousel's name, and each dot's, `{current}` of `{total}`. */
    auth: { back: string; label: string; position: string }
    nav: { label: string; solutions: string; ecosystem: string; how: string; couriers: string; faq: string }
    /** Names the button that opens the links on a narrow screen. */
    menu: string
    signIn: string
    createStore: string
    hero: { titleLight: string; titleStrong: string; lead: string; start: string; solutions: string; tagline: string }
    /** The five parts of the ecosystem, as the hero's hub and the hexagons both name them. `label` is the hexagon's, in the brand's own capitals. */
    products: Record<LandingProductValue, { name: string; label: string; text: string }>
    banners: {
      /** Names the row of banners for a reader. */
      label: string
      titleStrong: string
      titleLight: string
      previous: string
      next: string
      /** `{current}`, `{total}`: which banner is in view. */
      position: string
      store: { tag: string; title: string; text: string; points: readonly [string, string, string]; example: string }
      /** The middle banner: the panel, in words and on a laptop — `alt` reads the photograph out. */
      panel: { tag: string; title: string; text: string; alt: string }
      shipping: { tag: string; title: string; text: string; points: readonly [string, string, string]; cta: string }
    }
    ecosystem: { titleLight: string; titleStrong: string; text: string; kicker: string; kickerText: string }
    steps: { titleLight: string; titleStrong: string; lead: string; items: readonly [LandingStep, LandingStep, LandingStep] }
    couriers: {
      tag: string
      titleLight: string
      titleStrong: string
      lead: string
      perks: readonly [LandingStep, LandingStep, LandingStep, LandingStep]
      flowTitle: string
      flow: readonly [string, string, string, string]
      form: {
        title: string
        lead: string
        name: string
        namePlaceholder: string
        whatsapp: string
        whatsappPlaceholder: string
        city: string
        cityPlaceholder: string
        vehicle: string
        vehicles: Record<LandingVehicleValue, string>
        /** `{terms}` and `{privacy}` are the two links. */
        consent: string
        terms: string
        privacy: string
        submit: string
        nameRequired: string
        whatsappInvalid: string
        cityRequired: string
        consentRequired: string
        /** Said once the form is valid: the sign-up is not open, and nothing left the browser. */
        notOpen: string
      }
    }
    faq: {
      titleLight: string
      titleStrong: string
      lead: string
      shopkeeperTag: string
      courierTag: string
      shopkeeper: readonly LandingQuestion[]
      courier: readonly LandingQuestion[]
    }
    posters: { titleLight: string; titleStrong: string; busStopAlt: string; wallAlt: string }
    cta: { titleLight: string; titleStrong: string; courier: string }
    footer: {
      tagline: string
      solutions: string
      couriers: string
      courierSignUp: string
      company: string
      terms: string
      privacy: string
      /** `{year}`. */
      rights: string
    }
  }
  /**
   * The shop's cashback in the panel (BEELINK-242): its rules, what it owes, a customer's credit and
   * its statement, the shopkeeper's adjustment and an order's credit. Amounts arrive formatted.
   */
  cashback: {
    title: string
    intro: string
    owed: {
      title: string
      available: string
      availableHelp: string
      pending: string
      pendingHelp: string
      /** `{days}`. */
      expiringSoon: string
    }
    settings: {
      title: string
      enabled: string
      enabledHelp: string
      rate: string
      rateHelp: string
      validity: string
      validityNone: string
      validityDays: string
      /** The unit after the days field. */
      days: string
      minimum: string
      minimumHelp: string
      maxRedeem: string
      maxRedeemHelp: string
      /** `{order}`, `{earned}`. */
      example: string
      /** Appended to the example: `{days}`. */
      exampleValidity: string
      exampleOff: string
      /** The switch is on and the rate does not hold yet. */
      exampleRateMissing: string
      save: string
      saving: string
      saved: string
    }
    /** What the form refuses before it asks, by field. */
    issues: { rate: string; validityDays: string; minimum: string; maxRedeem: string; amount: string; reason: string }
    /** The API's refusals, by its codes. */
    errors: { CASHBACK_SETTINGS_INVALID: string; CASHBACK_ADJUSTMENT_INVALID: string; CASHBACK_BALANCE_INSUFFICIENT: string; CASHBACK_BALANCE_TOO_LARGE: string; CUSTOMER_NOT_FOUND: string; UNKNOWN: string }
    failed: string
    retry: string
    customer: {
      title: string
      balance: string
      pending: string
      /** `{amount}`, `{date}`. */
      nextExpiry: string
      noExpiry: string
      statement: string
      empty: string
      /** `{number}`. */
      order: string
      adjust: string
    }
    entryKinds: { EARN: string; REDEEM: string; REVERSAL: string; EXPIRE: string; ADJUST: string; FORFEIT: string }
    adjust: {
      title: string
      direction: string
      give: string
      take: string
      amount: string
      reason: string
      reasonPlaceholder: string
      submit: string
      submitting: string
      cancel: string
    }
    order: {
      title: string
      /** `{rate}`. */
      earned: string
      statuses: { PENDING: string; AVAILABLE: string; VOIDED: string; EXPIRED: string }
      /** `{date}`. */
      availableUntil: string
      /** `{amount}`: what is left of a usable credit the customer spent part of. */
      left: string
      /** A usable credit the customer spent all of. */
      spent: string
      /** `{amount}`: what the customer had spent of it when the order was undone. */
      unrecovered: string
    }
  }
  /** The panel's Integrations (BEELINK-183): the shop's own accounts elsewhere — Melhor Envio now. */
  /** The store settings' Delivery tab (BEELINK-177): how the shop gets an order to its customer. */
  delivery: {
    tab: string
    intro: string
    on: string
    off: string
    pickup: {
      title: string
      description: string
      /** {address} */
      address: string
      noAddress: string
    }
    own: {
      title: string
      description: string
      noBands: string
      straightLine: string
      noPoint: string
      mapLabel: string
      freeAbove: string
      freeAboveHelp: string
    }
    bands: {
      legend: string
      upTo: string
      fee: string
      windowFrom: string
      windowTo: string
      add: string
      /** {index} */
      remove: string
      /** {max} */
      max: string
    }
    carriers: {
      title: string
      description: string
      unavailable: string
      disconnected: string
      connect: string
      /** {name} */
      connected: string
      needsReconnect: string
      reconnect: string
      manage: string
      sandbox: string
    }
    save: string
    saving: string
    saved: string
    loading: string
    failed: string
    retry: string
    /** {distance} {fee} {from} {to} */
    preview: string
    free: string
    issues: {
      /** {index} */
      band: string
      /** {index} {previous} */
      order: string
      /** {index} */
      window: string
      /** {index} */
      range: string
      freeAbove: string
    }
    errors: {
      DELIVERY_SETTINGS_INVALID: string
      UNKNOWN: string
    }
  }
  integrations: {
    title: string
    intro: string
    failed: string
    retry: string
    /** The page's cards, one per third party: what every card says whoever it is of. */
    cards: {
      /** The way in, short: the card's own title says whose. Read out as the provider's `connect`. */
      connect: string
      configure: string
      /** {name} */
      configureLabel: string
      reconnect: string
      /** {name} */
      reconnectLabel: string
      /** {name} */
      account: string
      /** A connection whose account the third party has not approved (BEELINK-278): the badge, and what it means for the shop. */
      unapprovedBadge: string
      unapprovedCard: string
      /** This card's connection could not be read; the others stand. */
      failed: string
      /** {name} */
      retryLabel: string
    }
    /**
     * What is on its way and cannot be connected yet: announced among the cards, with nothing to press.
     * No price is said here — a figure in the panel is a commitment.
     */
    upcoming: {
      badge: string
      /** In the place a card's action would take. */
      note: string
      beeflow: {
        title: string
        summary: string
        /**
         * The banner on the panel's home, which leads to this page. `alt` says what the artwork shows,
         * its price included: the figure is drawn in the art, and whoever cannot see it is owed the same.
         */
        banner: { alt: string; link: string }
      }
    }
    /** What came of a connection, on the way back from the third party. */
    result: {
      connected: string
      /** By the code the way back carries; `UNKNOWN` for any other. */
      errors: Record<"INTEGRATION_CANCELLED" | "INTEGRATION_STATE_INVALID" | "INTEGRATION_EXCHANGE_FAILED" | "INTEGRATION_UNREACHABLE" | "INTEGRATION_UNAVAILABLE" | "AUTH_UNAUTHENTICATED" | "UNKNOWN", string>
    }
    melhorEnvio: IntegrationProviderMessages & {
      reconnect: string
      needsReconnect: string
      account: string
      balance: string
      balanceHint: string
      balanceFailed: string
      disconnect: string
      disconnectTitle: string
      disconnectBody: string
      disconnectConfirm: string
      disconnectCancel: string
      disconnectFailed: string
    }
    asaas: IntegrationProviderMessages & {
      /** Said in the card itself: on a phone the badge's hint cannot be hovered. */
      sandboxNote: string
      keyLabel: string
      keyPlaceholder: string
      /** Where a key is created at Asaas, and what bee-link does with it. */
      keyHint: string
      showKey: string
      hideKey: string
      connectSubmit: string
      connecting: string
      noAccount: string
      signUp: string
      /** Read out after a link that opens another tab. */
      newTab: string
      needsReconnect: string
      reconnectSubmit: string
      account: string
      /** The shop's payment notices: the webhook at its account. */
      webhook: string
      webhookStates: Record<"REGISTERED" | "SKIPPED" | "PAUSED" | "ERROR", string>
      webhookHints: Record<"REGISTERED" | "SKIPPED" | "PAUSED" | "ERROR", string>
      replaceKey: string
      replaceLabel: string
      replaceSubmit: string
      replaceCancel: string
      /** Over the page once a key was taken, there and then. */
      connectedNotice: string
      disconnect: string
      disconnectTitle: string
      disconnectBody: string
      disconnectConfirm: string
      disconnectCancel: string
      disconnectFailed: string
      /** By the API's code; `UNKNOWN` for any other. */
      errors: Record<"INTEGRATION_KEY_INVALID" | "INTEGRATION_UNREACHABLE" | "RATE_LIMITED" | "UNKNOWN", string>
      /** A key of the other environment, by the one this deployment takes. */
      wrongEnvironment: Record<"SANDBOX" | "PRODUCTION", string>
      /** An account Asaas has not approved (BEELINK-278): connected, and charged nothing until it is. */
      approval: {
        badge: Record<"PENDING" | "AWAITING_APPROVAL" | "REJECTED", string>
        title: Record<"PENDING" | "AWAITING_APPROVAL" | "REJECTED", string>
        /** What the shopkeeper does about it, by where the account stands. */
        body: Record<"PENDING" | "AWAITING_APPROVAL" | "REJECTED", string>
        /** What it means for the shop, whichever the standing: nothing paid on the site, and selling as before. */
        meanwhile: string
        recheck: string
        rechecking: string
        /** {when} */
        checkedAt: string
        /** Asked again, and Asaas said the same. */
        still: string
        /** Over the page once Asaas was asked again and said approved. */
        approvedNotice: string
        /** By the API's code; `UNKNOWN` for any other. */
        recheckErrors: Record<"INTEGRATION_UNREACHABLE" | "RATE_LIMITED" | "UNKNOWN", string>
      }
    }
    /**
     * The shop's Meta Pixel (BEELINK-270): named by its ID, and by nothing else. No sentence here says
     * that anything is being sent — what the shop window sends, and when, is said by what sends it.
     */
    metaPixel: IntegrationCardMessages & {
      idLabel: string
      idPlaceholder: string
      /** What an ID is, and that a pasted snippet is not one. */
      idHint: string
      connectSubmit: string
      connecting: string
      /** When the ID in hand was saved. */
      savedAt: string
      replaceId: string
      replaceLabel: string
      replaceSubmit: string
      replaceCancel: string
      /** Over the page once an ID was saved, there and then. */
      connectedNotice: string
      disconnect: string
      disconnectTitle: string
      disconnectBody: string
      disconnectConfirm: string
      disconnectCancel: string
      disconnectFailed: string
      /** By the API's code; `UNKNOWN` for any other. The first is also what the form says of an ID it would not send. */
      errors: Record<"META_PIXEL_ID_INVALID" | "UNKNOWN", string>
      /** The way from this page to the report of sales by origin (BEELINK-275), which needs no pixel. */
      salesByOrigin: { title: string; text: string; link: string }
      /** Where the ID is copied from at Meta, and what stays there. */
      guide: {
        title: string
        steps: Record<"open" | "sources" | "pick" | "copy", string>
        openLink: string
        /** Read out after a link that opens another tab. */
        newTab: string
        notesTitle: string
        /**
         * The domain needs no verifying; reports and ads stay at Meta; nothing checks the ID against
         * Meta; and a visitor is asked first, the pixel counting only for one who accepts (BEELINK-271).
         */
        notes: Record<"domain" | "reports" | "unchecked" | "consent" | "events", string>
      }
    }
    /**
     * The shop's Google Analytics (BEELINK-302): named by its GA4 measurement ID, and by nothing else.
     * No sentence here says that anything is being sent — what the shop window sends, and when, is
     * said by what sends it.
     */
    googleAnalytics: IntegrationCardMessages & {
      idLabel: string
      idPlaceholder: string
      /** What an ID is, what Google calls it, and that a pasted tag is not one. */
      idHint: string
      connectSubmit: string
      connecting: string
      /** When the ID in hand was saved. */
      savedAt: string
      replaceId: string
      replaceLabel: string
      replaceSubmit: string
      replaceCancel: string
      /** Over the page once an ID was saved, there and then. */
      connectedNotice: string
      disconnect: string
      disconnectTitle: string
      disconnectBody: string
      disconnectConfirm: string
      disconnectCancel: string
      disconnectFailed: string
      /** By the API's code; `UNKNOWN` for any other. The first is also what the form says of an ID it would not send. */
      errors: Record<"GOOGLE_ANALYTICS_ID_INVALID" | "UNKNOWN", string>
      /** Where the ID is copied from at Google Analytics. */
      guide: {
        title: string
        steps: Record<"open" | "admin" | "streams" | "pick" | "copy", string>
        openLink: string
        /** Read out after a link that opens another tab. */
        newTab: string
        notesTitle: string
        /** Only a GA4 ID serves, and nothing checks the ID against Google. */
        notes: Record<"ga4Only" | "unchecked", string>
      }
      /** The reports stay at Google Analytics: the panel repeats none of its numbers, and leads there. */
      reports: { title: string; text: string; link: string; newTab: string }
    }
    /**
     * The purchases told to Meta from the server (BEELINK-274): the Conversions API token, where
     * it is generated, and the test event. Apart from `metaPixel`, whose sentences are held to
     * their own rule about what is sent; these are held to theirs (`meta-pixel-screen.test.tsx`).
     */
    metaConversions: {
      title: string
      lead: string
      badges: Record<"NONE" | "SET" | "REJECTED" | "UNAVAILABLE", string>
      /** This deployment has nowhere to seal a token. */
      unavailable: string
      /** A token is saved, and is not shown again. */
      tokenSet: string
      /** Meta refused the token, or the pixel under it: what stopped, and what mends it. */
      refusals: Record<"TOKEN_REJECTED" | "PIXEL_NOT_FOUND", string>
      tokenLabel: string
      tokenPlaceholder: string
      tokenHint: string
      showToken: string
      hideToken: string
      tokenSubmit: string
      tokenSaving: string
      replaceToken: string
      replaceLabel: string
      replaceSubmit: string
      replaceCancel: string
      /** Over the page once a token was saved, there and then. */
      savedNotice: string
      remove: string
      removeTitle: string
      removeBody: string
      removeConfirm: string
      removeCancel: string
      removeFailed: string
      /** By the API's code; `UNKNOWN` for any other. The first is also what the form says of a token it would not send. */
      errors: Record<"META_PIXEL_TOKEN_INVALID" | "INTEGRATION_UNAVAILABLE" | "INTEGRATION_NOT_CONNECTED" | "UNKNOWN", string>
      /** Where the token is generated at Meta. */
      guide: {
        title: string
        steps: Record<"open" | "pick" | "settings" | "generate" | "paste", string>
      }
      /** One synthetic event, sent with the Events Manager's test code, and what Meta said of it. */
      test: {
        title: string
        lead: string
        codeLabel: string
        codePlaceholder: string
        codeHint: string
        submit: string
        sending: string
        outcomes: Record<"ACCEPTED" | "TOKEN_REJECTED" | "PIXEL_NOT_FOUND" | "EVENT_REFUSED" | "UNREACHABLE", string>
        /** Before Meta's own words for a refusal. */
        detailLabel: string
        /** By the API's code; the first is also what the form says of a code it would not send. */
        errors: Record<"META_PIXEL_TEST_CODE_INVALID" | "RATE_LIMITED" | "INTEGRATION_NOT_CONNECTED" | "INTEGRATION_NEEDS_RECONNECT" | "INTEGRATION_UNAVAILABLE" | "UNKNOWN", string>
      }
    }
    /** How the shop is paid once its Asaas is connected (BEELINK-203). */
    payments: {
      title: string
      intro: string
      pix: string
      pixHint: string
      card: string
      cardHint: string
      installments: string
      installmentsHint: string
      /** One instalment: the card in full. */
      installmentsOnce: string
      /** {count} */
      installmentsUpTo: string
      offline: string
      offlineHint: string
      save: string
      saving: string
      saved: string
      /** Read out, never shown, while the choices are read. */
      loading: string
      failed: string
      issues: { none: string }
      errors: Record<"ASAAS_SETTINGS_INVALID" | "UNKNOWN", string>
    }
    shipping: {
      title: string
      services: string
      servicesHint: string
      servicesFailed: string
      handlingDays: string
      handlingDaysHint: string
      package: string
      packageHint: string
      weight: string
      length: string
      width: string
      height: string
      save: string
      saving: string
      saved: string
      /** Who sends the labels (BEELINK-187). */
      sender: string
      senderHint: string
      senderDocument: string
      senderStateRegister: string
      senderStateRegisterHint: string
      issues: { handlingDays: string; package: string; packageRange: string; senderDocument: string }
      errors: Record<"MELHOR_ENVIO_SETTINGS_INVALID" | "UNKNOWN", string>
    }
  }
}

/**
 * What every integration says of itself wherever the Integrations pages show it. Each one's slice
 * holds at least this, so the list's cards read any of them alike.
 */
export interface IntegrationCardMessages {
  title: string
  /** What connecting gives the shop, in a line or two: the list's card. */
  summary: string
  /** The same at length, on the integration's own page. */
  lead: string
  /** The way in, naming the provider: several cards share the list. */
  connect: string
  connected: string
  disconnectedBadge: string
}

/**
 * What an integration that is an account at a third party says besides: a deployment may not be set
 * up for it, it may run against a sandbox, and the third party may stop accepting the connection.
 * The Meta Pixel is none of that — an ID is saved or it is not — and says none of it.
 */
export interface IntegrationProviderMessages extends IntegrationCardMessages {
  unavailable: string
  needsReconnectBadge: string
  /** The third party stopped accepting the connection, as the list's card warns of it: its own page says how to mend it. */
  needsReconnectCard: string
  sandbox: string
  sandboxHint: string
}

/** The two the product ships. `pt-BR` is the default; `en` is what the repository itself speaks. */
export type Locale = "pt-BR" | "en"

/** The five parts of Beelink's ecosystem, as the landing names them. */
export type LandingProductValue = "store" | "chat" | "checkout" | "shipping" | "marketing"

/** How a courier delivers, as the landing's form offers it. */
export type LandingVehicleValue = "MOTORCYCLE" | "BICYCLE" | "CAR" | "VAN"

export interface LandingStep {
  title: string
  text: string
}

export interface LandingQuestion {
  question: string
  answer: string
}

/** The steps of a shop's funnel, restated here: this package declares no dependency on the contracts. Mirrors `FunnelStep`. */
export type FunnelStepKey = "PAGE_VIEW" | "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_START" | "PURCHASE"
