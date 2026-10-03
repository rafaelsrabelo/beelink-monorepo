# Product — bee-link

> **Tier:** product — true no matter which app is rewritten. See [the tier map](../README.md).

**bee-link** lets a small shopkeeper sell without building a shop. They sign up, describe their store, load their catalogue, and immediately have two things: a public shop window their customers can open from a link, and a panel where orders arrive. There is no marketplace and no shared storefront — each store is its own destination, and bee-link never stands between a shopkeeper and their customer.

## Language

Every surface speaks the reader's language, between Brazilian Portuguese (`pt-BR`, the default) and English. A person's choice is remembered; without one, the browser's `Accept-Language` decides. Screens, e-mails and the sentences a person reads follow it.

The shopkeeper's customers are Brazilian, so the shop window and the order messages are written in pt-BR. English exists for the owner-facing screens.

What the API sends is a stable `errorCode`, never a sentence — the apps own the words, so adding a language never touches the backend. Identifiers and comments stay in English everywhere, whatever the screen says.

## Accounts

An **account** is how a person proves who they are. A shopkeeper has one, and it is **bee-link's**: it opens the panel. A customer who chose to be remembered has one too, and it is **the shop's**: opened at one shop, it exists there and nowhere else — not at another shop, not in the panel. The same person buying from two shops has two accounts, with two passwords, and signing in at one is not signing in at the other.

- It has a **name**, an **e-mail** and a **password**. No two accounts of bee-link share an e-mail, and no two accounts of one shop do, compared without case and without surrounding spaces; the same e-mail may have an account at every shop and one more at bee-link.
- A password has between 8 and 128 characters.
- An account is born **unverified**. Signing up sends an e-mail with a confirmation link, valid for 24 hours and usable once. Asking again sends a new link.
- An unverified account cannot sign in.
- Signing in opens a **session** on that device, at the door the account belongs to: the panel, or its shop. A session lives while it is used at least once every 30 days; signing out ends that device's session only.
- A forgotten password is replaced through an e-mailed link, valid for 1 hour and usable once. Replacing the password ends every session of the account.
- Whether an e-mail has an account is never revealed: "forgot password" and "resend confirmation" answer the same way for any address, and a wrong password reads the same as an unknown e-mail.
- Every account is opened under **bee-link's terms of use**, having read its **privacy policy**, both public at the site's root. Opening one says so beside the button, whether it is a form or "Continuar com Google", and the account keeps a record of the version it accepted and when. Continuing with Google, or setting a password from an e-mailed link, records it too when the account has no record of the version in force, or when it is what proves the e-mail belongs to whoever holds the account. The texts carry one version, the day they took effect, and a new version is a new record, never an edit of the old one. The privacy policy says who answers for which data: the shopkeeper for their shop's customers, with bee-link as the one processing it for them, and bee-link for the shopkeepers' own accounts.
- A customer may **take a copy** of everything their shop keeps about them — the account, the record, the addresses, the orders, the favourites, the reviews and the conversations — as one file, whenever they like.
- A customer may **delete their account**, confirming it with the password, or with the e-mail typed again when the account was opened through Google and has none. Every session ends at once, and with the account goes everything the customer kept for themselves: favourites, saved addresses, CPF, birth date, notice preferences and the record of the terms accepted. The shop keeps its books: a customer it sold to stays on its list with a name and a phone, each order keeps the name and address it recorded, its conversation stays readable to the shop, and their reviews stay, signed "Cliente". A customer the shop never sold to leaves with the account. The same e-mail may open a new account there, which starts with nothing of the old one.

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

A **customer** is a store's own record of someone who bought from it: a name, a phone number and their addresses, remembered so they do not retype them next time. The phone number identifies them **within one store**: the same person buying from two stores is two customers, and neither store learns about the other.

