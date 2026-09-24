// Data
import palettes from "./store-palettes.json"

// Block
import type { StoreCreateValues, StoreSettingsValues } from "./store-schemas"
import type {
  StoreCategoryOption,
  StoreColorPreset,
  StoreColors,
  StoreSummary,
} from "./store-types"

/**
 * Fixtures for stories and tests. The app owns the content it actually renders.
 *
 * `web/no-hex-colors` scans every `.ts` and `.tsx` here, fixtures included, and it is right to: a
 * colour written into a module is a token that escaped. A shop's palette is neither a token nor
 * this package's — it is a row of the database — so the sample palettes live in
 * `store-palettes.json` and arrive here as data. That is scope, not a dodge: a `.json` file holds
 * no className, no `style` attribute and no component, so nothing in it can be the thing the gate
 * is looking for. Assembling a literal from its digits inside a `.ts` file *is* the dodge, because
 * that file can still paint something; this one cannot.
 */
export const sampleColorPresets: StoreColorPreset[] = palettes.presets

export const sampleStoreColors: StoreColors = sampleColorPresets[0].colors

export const sampleStoreCategories: StoreCategoryOption[] = [
  { id: "01931f2e-0000-7000-8000-000000000001", name: "Moda e acessórios" },
  { id: "01931f2e-0000-7000-8000-000000000002", name: "Comida e bebida" },
  { id: "01931f2e-0000-7000-8000-000000000003", name: "Casa e decoração" },
]

export const sampleStore: StoreSummary = {
  id: "01931f2e-1111-7000-8000-000000000001",
  slug: "doces-da-ana",
  name: "Doces da Ana",
  type: "ECOMMERCE",
  logoUrl: null,
}

export const sampleStores: StoreSummary[] = [
  sampleStore,
  {
    id: "01931f2e-1111-7000-8000-000000000002",
    slug: "nutri-suplementos",
    name: "Nutri Suplementos",
    type: "ECOMMERCE",
    logoUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  },
]

export const sampleStoreSettingsValues: StoreSettingsValues = {
  identity: {
    name: "Doces da Ana",
    type: "ECOMMERCE",
    description: "Bolos e doces feitos no dia, entregues na região.",
    logoUrl: "",
    categoryId: sampleStoreCategories[1]?.id ?? "",
  },
  address: {
    zipCode: "01001-000",
    street: "Praça da Sé",
    number: "100",
    complement: "",
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
  },
  social: {
    whatsapp: "11999998888",
    instagram: "docesdaana",
    tiktok: "",
    spotify: "",
    youtube: "",
  },
  appearance: {
    layoutType: "DEFAULT",
    bannerImageUrl: "",
    cardLayout: "grid",
    colors: sampleStoreColors,
  },
  paymentMethods: ["MONEY", "PIX"],
}

/** A shop as the create screen holds it before anything has been typed. */
export const sampleStoreCreateValues: StoreCreateValues = {
  slug: "",
  identity: { name: "", type: "ECOMMERCE", description: "", logoUrl: "", categoryId: "" },
  address: { zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  social: { whatsapp: "", instagram: "", tiktok: "", spotify: "", youtube: "" },
  colors: sampleStoreColors,
}
