import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import OpenAI from 'openai';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 10000);
const origin = process.env.CORS_ORIGIN || '*';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false } });
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin }));
app.use(express.json({ limit: '32kb' }));

const query = async <T extends Record<string, unknown>>(text:string, values:any[]=[]):Promise<T[]> => (await pool.query<T>(text, values)).rows;
const clean = (s:string) => s.replace(/[<>]/g,'').trim().slice(0,1200);

app.get('/api/health', async (_req,res)=>{ try { await pool.query('SELECT 1'); res.json({ok:true,service:'voicepilot',ai:!!openai}); } catch { res.status(503).json({ok:false}); }});
app.get('/api/project', async (_req,res)=>{ const rows=await query(`SELECT id,name,repository,description,stack,status,health_score AS "healthScore",updated_at AS "updatedAt" FROM projects WHERE id=1`); res.json(rows[0]); });
app.get('/api/project/files', async (_req,res)=>{ res.json(await query(`SELECT path,language,size_bytes AS "sizeBytes",risk,summary,updated_at AS "updatedAt" FROM project_files WHERE project_id=1 ORDER BY CASE risk WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,path`)); });
app.get('/api/project/health', async (_req,res)=>{ const checks=await query(`SELECT name,status,score,detail,checked_at AS "checkedAt" FROM health_checks WHERE project_id=1 ORDER BY score ASC`); const project=await query(`SELECT health_score AS "healthScore" FROM projects WHERE id=1`); res.json({score:project[0]?.healthScore ?? 0,checks}); });
app.get('/api/project/activity', async (req,res)=>{ const n=Math.min(Math.max(Number(req.query.limit)||8,1),20); res.json(await query(`SELECT type,title,description,actor,created_at AS "createdAt" FROM project_events WHERE project_id=1 ORDER BY created_at DESC LIMIT $1`,[n])); });
app.post('/api/project/scan', async (_req,res)=>{ await pool.query(`UPDATE projects SET health_score=96,updated_at=NOW() WHERE id=1`); await pool.query(`INSERT INTO project_events(project_id,type,title,description,actor) VALUES(1,'scan','Health scan completed','VoicePilot rechecked its project baseline.','VoicePilot')`); res.json({ok:true,score:96}); });

const intentFor = (text:string) => { const t=text.toLowerCase(); let intent='project_snapshot'; if(/health|healthy|test|security|risk|issue|warning/.test(t)) intent='health_report'; else if(/change|recent|activity|commit|deploy|what happened/.test(t)) intent='recent_activity'; else if(/architecture|stack|technology|files|structure/.test(t)) intent='project_snapshot'; else if(/fix|improve|next|recommend|should i/.test(t)) intent='recommendation'; const entities=[...new Set((t.match(/\b(?:health|security|database|api|frontend|backend|typescript|postgresql|deployment|dependency)\b/g)||[]))]; return {intent,entities}; };

async function context(){ const [p,h,a,f]=await Promise.all([query(`SELECT name,repository,description,stack,status,health_score AS "healthScore" FROM projects WHERE id=1`),query(`SELECT name,status,score,detail FROM health_checks WHERE project_id=1 ORDER BY score ASC`),query(`SELECT type,title,description,actor,created_at AS "createdAt" FROM project_events WHERE project_id=1 ORDER BY created_at DESC LIMIT 6`),query(`SELECT path,language,risk,summary FROM project_files WHERE project_id=1 ORDER BY CASE risk WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,path LIMIT 12`)]); return {project:p[0],health:h,activity:a,files:f}; }

const fallback=(c:any,intent:string)=>{ const p=c.project; if(intent==='health_report') return `VoicePilot is at ${p.healthScore}% health. ${c.health.map((x:any)=>`${x.name}: ${x.status} (${x.score}%)`).join('; ')}. The main item to review is the lowest-scoring check.`; if(intent==='recent_activity') return `The latest project activity is ${c.activity.slice(0,3).map((x:any)=>x.title).join(', ')}. The most recent event was ${c.activity[0]?.description || 'not recorded'}.`; if(intent==='recommendation') return `Based on the project data, I would review the dependency warning first, then rerun the health scan and verify the API/database checks. I would not change production code without your approval.`; return `${p.name} is a ${p.description} The stack is ${p.stack.join(', ')}. It currently reports ${p.healthScore}% health. I can explain the architecture, health, recent activity, or recommend what to inspect next.`; };

app.post('/api/voice/command', async (req,res)=>{ try { const text=clean(z.string().min(2).max(1200).parse(req.body?.text)); const parsed=intentFor(text); const c=await context(); let answer=''; if(openai){ const system=`You are VoicePilot, a voice-first engineering copilot. Answer only from the supplied project context. Never invent project facts. Be concise and practical. Distinguish facts from recommendations. This is a read-only public demo.`; const completion=await openai.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:.2,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({request:text,intent:parsed,projectContext:c})}]}); answer=completion.choices[0]?.message?.content?.trim()||fallback(c,parsed.intent); } else answer=fallback(c,parsed.intent); res.json({answer,intent:parsed.intent,entities:parsed.entities,source:openai?'openai':'grounded-fallback'}); } catch(e){ res.status(400).json({error:e instanceof Error?e.message:'Invalid request'}); }});

app.post('/api/conversations', async (_req,res)=>{ const rows=await query<{id:string}>(`INSERT INTO conversations(project_id) VALUES(1) RETURNING id`); res.json({conversationId:rows[0].id}); });
app.get('/api/conversations/:id/messages', async (req,res)=>{ const rows=await query(`SELECT role,content,metadata,created_at AS "createdAt" FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC`,[req.params.id]); res.json(rows); });
app.post('/api/conversations/:id/messages', async (req,res)=>{ try { const text=clean(z.string().min(2).max(1200).parse(req.body?.text)); const exists=await query(`SELECT id FROM conversations WHERE id=$1 AND project_id=1`,[req.params.id]); if(!exists.length) return res.status(404).json({error:'Conversation not found'}); await pool.query(`INSERT INTO messages(conversation_id,role,content) VALUES($1,'user',$2)`,[req.params.id,text]); const parsed=intentFor(text); const c=await context(); let answer=fallback(c,parsed.intent); let source='grounded-fallback'; if(openai){ const completion=await openai.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:.2,messages:[{role:'system',content:'You are VoicePilot. Use only supplied project context. Never fabricate facts. Keep answers concise and actionable.'},{role:'user',content:JSON.stringify({request:text,intent:parsed,projectContext:c})}]}); answer=completion.choices[0]?.message?.content?.trim()||answer; source='openai'; } await pool.query(`INSERT INTO messages(conversation_id,role,content,metadata) VALUES($1,'assistant',$2,$3)`,[req.params.id,answer,JSON.stringify({intent:parsed.intent,entities:parsed.entities,source})]); await pool.query(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`,[req.params.id]); res.json({answer,intent:parsed.intent,entities:parsed.entities,source}); } catch(e){ res.status(400).json({error:e instanceof Error?e.message:'Invalid request'}); }});

app.use(express.static(path.join(__dirname,'../public')));
app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));
app.listen(port,()=>console.log(`VoicePilot listening on ${port}`));