A customer keeps **several addresses** — home, work — each with a name they give it and who receives there, and **one of them is the default**: where an order goes unless another is chosen at checkout, and the one address the shopkeeper sees on the customer's record.

A customer may be **linked to an account** — the shop's own, opened there — and that link is what lets an address follow them. Opening the account is what makes the person the shop's customer: a lead until they buy. **No shopkeeper ever reads the account's password or sessions**, and no account reaches past its shop, which is what keeps the sentence above literally true: a person who buys from two stores is two customers with two accounts, and neither store can tell.

The link is optional, and a customer without one is not a lesser customer. Shops carried over from the legacy product arrive with no e-mail on file at all.

A signed-in customer keeps **favourites** at the shop: products they liked, one heart per product, with the combination they chose on its page when they chose one. A favourite remembers what it cost the day it was liked, which is how the shop can say it is cheaper now; being on sale or sold out is read from the shop as it is today. Liking it again changes nothing, and choosing another combination is a new like at today's price. A product the shop takes back to draft leaves the list until it returns, and one it deletes leaves for good. A customer who keeps the favourites' notice on is told by e-mail when a favourite gets cheaper while on sale, or comes back in stock — at most once per product in a week, in the shop's name, with the way to switch it off.

**Buying requires a verified identity; reaching the checkout does not.** The shop window, the cart and the checkout form open for anyone, so the delivery fee is visible before anything is asked. What requires an account is **placing the order**, and for most people the account is what the purchase leaves behind rather than what it demanded up front.

## Reviews

A product's **reviews** come from the people the shop delivered it to. A customer rates a product they received — one to five stars, and a few words if they want — once, and may rewrite it later; the review keeps the combination they bought. It is published at once. The shopkeeper cannot edit a review, but may **hide** one from the shop window and publish it again; the customer still sees their own, marked hidden, and rewriting it does not bring it back.

The shop window shows a product's average and how many reviews it has, how many of each rating, and the reviews themselves, newest first. It names each reviewer by their first name and an initial, and as "Cliente" once they no longer have an account.

## Orders

An **order** is the product's core record, and it is a fact about the past.

- It belongs to a store and to a customer, and it carries a **number that is sequential within its store** — something a shopkeeper can say out loud on the phone.
- It holds **lines**: what was bought, how many, and the name and unit price **as they were at the moment of purchase**. A price change or a deleted product never rewrites an order that already happened.
- It records its own totals: the subtotal, the delivery fee, any discount, and the total. Every one of them is a number, not a sentence — with one absence: a delivery's fee may not be agreed yet, and that is never zero, because zero is a free delivery. Until the shop tells the fee, the total is the goods less the discount, and every screen that shows it says the fee is still to come. A pick-up has no fee, and a cancelled order has nothing left to agree.
- It has a **status** the shopkeeper moves it through — received, accepted, being prepared, out for delivery, delivered, or cancelled — and the customer can follow it. A signed-in customer sees their own orders at the shop — the ones they placed and the ones the shop registered for them — with the lines, the totals, where it goes and each status with its time; never the shop's note on it. They may cancel one while it is still **received**; once the shop accepted it, only the shop cancels.
- It says how it is being handed over (delivery or pick-up) and how it will be paid. A delivery goes to one of the customer's addresses and keeps **where it went and who received it, as they were at the moment of purchase**: a customer who moves or changes their name never rewrites an old order, and an order from before the product kept it says it was not recorded rather than borrowing today's address. A delivery with nowhere to go — no street and city — is refused.
- The customer's own note to the shop is the customer's; it is never used to carry the product's own data.

**Money is exact.** Every amount in the product is a whole number of cents. There is one representation, everywhere, and a total shown to a customer matches the total the shopkeeper sees to the cent.

## The order's conversation

An order whose customer has an account has a conversation, born with the order. The customer and the shop write in it while the order is on its way; once it is delivered or cancelled, the conversation closes and stays readable to both.

