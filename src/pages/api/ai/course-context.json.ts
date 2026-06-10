// Course-wide context for the AI assistant, prerendered to a static JSON
// file at build time. Fetched once per chat session and cached client-side
// (see src/components/ai-chat/lib/prompt.ts).
import type { APIRoute } from 'astro';
import { getUnitsOverview } from '../../../lib/ai/course-docs';

export const GET: APIRoute = () =>
	Response.json({
		courseTitle: 'Learn React SaaS',
		unitsOverview: getUnitsOverview(),
	});
