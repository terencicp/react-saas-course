// Captures what is on the student's screen at the moment they send a
// message, so the tutor can anchor its answer to where they actually are.
//
// The snapshot is a structure-aware inventory, not a flat text span. Flat
// text failed in both directions: diagram box-labels flattened into a prose
// stream read as "the student is looking at text", and the model had no way
// to connect those fragments to the figure components whose source it holds
// in context. Instead, visible blocks are classified (diagram/figure, code
// block, quiz, exercise, prose) and listed top-to-bottom; figures are named
// by their caption, which is the model's key into the "Lesson figures and
// custom components" section of the system prompt.
//
// The snapshot is stored on the user message (ChatMessage.viewport) rather
// than rebuilt into the system prompt: the big system prompt stays
// byte-identical across turns (provider prefix caching keeps working), and
// each question permanently records where the student was when they asked.

const SNIPPET_LEN = 110;
/** Band hidden under Starlight's fixed header. */
const HEADER_BAND = 80;
const MAX_ITEMS = 8;

// Blocks worth calling out by kind. Order/selectors match the site's DOM:
// Figure.astro renders figure.sl-figure (+ .sl-figure-caption), astro-mermaid
// renders pre.mermaid, Expressive Code wraps frames in .expressive-code, and
// every exercise card carries a *-card / tk-drill class.
const NOTABLE_SELECTOR = [
	'figure.sl-figure',
	'pre.mermaid',
	'.expressive-code',
	'.code-variants',
	'.mcq-card',
	'.tk-drill',
	'.po-card',
	'.ta-card',
	'.tf-cards',
	'.cr-card',
].join(', ');

const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim();

const clip = (s: string, len = SNIPPET_LEN): string =>
	s.length > len ? `${s.slice(0, len)}…` : s;

const isShown = (el: Element): boolean =>
	typeof el.checkVisibility !== 'function' ||
	el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });

/** One human-readable line describing a notable block. */
const describe = (el: Element): string => {
	const text = (sel: string) => normalize(el.querySelector(sel)?.textContent ?? '');
	if (el.matches('figure.sl-figure')) {
		const caption = text('.sl-figure-caption');
		return caption
			? `a diagram/figure captioned “${clip(caption)}”`
			: `a diagram/figure (labels: “${clip(normalize(el.textContent ?? ''), 80)}”)`;
	}
	if (el.matches('pre.mermaid')) {
		return `a diagram (labels: “${clip(normalize(el.textContent ?? ''), 80)}”)`;
	}
	if (el.matches('.expressive-code')) {
		const title = text('figcaption');
		return title
			? `a code block titled “${clip(title, 80)}”`
			: `a code block starting “${clip(normalize(el.textContent ?? ''), 80)}”`;
	}
	if (el.matches('.code-variants')) {
		const tab = normalize(
			el.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? '',
		);
		return `a tabbed code comparison${tab ? ` (open tab: “${clip(tab, 40)}”)` : ''}`;
	}
	if (el.matches('.mcq-card')) {
		return `a quiz question: “${clip(normalize(el.textContent ?? ''))}”`;
	}
	return `an interactive exercise: “${clip(normalize(el.textContent ?? ''), 80)}”`;
};

export const captureViewportContext = (): string | null => {
	const content = document.querySelector('.sl-markdown-content');
	if (!content) return null;

	const vpTop = HEADER_BAND;
	const vpBottom = innerHeight - 16;

	// Blocks fully under the chat panel aren't visible to the student —
	// unless the panel is the full-screen mobile sheet, where the useful
	// snapshot is what sits underneath it.
	const panel = (() => {
		const r = document.querySelector('.ai-chat-panel')?.getBoundingClientRect();
		if (!r) return null;
		const coverage = (r.width * r.height) / (innerWidth * innerHeight);
		return coverage < 0.9 ? r : null;
	})();
	const hiddenByPanel = (r: DOMRect): boolean =>
		panel !== null &&
		r.left >= panel.left &&
		r.right <= panel.right &&
		r.top >= panel.top &&
		r.bottom <= panel.bottom;

	const inView = (r: DOMRect): boolean =>
		r.width >= 3 &&
		r.height >= 3 &&
		r.bottom >= vpTop &&
		r.top <= vpBottom &&
		r.right >= 0 &&
		r.left <= innerWidth &&
		!hiddenByPanel(r);

	type Item = { top: number; label: string };
	const items: Item[] = [];

	// --- notable blocks (diagrams, code, exercises), outermost only ---------
	const collected: Element[] = [];
	for (const el of content.querySelectorAll(NOTABLE_SELECTOR)) {
		if (collected.some((a) => a.contains(el))) continue; // nested in one already listed
		if (!isShown(el)) continue;
		const r = el.getBoundingClientRect();
		if (!inView(r)) continue;
		collected.push(el);
		const partial =
			r.top < vpTop
				? ' (its top is scrolled off)'
				: r.bottom > vpBottom
					? ' (it continues below the screen)'
					: '';
		items.push({ top: r.top, label: `${describe(el)}${partial}` });
	}

	// --- prose, at text-node granularity, excluding the blocks above --------
	// Text nodes are the finest unit the DOM offers: a tall paragraph
	// straddling the viewport edge contributes only its on-screen lines.
	const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) =>
			normalize(node.textContent ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
	});
	const range = document.createRange();
	const parts: string[] = [];
	let proseTop = Number.POSITIVE_INFINITY;
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const parent = node.parentElement;
		if (!parent || !isShown(parent)) continue;
		if (parent.closest(NOTABLE_SELECTOR)) continue;
		range.selectNodeContents(node);
		const r = range.getBoundingClientRect();
		if (!inView(r)) continue;
		proseTop = Math.min(proseTop, r.top);
		parts.push(normalize(node.textContent ?? ''));
	}
	if (parts.length > 0) {
		const prose = parts.join(' ');
		const label =
			prose.length > SNIPPET_LEN * 2
				? `lesson text starting at “${prose.slice(0, SNIPPET_LEN)}…” and ending at “…${prose.slice(-SNIPPET_LEN)}”`
				: `lesson text: “${prose}”`;
		items.push({ top: proseTop, label });
	}
	if (items.length === 0) return null;

	items.sort((a, b) => a.top - b.top);
	const inventory = items
		.slice(0, MAX_ITEMS)
		.map((i) => `- ${i.label}`)
		.join('\n');

	// Current section: the last h2–h4 that has scrolled into (or above) the
	// upper third of the viewport.
	let section: string | null = null;
	for (const h of content.querySelectorAll('h2, h3, h4')) {
		if (h.getBoundingClientRect().top <= innerHeight / 3) section = normalize(h.textContent ?? '');
		else break;
	}

	const max = document.documentElement.scrollHeight - innerHeight;
	const pct = max > 0 ? Math.round((Math.min(scrollY, max) / max) * 100) : 0;

	const where = section ? `in the section “${section}”` : 'at the top of the lesson';
	return `The student is ${where}, ~${pct}% down the page. On their screen, top to bottom:\n${inventory}`;
};
