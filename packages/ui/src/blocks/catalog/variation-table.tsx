"use client"

// Libs
import { rowSelectionFeature, tableFeatures, useTable, type RowSelectionState } from "@tanstack/react-table"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Input } from "@harness-monorepo/ui/components/input"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"
import { cn } from "@harness-monorepo/ui/lib/utils"
import { labelOf, type VariationCombination, type VariationRow } from "@harness-monorepo/ui/lib/variations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { VariationTableHeader } from "./variation-table-header"

const features = tableFeatures({ rowSelectionFeature })

export interface VariationTableProps {
  combinations: readonly VariationCombination[]
  onRow: (combination: VariationCombination, patch: Partial<VariationRow>) => void
  /** Whether the product counts its stock; the column is read-only while it does not. */
  trackStock: boolean
  selection: RowSelectionState
  onSelection: (selection: RowSelectionState) => void
  /** Opens one of the bulk actions over the selected rows. */
  onBulk?: (action: "price" | "stock") => void
  /** Combination key → the sentence for its row, written by the screen. */
  errors?: Readonly<Record<string, string>>
  /** The photo the shop window opens a combination on, and its number in the gallery. */
  photoOf?: (combination: VariationCombination) => { url: string; number: number } | null
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One row per combination: whether the shop sells it, its price, its stock and its code, edited
 * in place.
 *
 * Selecting and "selling" are two controls and not one, because design 4a drew one checkbox for
 * both and the header then counted three selected over four checked rows. The checkbox chooses
 * the rows a bulk action touches; the switch says whether the combination exists at all. TanStack
 * Table holds the selection — the one piece of this table that is state about rows rather than the
 * rows themselves.
 */
export function VariationTable({
  combinations,
  onRow,
  trackStock,
  selection,
  onSelection,
  onBulk,
  errors = {},
  photoOf,
  disabled = false,
  messages = defaultMessages,
}: VariationTableProps) {
  const text = messages.catalog.variations
  const table = useTable({
    features,
    columns: [],
    data: [...combinations],
    getRowId: (combination) => combination.key,
    state: { rowSelection: selection },
    onRowSelectionChange: (updater) =>
      onSelection(typeof updater === "function" ? updater(selection) : updater),
    enableRowSelection: !disabled,
  })

  const all = table.getIsAllRowsSelected()
  // Counted over the rows on screen: v9's "some selected" is true with every row selected too.
  const some = !all && table.getRowModel().rows.some((row) => row.getIsSelected())

  return (
    <>
      {onBulk ? (
        <VariationTableHeader
          combinations={combinations}
          selection={selection}
          onSelection={onSelection}
          onBulk={onBulk}
          trackStock={trackStock}
          disabled={disabled}
          messages={messages}
        />
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label={text.selectAll}
                disabled={disabled || combinations.length === 0}
                checked={all}
                indeterminate={some}
                onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)}
              />
            </TableHead>
            <TableHead>{text.columnCombination}</TableHead>
            <TableHead className="w-32">{text.columnPrice}</TableHead>
            <TableHead className="w-24">{text.columnStock}</TableHead>
            <TableHead className="w-36">{text.columnSku}</TableHead>
            <TableHead className="w-24">{text.columnWeight}</TableHead>
            <TableHead className="w-16">{text.columnSelling}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((tableRow) => {
            const combination = tableRow.original
            const { row } = combination
            const label = labelOf(combination.values)
            const error = errors[combination.key]
            const rowDisabled = disabled || !row.isActive
            const photo = photoOf?.(combination)

            return (
              <TableRow key={combination.key} data-state={tableRow.getIsSelected() ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={format(text.selectRow, { label })}
                    disabled={disabled}
                    checked={tableRow.getIsSelected()}
                    onCheckedChange={(checked) => tableRow.toggleSelected(checked)}
                  />
                </TableCell>
                <TableCell className={cn("font-medium", !row.isActive && "text-muted-foreground")}>
                  <span className="flex items-center gap-2">
                    {photo ? (
                      <img
                        src={photo.url}
                        alt={format(messages.catalog.media.photo, { number: String(photo.number) })}
                        className="border-border size-8 shrink-0 rounded border object-cover"
                      />
                    ) : null}
                    <span className={cn(!row.isActive && "line-through")}>{label}</span>
                  </span>
                  {error ? (
                    <p role="alert" className="text-destructive text-xs font-normal no-underline">
                      {error}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={format(text.priceOf, { label })}
                    inputMode="decimal"
                    value={row.price}
                    disabled={rowDisabled}
                    aria-invalid={error ? true : undefined}
                    onChange={(event) => onRow(combination, { price: event.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={format(text.stockOf, { label })}
                    inputMode="numeric"
                    value={trackStock ? row.stock : ""}
                    placeholder={trackStock ? undefined : text.notCounted}
                    disabled={rowDisabled || !trackStock}
                    onChange={(event) => onRow(combination, { stock: event.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={format(text.skuOf, { label })}
                    value={row.sku}
                    disabled={rowDisabled}
                    onChange={(event) => onRow(combination, { sku: event.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={format(text.weightOf, { label })}
                    inputMode="numeric"
                    value={row.weight}
                    disabled={rowDisabled}
                    onChange={(event) => onRow(combination, { weight: event.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    aria-label={format(text.sellingOf, { label })}
                    disabled={disabled}
                    checked={row.isActive}
                    onCheckedChange={(checked) => onRow(combination, { isActive: checked })}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}
