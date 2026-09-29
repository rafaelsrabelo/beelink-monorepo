export interface StorefrontOrderAddressProps {
  /** "Endereço de entrega", or "Retirada na loja". */
  title: string
  /** The first in bold — who receives it, or the shop — then the address, line by line. */
  lines: readonly string[]
}

/** Where the order goes (6e, 6f): who receives it and where, or the shop it is picked up at. */
export function StorefrontOrderAddress({ title, lines }: StorefrontOrderAddressProps) {
  const [first, ...rest] = lines

  return (
    <section className="flex flex-col gap-1 rounded-2xl border border-shop-line bg-shop-background p-5 text-sm leading-[1.45] text-shop-on-background">
      <h2 className="mb-1 text-[17px] font-extrabold">{title}</h2>
      {first ? <p className="font-bold">{first}</p> : null}
      {rest.map((line) => (
        <p key={line} className="text-shop-muted">
          {line}
        </p>
      ))}
    </section>
  )
}
