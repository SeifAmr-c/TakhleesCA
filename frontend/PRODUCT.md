# Product

## Register

product

## Users

**Primary: Importers and exporters with cargo in Egyptian ports.** Both businesses and individuals shipping into Alexandria, Sokhna, or Damietta who need a licensed customs clearance agent to release their cargo. They arrive at Takhlees in a high-stress state — port storage fees compound daily, the bureaucracy is opaque, and a delay is measured in money lost, not inconvenience. They are not browsing; they are looking for a way out of a problem that started the moment their shipment hit the port.

**Secondary: Customs clearance companies.** Licensed Egyptian agencies that take on incoming applications, manage them through clearance, request documents, and collect payment. They use Takhlees from desks in offices, often juggling many active shipments at once across many tabs and documents.

**Tertiary: Platform admins.** Internal staff verifying licensed agencies, moderating disputes, and overseeing platform integrity.

**Job to be done (primary user, in their words):** *"My cargo is legally cleared, paid for securely, and released from the port — without hidden fees or endless delays."*

## Product Purpose

Takhlees is a two-sided marketplace that connects Egyptian importers and exporters to licensed customs clearance agencies, then runs the entire engagement — application, document exchange, payment, and live tracking — inside a single transparent workflow.

It exists because the alternative is the official Nafeza portal plus a personal phone network of freight contacts: opaque, slow, intimidating, and impossible to trust without a referral. Takhlees replaces that with verified agencies, a fixed application flow, secure payment escrow, and a status timeline the importer can read at a glance from their phone while standing on the dock.

**Success looks like:** an importer who has never used Takhlees before lands on the site, finds a verified agency, files an application, pays, and watches their cargo move from "submitted" to "released" without ever calling support, ever doubting a price, or ever wondering what stage their shipment is in.

## Brand Personality

**Three words: Authoritative, Frictionless, Precise.**

The interface should lower the user's blood pressure within the first second of contact. It does this not by being soft or reassuring, but by being **so visibly competent that the user concludes — instantly — that this is the adult in the room.** The voice is calm, factual, and exact. It never oversells, never apologizes, never uses exclamation marks, and never says "easy." It states what is true, and what will happen next.

**Tone:** the operations console of a serious financial product, not a marketing brochure. If a sentence could appear on a Stripe transaction page or a Linear issue, it belongs. If it could appear on a freight company's homepage carousel, it does not.

**Emotional goal:** the user feels the platform is faster, cleaner, and more trustworthy than the alternative they were dreading — and they feel it before they finish reading the first heading.

## Anti-references

What Takhlees must explicitly **not** feel like:

- **The Nafeza portal (Egyptian Customs Authority).** Cluttered, intimidating, bureaucratic, government-form aesthetic. Forms that punish the user. Status language written for civil servants, not importers. Takhlees is the opposite read: clean, fast, written for the person paying.
- **Generic freight-forwarder websites.** Stock photos of cargo ships at golden hour. "Trusted by 1000+ companies" carousels with grayed-out logos. Hero feature grids of identical cards with a generic icon, a heading, and three lines of body copy. None of these belong here.
- **Corporate-brochure SaaS.** Marketing-driven landing pages with radial gradient hero glows, gold accents on dark navy, and gradient-text headings. The current `theme.css` leans this direction in places — that is the reflex to break.
- **Aesthetic family to avoid:** the saturated "logistics tech" lane (navy + gold + ship silhouettes + checkmark grids). We are keeping navy and teal as the foundation because they belong to the maritime/operational reality, but executing them at fintech precision — sharper, flatter, higher contrast — not as a corporate brochure aesthetic.

## Design Principles

**1. Lower the blood pressure on contact.** The user arrives anxious. Every screen, every label, every empty state must reduce the load — never add to it. If a UI element creates a question in the user's head, it has failed regardless of how it looks. Calm comes from clarity, not from soft colors.

**2. Numbers are first-class citizens.** Container IDs, bill-of-lading numbers, fees, dates, ETAs — these are the actual content of this product. They must be legible, scannable, copyable, monospaced where it helps, and never decorated. A number that the user has to squint at is a defect. A number they can't copy is also a defect.

**3. Status is the headline, not the decoration.** On every workflow screen the user has exactly one question — *where is my cargo right now?* — and the answer must be the most prominent thing on the page. Brand chrome, navigation, marketing language all sit below the status truth. Read this rule literally on every dashboard, every tracking page, every email.

**4. Software, not brochure.** Takhlees is an operational tool, not a marketing surface. Density is welcome where it serves the operator. Generous whitespace is welcome where it serves comprehension. Both are tools, neither is a default. The shape of any page should be driven by the work being done on it, not by a landing-page template.

**5. Trust is shown, never claimed.** Don't tell the user the agencies are licensed — show the license number. Don't tell them payments are secure — show the escrow state. Don't display "Trusted by X companies" — display the data the user actually needs to trust. Every trust signal must be a verifiable fact the user can read, not a marketing assertion.

## Accessibility & Inclusion

- **Language:** English-first, LTR, for the MVP. Arabic / RTL is a known future requirement (the user base is Arabic-speaking) but is not in scope yet — write copy that translates cleanly and avoid layouts that depend on left-anchored typography.
- **Contrast:** WCAG AA minimum throughout, with AAA for any small text that carries critical information (container numbers, fees, document IDs, deadline dates).
- **Legibility for operational data:** body text floor of 15px; tabular data and identifiers at 14px minimum with tabular-nums and a clearly distinct monospace pairing. Never below 13px for anything the user has to read carefully.
- **Device context, by role:**
  - **Clients:** mobile-friendly is non-negotiable. They check tracking statuses on their phones while physically at the port. Status pages, application progress, and payment confirmations must be fully functional on a 375px-wide screen.
  - **Companies & Admins:** desktop-first. They work from offices with many open tabs, PDFs, and reference data. Optimize for 1440px+ viewports, dense tables, keyboard navigation, and multi-shipment workflows. Mobile is acceptable but not the design target.
- **Motion & focus:** respect `prefers-reduced-motion`. Visible focus rings on every interactive element — these users include older operators who navigate by keyboard.
