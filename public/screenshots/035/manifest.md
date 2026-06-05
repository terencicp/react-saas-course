# Chapter 035 screenshot pool

Reference for lesson-writing agents. One row per captured asset.

l2-desktop-1280.png — lesson 2, route /invoices, desktop 1280x800, settled, list of all 30 invoices beside the "pick an invoice" empty detail state.
l2-desktop-1280-detail.png — lesson 2, route /invoices/inv_017, desktop 1280x800, settled, list beside the selected invoice INV-2026-017 (Massive Dynamic, paid) detail.
l2-desktop-1280-status-paid.png — lesson 2, route /invoices?status=paid, desktop 1280x800, settled, list server-filtered to the 8 paid invoices (Paid control active) beside the empty detail state.
l3-desktop-1280-modal-open.png — lesson 3, route /invoices/new (reached via soft-nav from /invoices, URL is /invoices/new), desktop 1280x800, modal-open, the intercepted "New invoice" form in a shadcn Dialog over a dimmed overlay with the invoices list still mounted behind it — the soft-nav modal.
l3-desktop-1280.png — lesson 3, route /invoices/new, desktop 1280x800, settled (fresh hard load), the full-page "New invoice" twin form (with Cancel link to /invoices) rendered above the still-present two-column grid — the non-intercepting twin a direct visit/refresh resolves to.
l4-desktop-1280-detail-streaming.png — lesson 4, route /invoices/inv_005, desktop 1280x800, detail-streaming, the @detail slot showing DetailSkeleton (detail-skeleton) on the right while the full invoices-list stays mounted on the left — the independent per-slot streaming window captured mid-stream (getInvoice 600ms seam, temporarily widened during capture, restored to 600ms).
