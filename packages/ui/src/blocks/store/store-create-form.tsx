"use client";

// React
import { useState } from "react";

// Libs
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";

// UI
import { Button } from "@harness-monorepo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@harness-monorepo/ui/components/card";
import { cn } from "@harness-monorepo/ui/lib/utils";

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index";
import type { UiMessages } from "@harness-monorepo/ui/locales/messages";

// Block
import { StoreAddressFields } from "./store-address-fields";
import { StoreColorsFields } from "./store-colors-fields";
import { StoreIdentityFields } from "./store-identity-fields";
import {
  createStoreCreateSchema,
  type StoreCreateValues,
} from "./store-schemas";
import { slugify } from "./store-slug";
import { StoreSocialFields } from "./store-social-fields";
import type {
  StoreAddressSuggestion,
  StoreCategoryOption,
  StoreColorPreset,
  StorePoint,
  StoreZipCodeAddress,
} from "./store-types";

/** Which step holds which slice. The slug sits with the identity it is derived from. */
const STEP_OF_SLICE = {
  slug: "identity",
  identity: "identity",
  address: "address",
  social: "social",
  colors: "appearance",
} as const satisfies Record<keyof StoreCreateValues, string>;

type StepName = (typeof STEP_OF_SLICE)[keyof typeof STEP_OF_SLICE];

/** The order they are walked in, which is the only thing that makes these steps and not tabs. */
const STEP_ORDER = [
  "identity",
  "address",
  "social",
  "appearance",
] as const satisfies readonly StepName[];

/** Which slices a step must satisfy before it will let go. */
const SLICES_OF_STEP: Record<StepName, Array<keyof StoreCreateValues>> = {
  identity: ["slug", "identity"],
  address: ["address"],
  social: ["social"],
  appearance: ["colors"],
};

/**
 * What a step will not let you leave without — emptiness, not validity.
 *
 * The difference matters. A button disabled until everything is *correct* leaves someone staring
 * at a control that will not move and no reason why; one disabled until the required boxes have
 * something in them lights up the moment they do, and pressing it is what surfaces a badly shaped
 * postcode. So this asks only "is there anything here", and the schema still has the last word.
 *
 * The address asks for nothing, and that is not an oversight: every address field is optional in
 * the form schema and `@IsOptional()` in the API's DTO. A step that blocked on it would be
 * inventing a rule neither half of the product has.
 */
const FILLED_OF_STEP: Record<StepName, (values: StoreCreateValues) => boolean> =
  {
    identity: (values) =>
      values.identity.name.trim().length > 0 && values.slug.trim().length > 0,
    address: () => true,
    // A site takes contact through a form; only a shop is incomplete without a WhatsApp.
    social: (values) => values.identity.type !== "ECOMMERCE" || values.social.whatsapp.trim().length > 0,
    appearance: (values) =>
      Object.values(values.colors).every((colour) => colour.trim().length > 0),
  };

export interface StoreCreateFormProps {
  /** The shop before anything is typed. The colours come with it: this package ships none. */
  defaultValues: StoreCreateValues;
  onSubmit: (values: StoreCreateValues) => void | Promise<void>;
  categories: StoreCategoryOption[];
  colorPresets?: StoreColorPreset[];
  /**
   * Asked to fill the address from the postcode, and its answer is used — `void` here is what made
   * the lookup run, resolve, and discard what it found, with no complaint from the compiler.
   */
  onZipCodeLookup?: (zipCode: string) => Promise<StoreZipCodeAddress | null>;
  zipCodeLookupPending?: boolean;
  /** What is in the street field, for the screen to search with. It debounces; this does not. */
  onAddressSearch?: (query: string) => void;
  suggestions?: readonly StoreAddressSuggestion[];
  addressSearchPending?: boolean;
  /** Where a picked suggestion says the shop is; the screen turns it into `mapSrc`. */
  onPointChange?: (point: StorePoint) => void;
  point?: StorePoint | null;
  mapTileUrl?: string;
  /** One callback for every image, as in the settings form — one upload endpoint serves both. */
  onImageUpload?: (file: File) => Promise<string>;
  imageUploadPending?: boolean;
  pending?: boolean;
  /** A sentence the reader can act on. The screen turns an API errorCode into it. */
  error?: string;
  messages?: UiMessages;
}

