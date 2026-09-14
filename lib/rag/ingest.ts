import { SourceType } from '@prisma/client';
import { db } from '../db';
import { chunkText } from './chunking';
import { embed } from './embeddings';
export async function ingest(roomId:string,filename:string,text:string,sourceType:SourceType) {
  const chunks=chunkText(text);
  if(!chunks.length) throw new Error('No readable text found. Scanned PDFs need OCR before upload.');
  if(chunks.length>100) throw new Error('Please split this document into smaller uploads (maximum 100 chunks).');
  const embedded:(ReturnType<typeof chunkText>[number]&{vector:string})[]=[];
  for(const chunk of chunks) embedded.push({...chunk,vector:JSON.stringify(await embed(chunk.content))});
  return db.$transaction(async tx=>{
    const document=await tx.document.create({data:{roomId,filename,sourceType}});
    for(const {vector,...chunk} of embedded) {
      const saved=await tx.documentChunk.create({data:{documentId:document.id,...chunk}});
      await tx.$executeRaw`UPDATE "DocumentChunk" SET embedding=${vector}::vector WHERE id=${saved.id}`;
    }
    return {...document,chunks:chunks.length};
  },{timeout:30000});
}
