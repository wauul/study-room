import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { membership } from '@/lib/auth';
import { apiError } from '@/lib/http';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const {room,user}=await membership(id);
  const [documents,messages,participants,latestRound]=await Promise.all([
    db.document.findMany({where:{roomId:id},include:{chunks:{orderBy:{position:'asc'},select:{id:true,content:true,sectionLabel:true,position:true}}},orderBy:{createdAt:'asc'}}),
    db.chatMessage.findMany({where:{roomId:id},include:{participant:{select:{displayName:true}},_count:{select:{lostClicks:true}}},orderBy:{createdAt:'asc'}}),
    db.participant.findMany({where:{roomId:id},select:{id:true,displayName:true}}),
    db.quizQuestion.findFirst({where:{roomId:id,lockedAt:{not:null}},orderBy:{createdAt:'desc'},include:{results:{include:{participant:{select:{displayName:true}}}}}})
  ]);
  return NextResponse.json({room:{id:room.id,name:room.name,status:room.status,studyFocusRaw:room.studyFocusRaw},isHost:room.hostUserId===user.id,documents,messages:messages.map(m=>({...m,displayName:m.participant?.displayName,lostCount:m._count.lostClicks})),participants,latestRound});
}catch(e){return apiError(e);}}
