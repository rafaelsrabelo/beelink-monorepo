# Product — bee-link

> **Tier:** product — true no matter which app is rewritten. See [the tier map](../README.md).

**bee-link** lets a small shopkeeper sell without building a shop. They sign up, describe their store, load their catalogue, and immediately have two things: a public shop window their customers can open from a link, and a panel where orders arrive. There is no marketplace and no shared storefront — each store is its own destination, and bee-link never stands between a shopkeeper and their customer.

## Language

Every surface speaks the reader's language, between Brazilian Portuguese (`pt-BR`, the default) and English. A person's choice is remembered; without one, the browser's `Accept-Language` decides. Screens, e-mails and the sentences a person reads follow it.

The shopkeeper's customers are Brazilian, so the shop window and the order messages are written in pt-BR. English exists for the owner-facing screens.

What the API sends is a stable `errorCode`, never a sentence — the apps own the words, so adding a language never touches the backend. Identifiers and comments stay in English everywhere, whatever the screen says.

## Accounts

An **account** is how a person proves who they are, to bee-link. A shopkeeper has one. So does a customer who chose to be remembered — the same kind of account, reached through a different door, and the two are never the same session.

- It has a **name**, an **e-mail** and a **password**. No two accounts share an e-mail, compared without case and without surrounding spaces.
- A password has between 8 and 128 characters.
- An account is born **unverified**. Signing up sends an e-mail with a confirmation link, valid for 24 hours and usable once. Asking again sends a new link.
- An unverified account cannot sign in.
- Signing in opens a **session** on that device. A session lives while it is used at least once every 30 days; signing out ends that device's session only.
- A forgotten password is replaced through an e-mailed link, valid for 1 hour and usable once. Replacing the password ends every session of the account.
- Whether an e-mail has an account is never revealed: "forgot password" and "resend confirmation" answer the same way for any address, and a wrong password reads the same as an unknown e-mail.

## Stores

A **store** is the tenant. Everything else in the product — products, orders, customers, coupons, delivery rules — belongs to exactly one store and is meaningless outside it.

- A store has an **owner**, which is one account. An account may own more than one store.
- A store has a **slug**, unique across the product, and the slug is its public address: the shop window is `/<slug>` and the panel is `/admin/<slug>`. A slug is what a shopkeeper prints on a flyer, so it changes rarely and never silently.
- A store has a **kind**, which says how it sells rather than what it sells, and changes what the shop window emphasises, not what the product can do. One kind exists: a shop that sells online end to end. A second one is earned by a shop window that has to behave differently — never by a new line of business.
- A store has a **category**, chosen from a list the product seeds. That is where a line of business lives — supplements, fashion, groceries — and it is directory data: it tells a visitor what the shop is, and changes nothing about how the shop works.
- A store carries its own **brand**: a name, a logo, and colours that the shop window wears. The colours are data the shopkeeper chooses, not a theme the product ships.
- A store has an **address** and a position on the map. That position is what delivery distance is measured from.
- **Only the owner may read or change anything of theirs.** This is decided by the product, once, at the point the data is served — not by the screen that happens to be asking. Two shopkeepers are strangers to each other.

## The shop window

The shop window at `/<slug>` is **anonymous**. No one signs in to buy, nothing about a visitor is required before they choose, and the page must be readable by a search engine and by a phone on a bad connection. It is the surface the product is judged on.

It shows the store's brand, its catalogue grouped by category, and a product's detail with its images. A visitor builds a **cart**, which is theirs and stays on their device until they check out.

A shop window that is briefly out of date is acceptable; a shop window that is slow or unreadable is not.

## The panel

The panel at `/admin/<slug>` is where the shopkeeper works: the catalogue, the orders as they arrive, the store's own settings, delivery rules, promotions, and what sold. It is signed in, it is used on a phone behind a counter as often as on a desk, and a new order has to become visible without the shopkeeper reloading anything.

## Catalogue

- A **product** belongs to a store. It has a name, a description, a price and images.
- Whether a customer sees it is **two facts, not one**, and the product keeps them apart on purpose.
  - Its **status** is what the shopkeeper intends: *active*, or a *draft* nobody but them can see. A draft is something being written, not something that ran out.
  - Its **stock** is what the shelf says. A shop may choose not to count a product at all — most here sell made to order — and one that is not counted is never sold out. A shop that does count and reaches zero has a product that is **sold out**, which is a different thing from a draft and is fixed a different way.