/**
 * Opening a shop, as a walk with an end, over the same field blocks the settings form edits with.
 *
 * Steps here and tabs there, and the difference is the task rather than the data. Creating is
 * linear and happens once: there is a first thing to say and a last, and the only decision — is
 * this shop right — belongs at the end of it. Editing is not: a shopkeeper opens the panel to
 * change one colour, and making them walk past three screens to reach it would be a wizard
 * pretending to be a form.
 *
 * A step is checked on the way out, which is the moment its author has said they are done with it
 * and the last moment their mistake is cheap. That is most of what the old layout needed error
 * marks for: a bad postcode never travels to the end to refuse there any more.
 *
 * The create is still the backstop — walking back and breaking something gets past the check that
 * would have caught it — and it carries the shopkeeper to the step that refused.
 *
 * One thing this form does that the settings form cannot: the slug is editable, because it is set
 * exactly once, and is proposed from the name until the shopkeeper touches it, so a shop whose
 * address is taken is renamed rather than abandoned.
 */
export function StoreCreateForm({
  defaultValues,
  onSubmit,
  categories,
  colorPresets,
  onZipCodeLookup,
  zipCodeLookupPending,
  onAddressSearch,
  suggestions,
  addressSearchPending,
  onPointChange,
  point,
  mapTileUrl,
  onImageUpload,
  imageUploadPending,
  pending = false,
  error,
  messages = defaultMessages,
}: StoreCreateFormProps) {
  const text = messages.store.create;
  const form = useForm<StoreCreateValues>({
    resolver: zodResolver(createStoreCreateSchema(messages.validation)),
    defaultValues,
  });
  const errors = form.formState.errors;
  const [step, setStep] = useState<StepName>("identity");
  /**
   * How far the shopkeeper has got. A step already passed can be reopened by clicking it — going
   * back to change the name is not a mistake — but one never reached cannot be jumped to, which is
   * the only thing separating these steps from four tabs in a row.
   */
  const [furthest, setFurthest] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);

  const index = STEP_ORDER.indexOf(step);
  const isLast = index === STEP_ORDER.length - 1;
  const values = form.watch();

  const slices = Object.keys(STEP_OF_SLICE) as Array<keyof StoreCreateValues>;
  const refusedSteps = new Set<StepName>(
    slices
      .filter((slice) => errors[slice])
      .map((slice) => STEP_OF_SLICE[slice]),
  );

  const goTo = (next: StepName) => {
    setStep(next);
    setFurthest((reached) => Math.max(reached, STEP_ORDER.indexOf(next)));
  };

  // A verdict on a step nobody is looking at is a form that refuses to save and says nothing.
  const openFirstRefusedStep = (refused: FieldErrors<StoreCreateValues>) => {
    const firstRefused = slices.find((slice) => refused[slice]);
    if (firstRefused) goTo(STEP_OF_SLICE[firstRefused]);
  };

  /**
   * Validated on the way out, not on every keystroke. Leaving a step is the moment a person has
   * said they are done with it, and it is the last moment their mistake is still cheap to fix.
   */
  const next = async () => {
    const passed = await form.trigger(SLICES_OF_STEP[step]);
    if (passed) goTo(STEP_ORDER[index + 1]);
  };

  const steps = [
    { name: "identity" as const, label: text.tabIdentity },
    { name: "address" as const, label: text.tabAddress },
    { name: "social" as const, label: text.tabSocial },
    { name: "appearance" as const, label: text.tabAppearance },
  ];

  const filled = FILLED_OF_STEP[step](values);
  // On the last step the button creates the shop, so what it reports is the whole form and not
  // just what is on screen — a required field emptied by going back must not be invisible here.
  const ready = isLast
    ? STEP_ORDER.every((name) => FILLED_OF_STEP[name](values))
    : filled;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit, openFirstRefusedStep)}
    >
      <Card>
        <CardHeader>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          {/*
            A trail and not a tab strip. What it shows is where the shopkeeper is in something with
            an end, which is the whole difference: a step already passed is a button, a step not
            yet reached is not — reaching it is what `Continuar` is for.
          */}
          <ol
            className="flex w-full items-center gap-2 overflow-x-auto"
            aria-label={format(text.stepProgress, { current: String(index + 1), total: String(STEP_ORDER.length) })}
          >
            {steps.map((entry, at) => {
              const reached = at <= furthest;
              const current = entry.name === step;
              const done = at < furthest && !refusedSteps.has(entry.name);

              return (
                <li
                  key={entry.name}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <button
                    type="button"
                    disabled={!reached || pending}
                    aria-current={current ? "step" : undefined}
                    onClick={() => setStep(entry.name)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      current
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                      reached && !current && "hover:bg-accent/60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                        current &&
                          "border-primary bg-primary text-primary-foreground",
                        done && "border-primary text-primary",
                        refusedSteps.has(entry.name) &&
                          "border-destructive text-destructive",
                      )}
                    >
                      {done ? <CheckIcon className="size-3.5" /> : at + 1}
                    </span>
                    <span className="truncate">{entry.label}</span>
                    {refusedSteps.has(entry.name) ? (
                      <>
                        <CircleAlertIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-destructive"
                        />
                        {/* A coloured dot alone is not a verdict — rule out colour as the only cue. */}
                        <span className="sr-only">{text.tabHasError}</span>
                      </>
                    ) : null}
                    {done ? (
                      <span className="sr-only">{text.stepDone}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          {step === "identity" ? (
            <div className="pt-2">
              <Controller
                control={form.control}
                name="slug"
                render={({ field: slugField }) => (
                  <Controller
                    control={form.control}
                    name="identity"
                    render={({ field }) => (
                      <StoreIdentityFields
                        value={field.value}
                        slug={slugField.value}
                        slugError={errors.slug}
                        categories={categories}
                        errors={errors.identity}
                        onLogoUpload={onImageUpload}
                        logoUploadPending={imageUploadPending}
                        disabled={pending}
                        messages={messages}
                        onSlugChange={(slug) => {
                          setSlugTouched(true);
                          slugField.onChange(slug);
                        }}
                        onChange={(identity) => {
                          field.onChange(identity);
                          if (!slugTouched) {
                            slugField.onChange(slugify(identity.name));
                          }
                        }}
                      />
                    )}
                  />
                )}
              />
            </div>
          ) : null}

          {step === "address" ? (
            <div className="pt-2">
              <Controller
                control={form.control}
                name="address"
                render={({ field }) => (
                  <StoreAddressFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.address}
                    onZipCodeLookup={onZipCodeLookup}
                    lookupPending={zipCodeLookupPending}
                    onAddressSearch={onAddressSearch}
                    suggestions={suggestions}
                    searchPending={addressSearchPending}
                    onPointChange={onPointChange}
                    point={point}
                    mapTileUrl={mapTileUrl}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </div>
          ) : null}

          {step === "social" ? (
            <div className="pt-2">
              <Controller
                control={form.control}
                name="social"
                render={({ field }) => (
                  <StoreSocialFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.social}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </div>
          ) : null}

          {step === "appearance" ? (
            <div className="pt-2">
              <Controller
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <StoreColorsFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.colors}
                    presets={colorPresets}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/*
        The one place a decision is made, and it is where a decision belongs: at the end of what
        you were reading, not floating beside the title. Sticky, so a long step never hides it —
        on the address step the map alone is most of a screen.

        Outside the Card and not inside it, which is not a layout preference: `Card` is
        `overflow-hidden`, and an ancestor that clips turns `position: sticky` into `position:
        static` with no warning anywhere. It reads as the card's foot and is not part of its box.
      */}
      <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-6 py-4 shadow-sm">
        <p aria-hidden="true" className="text-sm text-muted-foreground">
          {format(text.stepProgress, { current: String(index + 1), total: String(STEP_ORDER.length) })}
        </p>

        <div className="flex items-center gap-2">
          {index > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setStep(STEP_ORDER[index - 1])}
            >
              {text.back}
            </Button>
          ) : null}

          {isLast ? (
            <Button type="submit" disabled={pending || !ready}>
              {pending ? text.submitting : text.submit}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending || !ready}
              onClick={() => void next()}
            >
              {text.next}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
