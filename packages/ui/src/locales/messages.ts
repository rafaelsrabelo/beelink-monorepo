import type { SectionKind } from "../blocks/design/design-types"
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
    /** Names a gallery thumbnail, which is otherwise a button a screen reader calls "button". */
    photoOf: string
    /** The header's basket, which now has an address of its own. */
    cart: string
    /** The basket's own page. Empty until there is anything that can put a line in it. */
    cartEmpty: string
    cartEmptyHint: string
    account: string
    noPhoto: string
    search: string
    searchAction: string
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
      moneyDetail: string
      pix: string
      pixDetail: string
      creditCard: string
      creditCardDetail: string
      debitCard: string
      debitCardDetail: string
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
    /** What a block is called in the editor when the shopkeeper has not titled it. */
    kinds: Record<SectionKind, string>
    productListHint: string
    sizeLabel: string
    sizeFull: string
    sizeHalves: string
    sizeThirds: string
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
      categoriesLabel: string
      categoriesHint: string
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