- A product is in the shop window when it is active **and** not sold out. A draft is nowhere. A sold-out product leaves the window, the category and the search, but **keeps its own page**, marked sold out and with no way to order: that address is what a shopkeeper sends on WhatsApp, and a link that starts answering "not found" is the most visible failure this product can produce.
- A **category** also belongs to a store; a product sits in one. Both products and categories carry an **order the shopkeeper chooses** — the shop window shows them in that order, because the shopkeeper knows what they want to sell first.
- A name is unique inside its store, so two products called the same thing cannot both exist and confuse an order.
- There is a separate, product-wide taxonomy of **store categories** ("bakery", "clothing"), which describes stores rather than products.

## Customers

A **customer** is a store's own record of someone who bought from it: a name, a phone number and an address, remembered so they do not retype it next time. The phone number identifies them **within one store**: the same person buying from two stores is two customers, and neither store learns about the other.

A customer may be **linked to an account**, and that link is what lets an address follow them. The account is bee-link's; the customer record is the shopkeeper's. **No shopkeeper ever reads the account**, which is what keeps the sentence above literally true: a person with one bee-link account who buys from two stores is still two customers, and neither store can tell.

The link is optional, and a customer without one is not a lesser customer. Shops carried over from the legacy product arrive with no e-mail on file at all.

**Buying requires a verified identity; reaching the checkout does not.** The shop window, the cart and the checkout form open for anyone, so the delivery fee is visible before anything is asked. What requires an account is **placing the order**, and for most people the account is what the purchase leaves behind rather than what it demanded up front.

## Orders

An **order** is the product's core record, and it is a fact about the past.

- It belongs to a store and to a customer, and it carries a **number that is sequential within its store** — something a shopkeeper can say out loud on the phone.
- It holds **lines**: what was bought, how many, and the name and unit price **as they were at the moment of purchase**. A price change or a deleted product never rewrites an order that already happened.
- It records its own totals: the subtotal, the delivery fee, any discount, and the total. Every one of them is a number, not a sentence.
- It has a **status** the shopkeeper moves it through — received, accepted, being prepared, out for delivery, delivered, or cancelled — and the customer can follow it.
- It says how it is being handed over (delivery or pick-up) and how it will be paid.
- The customer's own note to the shop is the customer's; it is never used to carry the product's own data.

**Money is exact.** Every amount in the product is a whole number of cents. There is one representation, everywhere, and a total shown to a customer matches the total the shopkeeper sees to the cent.

## Delivery

A store decides whether it delivers, how far, and what it charges. The fee follows the **distance** between the store and the delivery address, within bands the shopkeeper sets, and a free-delivery threshold is one of those decisions. Beyond the store's radius, delivery is refused before the customer fills anything else in — not after.

An estimated arrival is a **window** (from–to), because a single number is a promise the product cannot keep.

## Promotions and coupons

A store runs **promotions** — a discount over the whole cart, or over named products or categories, for a period the shopkeeper sets. A discount is either a percentage or a fixed amount, and which one it is, is stated rather than inferred.

A **coupon** is a code a customer types. A code is unique **within its store**, valid for a period, and may be limited in how many times it can be used in total or by one customer. A coupon that has run out, expired or does not apply says so at checkout, before the customer commits.

## Checkout and the handoff to WhatsApp

Checkout collects who the customer is, where the order goes, how it will be paid, and any coupon — then places the order and hands the conversation to **WhatsApp**. The order exists in the product the moment it is placed; the WhatsApp message is how the shopkeeper and the customer keep talking, which is how this trade already works in Brazil.

**The product does not take payment.** The payment method on an order is a label saying how the two of them settled it. Nothing is charged, held or refunded by bee-link.

## What the product does not do

- It does not process payments.
- It does not send WhatsApp messages on the shopkeeper's behalf — it opens the conversation.
- It has no customer accounts, no order history a customer signs in to see, and no cross-store identity.
- It is not a marketplace: there is no page that lists every store, and no store discovers another's customers.