Every move of the order is told in it as a **notice**: the status it moved to, never a sentence — each side words it for its own reader. A notice is news to the customer, unread until they read it, and never to the shop, whose own doing it is. A move the customer made — placing the order, cancelling it — is not news to them either.

A customer known only by an order, with no account, has no conversation: there is no one to read it.

## Delivery

A store decides whether it delivers, how far, and what it charges. The fee follows the **distance** between the store and the delivery address, within bands the shopkeeper sets, and a free-delivery threshold is one of those decisions. Beyond the store's radius, delivery is refused before the customer fills anything else in — not after.

An estimated arrival is a **window** (from–to), because a single number is a promise the product cannot keep.

A store combines the ways it hands an order over — **pickup** at the shop, its **own delivery**, and **carriers** through its own Melhor Envio account — and each is switched on or off apart. Carriers are quoted with the shop's own account, at its own prices, and the labels are bought from its own wallet: Beelink never resells freight.

The fee is quoted in one place. What the cart shows, what the checkout shows and what the order records are the same quote, read again at the moment the order is placed: a fee that changed since the customer read it refuses the order rather than place it at another price. Where the store set no band, or an address cannot be placed on the map, the fee is **agreed afterwards** — said in words, never as zero, which is a free delivery.

## Promotions and coupons

A store runs **promotions** — a discount over the whole cart, or over named products or categories, for a period the shopkeeper sets. A discount is either a percentage or a fixed amount, and which one it is, is stated rather than inferred. A period has a start and may have no end: it then runs until the shopkeeper pauses it.

A **coupon** is a code a customer types. A code is unique **within its store** whatever the case it is typed in, valid for a period, and may be limited in how many times it can be used in total or by one customer. It gives a discount, as a promotion does, or a free delivery, and may ask for a minimum subtotal. A coupon that has run out, expired or does not apply says so at checkout, before the customer commits.

Only an **identified customer** applies a coupon: whether a code exists is not told to a visitor, who is told the code goes in once they sign in. The answer comes with the cart's totals — taken, or the reason it was not — and an order carries the coupon the customer was shown as applied, and no other. One that stopped holding between that answer and the order refuses the order rather than place it at another price.

A promotion or a coupon may be for a **first purchase** only: a customer with no order at the shop that stands. A cancelled order does not count, so a customer whose only order was cancelled is on a first purchase again. It is checked as the order is written, under the customer's lock, so two orders placed at once never both take it. Nobody can be on a first purchase before they are identified: a visitor's cart announces the offer with what it would take off, and it enters the total once they sign in. A customer who has bought before is told it is not theirs, and why, before they place the order. The shop window is the same for everyone, so a first-purchase promotion never changes a price on it.

Promotions never add up. Each line of a cart takes the one promotion worth the most on it — a promotion on a category covers its subcategories — and a fixed amount off the whole cart stands against the lines' own promotions together: the customer gets the larger. The coupon comes after, over what is left of the products, and one order takes one coupon. A percentage is rounded up to the cent, in the customer's favour — a promotion of 10% never reads as 9% — and no total goes below zero.

The discount is computed in one place. What the cart shows, what the checkout shows and what the order records are the same calculation, read at the moment the order is placed. A coupon's limits are checked as the order is written, so two orders at once never both take its last use. A cancelled order gives its coupon's use back.

What came off is said **part by part**, wherever an order or a cart is read: the promotions, the coupon by its code, and what the shopkeeper took off by hand — on the cart, the customer's order and its receipt, their list of orders, the shop's panel and the WhatsApp messages. A free delivery whose fee is not agreed yet is said in words, and to its customer such a total is final: the coupon covers whatever fee is agreed.

While a promotion runs, the shop window shows it: the price a visitor reads is the promotional one, with what it was beside it, and that price times the quantity is what the order takes off. A fixed amount off the whole cart is the exception — it is no product's price, and shows in the cart.

