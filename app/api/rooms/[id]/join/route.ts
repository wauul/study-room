import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser,HttpError } from '@/lib/auth';
import { roomToken } from '@/lib/tokens';
import { apiError,checkOrigin } from '@/lib/http';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{checkOrigin(req);const {id}=await params;const user=await requireUser();const {displayName}=z.object({displayName:z.string().trim().min(1).max(50)}).parse(await req.json());const room=await db.room.findUnique({where:{id}});if(!room)throw new HttpError(404,'Room not found.');
  let participant=await db.participant.findUnique({where:{roomId_userId:{roomId:id,userId:user.id}}});
  if(!participant){if(room.status==='ENDED')throw new HttpError(409,'This session has ended.');participant=await db.participant.upsert({where:{roomId_userId:{roomId:id,userId:user.id}},create:{roomId:id,userId:user.id,displayName,email:user.email},update:{}});}
  return NextResponse.json({participantId:participant.id,token:await roomToken(id,participant.id,user.id),socketUrl:process.env.SOCKET_SERVER_URL||'http://localhost:3001',isHost:room.hostUserId===user.id});
}catch(e){return apiError(e);}}
