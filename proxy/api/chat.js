// Vercel Edge Function: https://<project>.vercel.app/api/chat  (same code as the Cloudflare Worker)
import { handle } from '../worker.js';
export const config = { runtime: 'edge' };
export default function (request){ return handle(request, process.env); }
