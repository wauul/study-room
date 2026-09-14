import { Room } from '@prisma/client';
import { z } from 'zod';
import { structured } from './ai';
import { retrieve } from './rag/retrieval';
import { db } from './db';
const schema=z.object({questionText:z.string().min(10).max(1500),options:z.array(z.string().min(1).max(600)).length(4),correctOptionIndex:z.number().int().min(0).max(3),explanation:z.string().min(1).max(2000)});
export async function generateQuestion(room:Room) {
  const recent=await db.quizQuestion.findMany({where:{roomId:room.id},select:{sourceChunkId:true},orderBy:{createdAt:'desc'},take:5});
  const course=await retrieve(room,room.studyFocusRaw || 'Explain the central concepts, definitions and applications.', 'COURSE_MATERIAL',20);
  const chunk=course.find(c=>!recent.some(q=>q.sourceChunkId===c.id)) || course[Math.floor(Math.random()*course.length)];
  if(!chunk) throw new Error('Upload course material before starting a quiz.');
  const exams=await retrieve(room,chunk.content,'PAST_EXAM',2);
  // Past exams influence format ONLY. The source of truth is the course chunk.
  // Explicit safeguard plus a verbatim-substring check prevents copying a past question.
  const question=await structured('Write a NEW multiple-choice question grounded ONLY in the course content. Past exams are style/format references ONLY: never copy a past question verbatim. Exactly four distinct options and one unambiguous correct option. Return {questionText,options,correctOptionIndex,explanation}.',JSON.stringify({focus:room.studyFocusRaw,course:chunk.content,pastExamStyle:exams.map(e=>e.content)}),schema);
  const normalize=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  if(new Set(question.options.map(normalize)).size!==4 || exams.some(e=>normalize(e.content).includes(normalize(question.questionText)))) throw new Error('Question quality check failed. Please start another round.');
  return db.quizQuestion.create({data:{roomId:room.id,sourceChunkId:chunk.id,...question,styledAfterPastExam:exams.length>0,endsAt:new Date(Date.now()+20000)}});
}
