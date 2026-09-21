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
  store: {
    /** Keyed by the union, so adding a selling mode is a compile error in every dictionary. */
    typeLabels: Record<StoreType, string>
    card: {
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
      textLabel: string
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
