// Minimal stroke icons (lucide geometry) for the chat header — no emoji, so
// they render identically across platforms and inherit currentColor.
type IconProps = { size?: number };

const svg = (size: number) =>
	({
		width: size,
		height: size,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 2,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		'aria-hidden': true,
	}) as const;

export const PlusIcon = ({ size = 16 }: IconProps) => (
	<svg {...svg(size)}>
		<line x1="12" y1="5" x2="12" y2="19" />
		<line x1="5" y1="12" x2="19" y2="12" />
	</svg>
);

export const XIcon = ({ size = 16 }: IconProps) => (
	<svg {...svg(size)}>
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	</svg>
);

// Settings — lucide "cpu" (a chip). The modal configures the API key and the
// model, so a compute chip reads truer than a generic gear.
export const CpuIcon = ({ size = 16 }: IconProps) => (
	<svg {...svg(size)}>
		<rect width="16" height="16" x="4" y="4" rx="2" />
		<rect width="6" height="6" x="9" y="9" rx="1" />
		<path d="M15 2v2" />
		<path d="M15 20v2" />
		<path d="M2 15h2" />
		<path d="M2 9h2" />
		<path d="M20 15h2" />
		<path d="M20 9h2" />
		<path d="M9 2v2" />
		<path d="M9 20v2" />
	</svg>
);

// Conversation history — lucide "messages-square" (stacked chat bubbles).
export const ChatsIcon = ({ size = 16 }: IconProps) => (
	<svg {...svg(size)}>
		<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
		<path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
	</svg>
);
