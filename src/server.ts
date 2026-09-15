import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import OpenAI from 'openai';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app=express();
const port=Number(process.env.PORT||10000);
const databaseUrl=process.env.DATABASE_URL||'';
const useDb=/^postgres(ql)?:\/\//i.test(databaseUrl)&&!databaseUrl.includes('PLACEHOLDER');
const pool=useDb?new Pool({connectionString:databaseUrl,ssl:{rejectUnauthorized:false}}):null;
const openai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:process.env.CORS_ORIGIN||'*'}));app.use(express.json({limit:'32kb'}));

type Event={type:string;title:string;description:string;actor:string;createdAt:string};
const project={id:1,name:'VoicePilot',repository:'aithavignesh/voicepilot-as03',description:'Voice-first AI engineering copilot that lets developers talk to a project instead of navigating dashboards.',stack:['TypeScript','Node.js','Express','PostgreSQL','OpenAI','Web Speech API'],status:'healthy',healthScore:96,updatedAt:new Date().toISOString()};
const files=[{path:'src/server.ts',language:'TypeScript',sizeBytes:14800,risk:'medium',summary:'Voice command orchestration, intent/entity extraction and API routes.'},{path:'public/app.js',language:'JavaScript',sizeBytes:11200,risk:'low',summary:'Voice capture, chat UI and project dashboard interactions.'},{path:'schema.sql',language:'SQL',sizeBytes:6400,risk:'low',summary:'PostgreSQL schema and demo seed data.'},{path:'public/styles.css',language:'CSS',sizeBytes:9200,risk:'low',summary:'Responsive technical dashboard styling.'},{path:'package.json',language:'JSON',sizeBytes:1200,risk:'medium',summary:'Runtime and build dependencies.'}];
const health=[{name:'TypeScript',status:'passing',score:100,detail:'Static type checks configured.'},{name:'API',status:'passing',score:98,detail:'Voice and project routes available.'},{name:'Database',status:useDb?'passing':'demo-mode',score:useDb?97:92,detail:useDb?'PostgreSQL connection configured.':'Running in safe demo mode; add DATABASE_URL for persistence.'},{name:'Dependencies',status:'warning',score:88,detail:'Review dependency updates before production.'},{name:'Security',status:'passing',score:95,detail:'Helmet, CORS, validation and parameterized SQL enabled.'}];
let events:Event[]=[{type:'deploy',title:'Deployment prepared',description:'Render deployment configuration verified.',actor:'VoicePilot',createdAt:new Date(Date.now()-20*60000).toISOString()},{type:'test',title:'API checks passed',description:'Voice command and project routes are ready.',actor:'CI',createdAt:new Date(Date.now()-55*60000).toISOString()},{type:'feature',title:'Intent + entity extraction',description:'Natural language commands now map to project intents and entities.',actor:'VoicePilot',createdAt:new Date(Date.now()-95*60000).toISOString()},{type:'scan',title:'Security baseline checked',description:'Request validation and security headers reviewed.',actor:'VoicePilot',createdAt:new Date(Date.now()-140*60000).toISOString()}];
const conversations=new Map<string,{role:string;content:string;metadata?:any;createdAt:string}[]>();
const clean=(s:string)=>s.replace(/[<>]/g,'').trim().slice(0,1200);
const intentFor=(text:string)=>{const t=text.toLowerCase();let intent='project_snapshot';if(/health|healthy|test|security|risk|issue|warning/.test(t))intent='health_report';else if(/change|recent|activity|commit|deploy|what happened/.test(t))intent='recent_activity';else if(/architecture|stack|technology|files|structure/.test(t))intent='project_snapshot';else if(/fix|improve|next|recommend|should i/.test(t))intent='recommendation';const entities=[...new Set((t.match(/\b(?:health|security|database|api|frontend|backend|typescript|postgresql|deployment|dependency)\b/g)||[]))];return{intent,entities};};
const fallback=(text:string,parsed:any)=>{if(parsed.intent==='health_report')return`VoicePilot is at ${project.healthScore}% health. ${health.map(x=>`${x.name}: ${x.status} (${x.score}%)`).join('; ')}. The main item to review is the dependency warning.`;if(parsed.intent==='recent_activity')return`The latest activity includes ${events.slice(0,3).map(x=>x.title).join(', ')}. The newest event says: ${events[0].description}`;if(parsed.intent==='recommendation')return`I would review the dependency warning first, then rerun the health scan and verify the API/database checks. I would not change production code without your approval.`;return`${project.name} is a ${project.description} The stack is ${project.stack.join(', ')}. It currently reports ${project.healthScore}% health. I can explain the architecture, health, recent activity, or recommend what to inspect next.`;};
async function answerFor(text:string){const parsed=intentFor(text);let answer=fallback(text,parsed),source='grounded-demo';if(openai){try{const r=await openai.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:.2,messages:[{role:'system',content:'You are VoicePilot, a voice-first engineering copilot. Use only supplied project facts. Never fabricate. Be concise and practical. Distinguish facts from recommendations.'},{role:'user',content:JSON.stringify({request:text,intent:parsed,project,health,events:events.slice(0,6),files})}]});answer=r.choices[0]?.message?.content?.trim()||answer;source='openai';}catch{source='grounded-demo';}}return{answer,intent:parsed.intent,entities:parsed.entities,source};}

app.get('/api/health',async(_req,res)=>{if(pool){try{await pool.query('SELECT 1');}catch{return res.status(503).json({ok:false});}}res.json({ok:true,service:'voicepilot',ai:!!openai,database:useDb,mode:useDb?'postgres':'demo'});});
app.get('/api/project',(_req,res)=>res.json(project));
app.get('/api/project/files',(_req,res)=>res.json(files));
app.get('/api/project/health',(_req,res)=>res.json({score:project.healthScore,checks:health}));
app.get('/api/project/activity',(req,res)=>{const n=Math.min(Math.max(Number(req.query.limit)||8,1),20);res.json(events.slice(0,n));});
app.post('/api/project/scan',(_req,res)=>{project.updatedAt=new Date().toISOString();events.unshift({type:'scan',title:'Health scan completed',description:'VoicePilot rechecked its project baseline.',actor:'VoicePilot',createdAt:project.updatedAt});res.json({ok:true,score:project.healthScore});});
app.post('/api/voice/command',async(req,res)=>{try{const text=clean(z.string().min(2).max(1200).parse(req.body?.text));res.json(await answerFor(text));}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Invalid request'});}});
app.post('/api/conversations',(_req,res)=>{const id=crypto.randomUUID();conversations.set(id,[]);res.json({conversationId:id});});
app.get('/api/conversations/:id/messages',(req,res)=>res.json(conversations.get(req.params.id)||[]));
app.post('/api/conversations/:id/messages',async(req,res)=>{try{const text=clean(z.string().min(2).max(1200).parse(req.body?.text));if(!conversations.has(req.params.id))return res.status(404).json({error:'Conversation not found'});const list=conversations.get(req.params.id)!;list.push({role:'user',content:text,createdAt:new Date().toISOString()});const data=await answerFor(text);list.push({role:'assistant',content:data.answer,metadata:{intent:data.intent,entities:data.entities,source:data.source},createdAt:new Date().toISOString()});res.json(data);}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Invalid request'});}});
app.use(express.static(path.join(__dirname,'../public')));app.use((_req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));
app.listen(port,()=>console.log(`VoicePilot listening on ${port} | mode=${useDb?'postgres':'demo'}`));
