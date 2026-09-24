import type { BlockGroup, ComponentKind, ContactFieldType, ProductSource } from "../blocks/design/design-types"
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
    valueSoldOut: string
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
    /** The header's basket, which now has an address of its own. */
    cart: string
    /** `{count}` — the basket's accessible name, which says how many lines it holds. */
    cartWithCount: string
    /** The line over "Minha conta" in the header, for a visitor not signed in. */
    accountGreeting: string
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
    sortNewest: string
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
      /** Said after a link that leaves the arrangement's draft where it is. */
      opensInNewTab: string
    }
    /** The gallery a block is added from. */
    gallery: {
      title: string
      description: string
      searchLabel: string
      searchPlaceholder: string
      /** Said when the search matches nothing. */
      empty: string
      groups: Record<BlockGroup, string>
      /** One line of what a kind is, read beside its wireframe and searched with its name. */
      hints: Record<ComponentKind, string>
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
    displayCarousel: string
    displayGrid: string
    displayRail: string
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
    /** Shown while there is something arranged and not yet published. */
    unpublished: string
    discard: string
    /** The browser's own leave-confirmation cannot be worded; this is said on screen instead. */
    leaveWarning: string
    previewNotice: string
    /** Said under the colour pickers: there is no ink field, and this is why. */
    colorsHint: string
    saveColors: string
    tabBlocks: string
    tabColors: string
    addBlock: string
    /** Opens the gallery at a band's foot: what puts two blocks side by side. */
    addToBand: string
    /** The "+" between bands and between blocks. `{position}` counts from 1; `{band}` is the band's name. */
    insertBand: string
    insertBlock: string
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
    /** One promise with no title yet. `{position}`. */
    benefitPosition: string
    addBenefit: string
    benefitIcon: string
    benefitTitle: string
    benefitDetail: string
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
   * The admin chrome: the dark bar across the top and the rail down the side.
   *
   * `searchShortcut` ships as two finished strings rather than a symbol the block picks apart,
   * because ⌘ on Windows is simply wrong and a dictionary cannot hold a function to choose. The
   * machine-readable form is `aria-keyshortcuts`, which is ARIA token syntax and never translated.
   */
  /** Sentences more than one family of blocks needs. */
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
      tabAppearance: string
      tabPayment: string
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
}

/** The two the product ships. `pt-BR` is the default; `en` is what the repository itself speaks. */
export type Locale = "pt-BR" | "en"
