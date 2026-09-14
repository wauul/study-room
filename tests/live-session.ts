/** Explicit integration run: real Neon/Groq/embeddings, two independent Socket.io
 * clients, no AI mocks. Run with TEST_BASE_URL and optionally TEST_EMAIL enabled. */
import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { io,Socket } from 'socket.io-client';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
class Client {
  cookies=new Map<string,string>();
  async request(path:string,init:RequestInit={}){const r=await fetch(base+path,{...init,headers:{...init.headers,Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')},redirect:'manual'});for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');this.cookies.set(pair.slice(0,i),pair.slice(i+1));}return r;}
  async json(path:string,body?:unknown,method='POST'){const r=await this.request(path,body===undefined?{}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,`${path}: ${JSON.stringify(data)}`);return data;}
  async login(email:string,password:string,register=true){if(register)await this.json('/api/auth/register',{email,password});const {csrfToken}=await this.json('/api/auth/csrf');const r=await this.request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email,password,csrfToken,callbackUrl:base,json:'true'})});assert.ok(r.status<400,'Credentials sign-in failed');}
}
function event<T=any>(s:Socket,name:string,timeout=120000):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,handler);reject(new Error(`Timeout: ${name}`));},timeout);const handler=(value:T)=>{clearTimeout(timer);resolve(value);};s.once(name,handler);});}
function emit(s:Socket,name:string,payload={}){return new Promise<any>((resolve,reject)=>{s.timeout(180000).emit(name,payload,(err:Error|null,result:any)=>{if(err||!result?.ok)reject(err||new Error(result?.error));else resolve(result);});});}
async function main(){
  const a=new Client(),b=new Client(),suffix=Date.now();
  let password=randomBytes(24).toString('hex');
  const saved=await fs.readFile('.tools/test-session.json','utf8').then(JSON.parse).catch(()=>null);
  const hostEmail=process.env.TEST_EMAIL||`host-${suffix}@example.com`;
  if(saved?.hostEmail===hostEmail)password=saved.password;
  await a.login(hostEmail,password,saved?.hostEmail!==hostEmail);await b.login(`partner-${suffix}@example.com`,password);
  const room=await a.json('/api/rooms',{name:'Cell biology · verified study session',displayName:'Alex',studyFocus:'Focus on chapter 3. Use everyday examples.'});console.log('Created room',room.id);
  const joinA=await a.json(`/api/rooms/${room.id}/join`,{displayName:'Alex'});const joinB=await b.json(`/api/rooms/${room.id}/join`,{displayName:'Sam'});
  await fs.writeFile('.tools/test-session.json',JSON.stringify({base,roomId:room.id,hostEmail,password,partnerEmail:`partner-${suffix}@example.com`}));
  const sa=io(joinA.socketUrl,{auth:{token:joinA.token},transports:['websocket']}),sb=io(joinB.socketUrl,{auth:{token:joinB.token},transports:['websocket']});
  try {
    await Promise.all([event(sa,'connect'),event(sb,'connect')]);await emit(sa,'join-room');await emit(sb,'join-room');
    for(const [file,type]of [['cell-biology.txt','COURSE_MATERIAL'],['past-exam.txt','PAST_EXAM']]){const form=new FormData();form.set('filename',file);form.set('sourceType',type);form.set('text',await fs.readFile(`samples/${file}`,'utf8'));const r=await a.request(`/api/rooms/${room.id}/documents`,{method:'POST',body:form});assert.equal(r.status,201,await r.text());}
    console.log('Ingestion passed');
    const chunksA:string[]=[],chunksB:string[]=[];sa.on('answer-chunk',p=>chunksA.push(p.token));sb.on('answer-chunk',p=>chunksB.push(p.token));
    const doneA=event(sa,'answer-complete'),doneB=event(sb,'answer-complete'),highlight=event(sb,'chunk-highlight');
    await emit(sa,'ask-question',{question:'How does active transport differ from facilitated diffusion?'});
    const [answerA,answerB,citation]=await Promise.all([doneA,doneB,highlight]);assert.equal(answerA.content,answerB.content);assert.ok(chunksA.length>1);assert.deepEqual(chunksA,chunksB);assert.ok(citation.chunkIds.length>0);console.log('Two-client streaming and highlighting passed');
    const simplification=event(sb,'simplified-reexplanation'),simpleDone=event(sb,'answer-complete');await emit(sb,'lost-click',{messageId:answerA.messageId});await simplification;await simpleDone;console.log('Lost-click auto-simplification passed');
    const qA=event(sa,'quiz-question-start'),qB=event(sb,'quiz-question-start');await emit(sa,'quiz-question-start');const [qa,qb]=await Promise.all([qA,qB]);assert.equal(qa.endsAt,qb.endsAt);assert.equal(qa.id,qb.id);assert.equal(qa.correctOptionIndex,undefined);assert.ok(qa.styledAfterPastExam);
    let revealedEarly=false;sb.once('quiz-round-reveal',()=>revealedEarly=true);await emit(sa,'quiz-submit',{questionId:qa.id,distribution:[25,25,25,25]});assert.equal(revealedEarly,false);
    const revA=event(sa,'quiz-round-reveal'),revB=event(sb,'quiz-round-reveal');await emit(sb,'quiz-submit',{questionId:qa.id,distribution:[70,10,10,10]});const [ra,rb]=await Promise.all([revA,revB]);assert.deepEqual(ra,rb);assert.equal(ra.results.length,2);console.log('Private submissions and simultaneous reveal passed');
    await new Promise(r=>setTimeout(r,300));const endedA=event(sa,'session-ended'),endedB=event(sb,'session-ended');await emit(sa,'end-session');await Promise.all([endedA,endedB]);const summary=await a.json(`/api/rooms/${room.id}/summary`);assert.ok(summary.summary.studyTips.length);assert.equal(summary.results.length,1);
    const pdf=await a.request(`/api/rooms/${room.id}/summary/pdf`,{method:'POST'});assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');await fs.writeFile('.tools/verified-rundown.pdf',bytes);console.log('Rundown and personalized PDF passed',bytes.length,'bytes');
    if(process.env.TEST_EMAIL){await a.json(`/api/rooms/${room.id}/summary/email`,{});console.log('Test email accepted by Resend');}
    console.log('LIVE SESSION PASS',`${base}/rooms/${room.id}/summary`);
  }finally{sa.disconnect();sb.disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