Either can be **paused** and switched back on. Where one stands — scheduled, running, paused, ended, or a coupon used up — is read from the clock and its limits, never set by hand. An order keeps the discount it took as it was, whatever is edited afterwards, and a coupon lists the orders it went into.

## Cashback

A store may give **cashback**: a share of what a customer pays for the products comes back to them as credit, to spend on that store's later orders. The shopkeeper switches it on and sets the rules — the share, how long a credit lasts once given (or that it never expires), the smallest order that earns, and how much of an order credit may pay for. A change to the rules applies to orders placed from then on; credit already given keeps the validity it was given with.

**Credit is the store's, not money.** It belongs to the customer's record at that store, is spent only there, and is never withdrawn, transferred or seen by another store. A customer with no account earns and spends it too, through the record the shop keeps of them.

An order **earns** on the products, after the promotions, the coupon and any credit spent on it — never on the delivery. The credit is **pending** while the order is open and becomes **usable once the order is delivered**, the same proof of a sale reviews rest on, since the product does not see the payment; its validity counts from the delivery. An order that is cancelled, or that leaves *delivered*, takes back what it earned — and when the customer already spent that credit, the balance **stops at zero**: it never goes negative, and the shopkeeper is shown the difference.

The shop window says what comes back while the cashback is on — on a product, and in the cart with what the order would earn or what is missing to reach the minimum — and each order says what it earned and where that credit stands. A customer who deletes their account loses their credit: the statement says so, and the shop's record of them may stay for its books. Credit is **spent** at checkout, after the promotions and the coupon, on the products only — never the delivery — and at most the share of them the shopkeeper allows; the soonest-to-expire credit goes first. The customer is told what they have and the most the cart takes before they confirm, and an order asking for more than they can spend at that moment is refused rather than placed at another price. Credit already given can be spent even after the shopkeeper switches the cashback off. Credit spent on an order that is then cancelled comes back with the validity it had — and at least seven more days, so it can still be used. Credit **expires** by itself once its validity is over, leaving the balance with a line on the statement; a week before, the customer is told by e-mail, unless they turned that notice off — it starts on, since it is about credit they already hold, not an offer.

Each customer's credit is a **statement** that only grows: what was earned, spent, taken back, expired, and what the shopkeeper adjusted by hand, with their reason. A line is never edited; a mistake is answered by another line. The balance is what the statement adds up to, and every change to it happens under the customer's lock, so two orders at once never spend the same credit. The shopkeeper sees what the store owes in credit, and how much of it expires soon. The customer reads their own in their account at the shop — the balance, what is pending, each credit with its validity and the statement — without the shopkeeper's reason for an adjustment, which was written for the shop's books. A sale the shopkeeper registers in the panel can spend the chosen customer's credit too, by the same rule as the checkout.

## Checkout and the handoff to WhatsApp

Checkout collects who the customer is, where the order goes, how it will be paid, and any coupon — then places the order and hands the conversation to **WhatsApp**. The order exists in the product the moment it is placed; the WhatsApp message is how the shopkeeper and the customer keep talking, which is how this trade already works in Brazil. It names the order by its number, and its lines, its discounts and its total are the ones the product recorded, not the ones the page computed.

A sale the shopkeeper registers in the panel is priced the same way before it is saved: the summary they confirm is the total the product will record, a promotion running on the day of the sale included.

An order placed at checkout starts **received**: the shopkeeper accepts it, or cancels it. A shop with no WhatsApp still takes orders — the customer is told the shop will confirm.

**The product does not take payment.** The payment method on an order is a label saying how the two of them settled it. Nothing is charged, held or refunded by bee-link.

## What the product does not do

- It does not process payments.
- It does not send WhatsApp messages on the shopkeeper's behalf — it opens the conversation.
- It has no cross-store identity: a customer's account belongs to the shop they signed up at.
- It is not a marketplace: there is no page that lists every store, and no store discovers another's customers.
