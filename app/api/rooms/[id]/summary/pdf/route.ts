import { membership } from '@/lib/auth';
import { apiError,checkOrigin } from '@/lib/http';
import { personalizedPdf } from '@/lib/pdf';
export const runtime='nodejs';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{checkOrigin(req);const {id}=await params;const {participant}=await membership(id);const bytes=await personalizedPdf(id,participant.id);return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="study-room-rundown.pdf"','Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
