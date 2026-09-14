import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { membership,HttpError } from '@/lib/auth';
import { parseFocus } from '@/lib/ai';
import { apiError,checkOrigin } from '@/lib/http';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{checkOrigin(req);const {id}=await params;const {room}=await membership(id,true);if(room.status!=='ACTIVE')throw new HttpError(409,'Session ended.');const {studyFocus}=z.object({studyFocus:z.string().max(2000)}).parse(await req.json());const focus=await parseFocus(studyFocus);await db.room.update({where:{id},data:{studyFocusRaw:studyFocus,studyFocusBoost:focus.boost,studyFocusExclude:focus.exclude}});return NextResponse.json({ok:true,focus});}catch(e){return apiError(e);}}
