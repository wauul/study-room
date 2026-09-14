import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';
export function apiError(error:unknown) {
  if(error instanceof HttpError) return NextResponse.json({error:error.message},{status:error.status});
  if(error instanceof ZodError) return NextResponse.json({error:error.issues[0]?.message ?? 'Invalid input.'},{status:400});
  console.error('Request failed', error instanceof Error ? `${error.name}: ${error.message.replace(/postgres(?:ql)?:\/\/\S+|gsk_\w+|re_\w+/g,'[redacted]')}` : 'UnknownError');
  return NextResponse.json({error:'The request could not be completed. Check the service configuration and try again.'},{status:500});
}
export function checkOrigin(request:Request) {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin && origin!==process.env.NEXTAUTH_URL) throw new HttpError(403,'Invalid request origin.');
}
