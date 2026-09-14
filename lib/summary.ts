import { z } from 'zod';
import { db } from './db';
import { structured } from './ai';
import { confusionWeight } from './scoring/properScoringRule';
const insight=z.object({topic:z.string(),evidence:z.string(),sourceChunkId:z.string()});
export const summarySchema=z.object({wellUnderstood:z.array(insight),strugglePoints:z.array(insight.extend({severity:z.enum(['high','medium','low']),explanation:z.string().optional()})),studyTips:z.array(z.string()),suggestedNextSteps:z.string()});
export type Rundown=z.infer<typeof summarySchema>;
export async function simpler(chunkId:string,level=1) {
  const chunk=await db.documentChunk.findUniqueOrThrow({where:{id:chunkId}});
  const response=await structured('Explain this course passage using plain language, a concrete analogy, and one short check-for-understanding question. Return {"explanation":string}.',JSON.stringify({passage:chunk.content,simplicityLevel:level}),z.object({explanation:z.string()}));
  return response.explanation;
}
export async function buildSummary(roomId:string,heatmap:Record<string,number>) {
  const room=await db.room.findUniqueOrThrow({where:{id:roomId},include:{documents:{include:{chunks:true}},retrievalEvents:true,lostClicks:{include:{chatMessage:true}},questions:{include:{results:true}}}});
  const facts=room.documents.flatMap(d=>d.chunks.map(c=>({
    sourceChunkId:c.id,topic:c.sectionLabel || d.filename,
    retrievals:room.retrievalEvents.filter(e=>e.chunkId===c.id).length,decayedHeat:heatmap[c.id] || 0,
    lostClicks:room.lostClicks.filter(l=>l.chatMessage.citedChunkIds.includes(c.id)).length,
    quiz:room.questions.filter(q=>q.sourceChunkId===c.id).flatMap(q=>q.results.map(r=>({question:q.questionText,score:r.zeroProbability?'negative infinity':r.score,confusionWeight:confusionWeight(r.submittedDistribution as number[],q.correctOptionIndex),probabilityOnTruth:(r.submittedDistribution as number[])[q.correctOptionIndex]})))
  })));
  const result=await structured('Create an evidence-based study rundown. Return {wellUnderstood:[{topic,evidence,sourceChunkId}],strugglePoints:[{topic,evidence,sourceChunkId,severity:"high"|"medium"|"low"}],studyTips:string[],suggestedNextSteps:string}. Every evidence string MUST cite actual numeric facts from input. Use only supplied sourceChunkIds. Retrieval frequency alone does NOT establish confusion. No quiz data means no demonstrated mastery. No activity means explicitly insufficient evidence; do not invent achievements or struggles.',JSON.stringify({focus:room.studyFocusRaw,facts}),summarySchema);
  const valid=new Set(facts.map(f=>f.sourceChunkId));
  if([...result.wellUnderstood,...result.strugglePoints].some(s=>!valid.has(s.sourceChunkId))) throw new Error('Summary returned an invalid source. Retry ending the session.');
  // Evidence is rendered from recorded metrics, not entrusted to generated prose.
  // This makes numerical claims auditable even if the model embellishes its draft.
  const evidence=(id:string)=>{const f=facts.find(f=>f.sourceChunkId===id)!;return `${f.retrievals} retrievals; ${f.lostClicks} lost clicks; ${f.quiz.length} quiz submissions${f.quiz.length?`; probability assigned to the correct answer: ${f.quiz.map(q=>q.probabilityOnTruth+'%').join(', ')}; log scores: ${f.quiz.map(q=>typeof q.score==='number'?q.score.toFixed(3):q.score).join(', ')}`:'. No quiz evidence of mastery.'}`;};
  result.wellUnderstood=result.wellUnderstood.filter(p=>{const f=facts.find(f=>f.sourceChunkId===p.sourceChunkId)!;return f.quiz.length>0&&f.quiz.every(q=>q.probabilityOnTruth>=70)&&f.lostClicks===0;});
  result.strugglePoints=result.strugglePoints.filter(p=>{const f=facts.find(f=>f.sourceChunkId===p.sourceChunkId)!;return f.lostClicks>0||f.quiz.some(q=>q.probabilityOnTruth<50);});
  for(const point of [...result.wellUnderstood,...result.strugglePoints])point.evidence=evidence(point.sourceChunkId);
  for(const point of result.strugglePoints) if(point.severity==='high') point.explanation=await simpler(point.sourceChunkId);
  await db.$transaction([
    db.sessionSummary.upsert({where:{roomId},create:{roomId,resultJson:result},update:{resultJson:result}}),
    db.room.update({where:{id:roomId},data:{status:'ENDED',endedAt:new Date()}})
  ]);
  return result;
}
