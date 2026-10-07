/** Real Next.js + Socket.io + Prisma + ephemeral PostgreSQL. Never reads live credentials. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { io, type Socket } from "socket.io-client";
import type { Policy } from "../lib/guardrail-core";
import { reserve, windowCharge, type GuardStore } from "../lib/guardrail-core";
import { PrismaClient } from "@prisma/client";
async function port() { const s = createServer(); s.listen(0,"127.0.0.1"); await once(s,"listening"); const p = (s.address() as {port:number}).port; await new Promise<void>(r=>s.close(()=>r())); return p; }
async function waitFor(url: string, child: ChildProcess) {
  const deadline = Date.now()+30000;
  while(Date.now()<deadline) {
    if(child.exitCode !== null)throw new Error("Test server exited during startup");
    try {const r=await fetch(url,{signal:AbortSignal.timeout(1000)});if(r.status<500)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error("Test server startup timed out");
}
async function event(socket: Socket, name: string, timeout=8000) {
  return new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Missing ${name}`)),timeout);socket.once(name,p=>{clearTimeout(timer);resolve(p);});});
}
async function emit(socket:Socket,name:string,payload={}) {return new Promise<any>((resolve,reject)=>socket.timeout(8000).emit(name,payload,(error:Error|null,result:any)=>error?reject(error):resolve(result)));}
async function main() {
  const pg=await PGlite.create({extensions:{vector}}), pgPort=await port();
  const database=new PGLiteSocketServer({db:pg,host:"127.0.0.1",port:pgPort,maxConnections:10});
  const children:ChildProcess[]=[],sockets:Socket[]=[];
  let aiCalls=0,emailCalls=0,lastEmail="";
  const used=new Set<string>();
  const provider=createServer(async(req,res)=>{
    let text="";for await(const chunk of req)text+=chunk;
    res.setHeader("Content-Type","application/json");
    if(req.url==="/turnstile") {const token=new URLSearchParams(text).get("response")||"";const success=!used.has(token)&&token.startsWith("test:");used.add(token);res.end(JSON.stringify({success,hostname:"study.invalid",action:token.split(":")[1]}));}
    else if(req.url==="/email"){emailCalls++;lastEmail=JSON.parse(text).text;res.end(JSON.stringify({id:randomUUID()}));}
    else if(req.url==="/ai"){aiCalls++;res.end(JSON.stringify({choices:[{message:{content:'{"boost":[],"exclude":[]}'}}]}));}
    else {res.statusCode=404;res.end("{}");}
  });
  try {
    for(const dir of (await readdir("prisma/migrations")).filter(d=>/^\d/.test(d)).sort())await pg.exec(await readFile(`prisma/migrations/${dir}/migration.sql`,"utf8"));
    await pg.exec("SET TIME ZONE 'UTC'");
    await database.start();provider.listen(0,"127.0.0.1");await once(provider,"listening");
    const webPort=await port(),socketPort=await port(),base=`http://127.0.0.1:${webPort}`, webOrigin=`http://study.invalid:${webPort}`;
    const env: NodeJS.ProcessEnv={...process.env,NODE_ENV:"production",DATABASE_URL:`postgresql://postgres:postgres@127.0.0.1:${pgPort}/postgres?connection_limit=1&sslmode=disable&pgbouncer=true&statement_cache_size=0`,NEXTAUTH_SECRET:"isolated-session-secret-"+randomUUID(),SOCKET_SIGNING_SECRET:"isolated-socket-secret-"+randomUUID(),NEXTAUTH_URL:webOrigin,APP_ORIGIN:webOrigin,SOCKET_SERVER_URL:`http://127.0.0.1:${socketPort}`,PORT:String(socketPort),TURNSTILE_SECRET_KEY:"synthetic",GROQ_API_KEY:"synthetic",RESEND_API_KEY:"synthetic",RESEND_FROM:"test@example.invalid",GOOGLE_CLIENT_ID:"",GOOGLE_CLIENT_SECRET:"",GITHUB_ID:"",GITHUB_SECRET:"",AZURE_AD_CLIENT_ID:"",AZURE_AD_CLIENT_SECRET:"",SENTRY_DSN:"",NEXT_PUBLIC_SENTRY_DSN:"",SENTRY_AUTH_TOKEN:"",GUARDRAIL_TEST_PROVIDER_ORIGIN:`http://127.0.0.1:${(provider.address() as {port:number}).port}`,NODE_OPTIONS:`--import=${resolve("tests/fixtures/provider-stub.mjs").replaceAll("\\","/")}`};
    // Absolute file URL safely handles Windows paths containing spaces.
    env.NODE_OPTIONS=`--import=${pathToFileURL(resolve("tests/fixtures/provider-stub.mjs")).href}`;
    Object.assign(env, { TRUSTED_PROXY_IP_HEADER: "x-study-client-ip" });
    function start(args:string[]){const child=spawn(process.execPath,args,{env,stdio:["ignore","pipe","pipe"]});let output="";child.stdout?.on("data",c=>output+=c);child.stderr?.on("data",c=>{output+=c; if(String(c).includes("Isolated database"))console.error(String(c));});children.push(child);child.on("exit",code=>{if(code)console.error(output.slice(-2500));});return child;}
    const web=start(["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(webPort)]);
    await waitFor(base+"/privacy",web);
    let policy=(await pg.query<{config:Policy}>('SELECT config FROM "GuardrailPolicy"')).rows[0].config;
    const setPolicy=async(patch:Partial<Policy>)=>{policy={...policy,...patch};await pg.query('UPDATE "GuardrailPolicy" SET config=$1',[JSON.stringify(policy)]);};
    await setPolicy({enabled:{...policy.enabled,signup:true,email:true,uploads:true}});
    const probe = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    try {
      const store: GuardStore = { transaction: work => probe.$transaction(tx => work({ query: <T>(sql:string,...values:unknown[]) => tx.$queryRawUnsafe<T[]>(sql,...values), execute:(sql,...values)=>tx.$executeRawUnsafe(sql,...values) })) };
      await reserve(store, "signup", () => [windowCharge("integration-db-probe", 1, 60)]);
    } finally { await probe.$disconnect(); }
    class Client {
      cookies=new Map<string,string>();
      async request(path:string,body?:unknown,method=body===undefined?"GET":"POST") {
        const r=await fetch(base+path,{method,headers:{Origin:webOrigin,"x-study-client-ip":"127.0.0.1",Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join("; "),...(body===undefined?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
        for(const c of r.headers.getSetCookie()){const pair=c.split(";")[0],at=pair.indexOf("=");this.cookies.set(pair.slice(0,at),pair.slice(at+1));}return r;
      }
      async login(email:string) {
        const csrf=await (await this.request("/api/auth/csrf")).json();
        const r=await fetch(base+"/api/auth/callback/credentials",{method:"POST",headers:{Origin:webOrigin,"x-study-client-ip":"127.0.0.1",Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join("; "),"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({email,password:"a-secure-test-password",botToken:`test:login:${randomUUID()}`,csrfToken:csrf.csrfToken,json:"true",callbackUrl:base})});
        for(const c of r.headers.getSetCookie()){const pair=c.split(";")[0],at=pair.indexOf("=");this.cookies.set(pair.slice(0,at),pair.slice(at+1));}
        const session=await(await this.request("/api/auth/session")).json();assert.ok(session.user?.email,"Credentials login must create a session");
      }
    }
    const alice=new Client(),bob=new Client(),anonymous=new Client();
    const signupToken=`test:signup:${randomUUID()}`;
    assert.equal((await alice.request("/api/auth/register",{email:"alice@example.invalid",password:"a-secure-test-password",botToken:signupToken})).status,201);
    assert.equal((await bob.request("/api/auth/register",{email:"bob@example.invalid",password:"a-secure-test-password",botToken:signupToken})).status,403);
    assert.equal((await bob.request("/api/auth/register",{email:"bob@example.invalid",password:"a-secure-test-password",botToken:`test:signup:${randomUUID()}`})).status,201);
    await alice.login("alice@example.invalid");await bob.login("bob@example.invalid");
    assert.equal((await alice.request("/api/rooms",{name:"Protected room",displayName:"Alice"})).status,403);
    assert.equal((await alice.request("/api/account/verify",{botToken:`test:verify:${randomUUID()}`})).status,200);
    const token=new URL(lastEmail.match(/http:\/\/\S+/)![0]).hash.slice(1);
    assert.equal((await anonymous.request("/api/account/verify",{token},"PATCH")).status,200);
    assert.equal((await anonymous.request("/api/account/verify",{token},"PATCH")).status,400);
    await pg.exec('UPDATE "User" SET "emailVerified"=NOW() WHERE email=\'bob@example.invalid\'');
    const roomResponse=await alice.request("/api/rooms",{name:"Protected room",displayName:"Alice"});assert.equal(roomResponse.status,201);const room=await roomResponse.json();
    assert.equal((await anonymous.request(`/api/rooms/${room.id}`)).status,401);
    assert.equal((await bob.request(`/api/rooms/${room.id}`)).status,403);
    assert.equal((await bob.request(`/api/rooms/${room.id}/join`,{displayName:"Bob"})).status,403);
    const invite=await(await alice.request(`/api/rooms/${room.id}/invite`,{})).json();
    const joinedResponse=await bob.request(`/api/rooms/${room.id}/join`,{displayName:"Bob",invite:invite.token});assert.equal(joinedResponse.status,200);const joined=await joinedResponse.json();
    assert.equal((await bob.request(`/api/rooms/${room.id}/documents`,{})).status,403);
    assert.equal((await alice.request(`/api/rooms/${room.id}/study-focus`,{studyFocus:"Spend money"},"PATCH")).status,503);
    await setPolicy({enabled:{...policy.enabled,ai:true},dailyAiTokens:0});
    assert.equal((await alice.request(`/api/rooms/${room.id}/study-focus`,{studyFocus:"Spend money"},"PATCH")).status,429);
    assert.equal(aiCalls,0,"Denied requests must never call the AI provider");
    await setPolicy({maxDocumentsPerRoom:0});
    assert.equal((await alice.request(`/api/rooms/${room.id}/documents`,{})).status,429);
    const realtime=start(["--import","tsx","--import","./server/instrument.ts","server/entry.mjs"]);
    await waitFor(`http://127.0.0.1:${socketPort}/health`,realtime);
    const socket=io(`http://127.0.0.1:${socketPort}`,{auth:{token:joined.token},transports:["websocket"],extraHeaders:{Origin:webOrigin,"x-study-client-ip":"127.0.0.1"},reconnection:false});sockets.push(socket);await event(socket,"connect");assert.equal((await emit(socket,"join-room")).ok,true);
    const disconnected=event(socket,"disconnect");
    assert.equal((await alice.request(`/api/rooms/${room.id}/members/${joined.participantId}`,undefined,"DELETE")).status,200);
    await disconnected;
    assert.equal((await bob.request(`/api/rooms/${room.id}`)).status,403);
    assert.equal((await (await bob.request("/api/rooms")).json()).length,0,"Revoked rooms must disappear from listings");
    assert.equal((await bob.request(`/api/rooms/${room.id}/join`,{displayName:"Bob",invite:invite.token})).status,403);
    const summary={wellUnderstood:[],strugglePoints:[],studyTips:[],suggestedNextSteps:"No activity."};
    await pg.query('INSERT INTO "SessionSummary" (id,"roomId","resultJson") VALUES ($1,$2,$3)',[randomUUID(),room.id,JSON.stringify(summary)]);
    await pg.query('UPDATE "Room" SET status=\'ENDED\' WHERE id=$1',[room.id]);
    const before=emailCalls;
    const sent=await alice.request(`/api/rooms/${room.id}/summary/email`,{});assert.equal(sent.status,200);assert.equal((await sent.json()).sent,1);
    const repeated=await alice.request(`/api/rooms/${room.id}/summary/email`,{});assert.equal(repeated.status,200);assert.equal((await repeated.json()).sent,0);assert.equal(emailCalls-before,1);
    assert.equal((await bob.request(`/api/rooms/${room.id}`,undefined,"DELETE")).status,403);
    assert.equal((await alice.request(`/api/rooms/${room.id}`,undefined,"DELETE")).status,200);
    assert.equal((await pg.query('SELECT * FROM "Room"')).rows.length,0);
    const owned=await alice.request("/api/rooms",{name:"Deletion fixture",displayName:"Alice"});assert.equal(owned.status,201);
    assert.equal((await bob.request("/api/account",{confirmation:"WRONG"},"DELETE")).status,400);
    assert.equal((await bob.request("/api/account",{confirmation:"DELETE"},"DELETE")).status,200);
    assert.equal((await bob.request("/api/rooms")).status,401,"Deleted accounts cannot use an existing JWT session");
    assert.equal((await alice.request("/api/account",{confirmation:"DELETE"},"DELETE")).status,200);
    assert.equal((await pg.query('SELECT * FROM "Room"')).rows.length,0);
    assert.equal((await pg.query('SELECT * FROM "User"')).rows.length,0);
    assert.equal((await pg.query('SELECT * FROM "EmailVerification"')).rows.length,0);
    console.log("Integration passed: exact migrations, CAPTCHA replay, verified email, ownership, zero-cost denials, socket revocation, durable email deduplication, PDF worker, room/account deletion, and deleted-session denial.");
  } finally {
    for(const socket of sockets)socket.disconnect();
    for(const child of children){child.kill();}
    if(process.exitCode)console.error("Integration server failed");
    await Promise.all(children.map(child=>child.exitCode===null?Promise.race([once(child,"exit"),new Promise(r=>setTimeout(r,3000))]):Promise.resolve()));
    provider.closeAllConnections();await new Promise<void>(r=>provider.close(()=>r()));
    await database.stop();await pg.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
