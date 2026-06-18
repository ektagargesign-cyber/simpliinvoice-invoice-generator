import { Party } from "@/lib/invoiceTypes";

// ---------------------------------------------------------------------------
// Seller profile — your own business details, saved once and auto-filled
// into every new invoice.
// ---------------------------------------------------------------------------

const SELLER_KEY = "simpliinvoice_seller_profile";

export function loadSellerProfile(): Party | null {
  try {
    const raw = localStorage.getItem(SELLER_KEY);
    return raw ? (JSON.parse(raw) as Party) : null;
  } catch {
    return null;
  }
}

export function saveSellerProfile(seller: Party): void {
  try {
    localStorage.setItem(SELLER_KEY, JSON.stringify(seller));
  } catch {
    // localStorage can be unavailable (e.g. private browsing) — fail silently
  }
}

// ---------------------------------------------------------------------------
// Saved buyers — a directory of repeat customers, picked from a dropdown
// instead of retyped every time.
// ---------------------------------------------------------------------------

const BUYERS_KEY = "simpliinvoice_saved_buyers";

export function loadBuyers(): Party[] {
  try {
    const raw = localStorage.getItem(BUYERS_KEY);
    return raw ? (JSON.parse(raw) as Party[]) : [];
  } catch {
    return [];
  }
}

export function saveBuyer(buyer: Party): void {
  if (!buyer.name.trim()) return;
  const buyers = loadBuyers();
  const idx = buyers.findIndex(
    (b) => b.name.trim().toLowerCase() === buyer.name.trim().toLowerCase()
  );
  if (idx >= 0) buyers[idx] = buyer;
  else buyers.push(buyer);
  try {
    localStorage.setItem(BUYERS_KEY, JSON.stringify(buyers));
  } catch {
    // ignore
  }
}

export function deleteBuyer(name: string): void {
  const buyers = loadBuyers().filter(
    (b) => b.name.trim().toLowerCase() !== name.trim().toLowerCase()
  );
  try {
    localStorage.setItem(BUYERS_KEY, JSON.stringify(buyers));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Item catalog — frequently billed products/services, quick-added to a new
// invoice instead of retyped every time.
// ---------------------------------------------------------------------------

export interface CatalogItem {
  description: string;
  hsn: string;
  rate: number;
  gstRate: number;
}

const CATALOG_KEY = "simpliinvoice_item_catalog";

export function loadItemCatalog(): CatalogItem[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    return raw ? (JSON.parse(raw) as CatalogItem[]) : [];
  } catch {
    return [];
  }
}

export function saveItemToCatalog(item: CatalogItem): void {
  if (!item.description.trim()) return;
  const catalog = loadItemCatalog();
  const idx = catalog.findIndex(
    (c) => c.description.trim().toLowerCase() === item.description.trim().toLowerCase()
  );
  if (idx >= 0) catalog[idx] = item;
  else catalog.push(item);
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch {
    // ignore
  }
}

export function deleteCatalogItem(description: string): void {
  const catalog = loadItemCatalog().filter(
    (c) => c.description.trim().toLowerCase() !== description.trim().toLowerCase()
  );
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Per-company invoice number counter — scoped by company name, so two
// different businesses using this app never collide, while each one's own
// numbers stay sequential.
// ---------------------------------------------------------------------------

const COUNTER_PREFIX = "simpliinvoice_counter_";

function counterKey(companyName: string): string {
  const slug = companyName.trim().toLowerCase().replace(/\s+/g, "_") || "default";
  return `${COUNTER_PREFIX}${slug}`;
}

function formatInvoiceNumber(companyName: string, n: number): string {
  const prefix = (companyName.trim().substring(0, 3) || "INV").toUpperCase();
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

/** Preview only — does NOT increment the counter. Safe to call on every render. */
export function peekNextInvoiceNumber(companyName: string): string {
  const current = parseInt(localStorage.getItem(counterKey(companyName)) || "0", 10);
  return formatInvoiceNumber(companyName, current + 1);
}

/**
 * Increments and persists the counter. Call only from a deliberate user
 * action (e.g. a button click) — never automatically on page load, or every
 * reload/refresh burns a number even on an unfinished invoice.
 */
export function commitNextInvoiceNumber(companyName: string): string {
  const key = counterKey(companyName);
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  const next = current + 1;
  try {
    localStorage.setItem(key, String(next));
  } catch {
    // ignore
  }
  return formatInvoiceNumber(companyName, next);
}

// ---------------------------------------------------------------------------
// Drive sync support — bundles everything above into one object, and
// restores it the same way. Counters are exposed by slug (without the
// localStorage key prefix) so driveSync.ts can merge them safely without
// needing to know about the prefix convention.
// ---------------------------------------------------------------------------

export interface SyncableData {
  seller: Party | null;
  buyers: Party[];
  catalog: CatalogItem[];
  counters: Record<string, number>;
}

export function exportAllData(): SyncableData {
  const counters: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(COUNTER_PREFIX)) {
      const slug = key.slice(COUNTER_PREFIX.length);
      counters[slug] = parseInt(localStorage.getItem(key) || "0", 10);
    }
  }
  return {
    seller: loadSellerProfile(),
    buyers: loadBuyers(),
    catalog: loadItemCatalog(),
    counters,
  };
}

export function importAllData(data: SyncableData): void {
  try {
    if (data.seller) localStorage.setItem(SELLER_KEY, JSON.stringify(data.seller));
    localStorage.setItem(BUYERS_KEY, JSON.stringify(data.buyers || []));
    localStorage.setItem(CATALOG_KEY, JSON.stringify(data.catalog || []));
    for (const [slug, value] of Object.entries(data.counters || {})) {
      localStorage.setItem(`${COUNTER_PREFIX}${slug}`, String(value));
    }
  } catch {
    // ignore
  }
}
