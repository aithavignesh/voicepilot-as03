const OWNER='aithavignesh';
const REPO='voicepilot-as03';
const API='https://api.github.com';

function headers(){
  const token=process.env.GITHUB_TOKEN;
  return {
    'Accept':'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',
    ...(token?{Authorization:`Bearer ${token}`}:{})
  };
}

export function githubConfigured(){return Boolean(process.env.GITHUB_TOKEN);}

export async function getRepoFile(filePath:string){
  const r=await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${filePath}`,{headers:headers()});
  if(!r.ok) throw new Error(`GitHub read failed (${r.status})`);
  const data:any=await r.json();
  if(Array.isArray(data)||!data.content||!data.sha) throw new Error('GitHub path is not a text file');
  const content=Buffer.from(data.content,'base64').toString('utf8');
  return {content,sha:data.sha,path:data.path};
}

export async function replaceInFile(filePath:string,search:string,replacement:string,message:string){
  if(!githubConfigured()) throw new Error('GITHUB_TOKEN is not configured; modification mode is disabled.');
  const current=await getRepoFile(filePath);
  const occurrences=current.content.split(search).length-1;
  if(occurrences!==1) throw new Error(`Expected exactly one match in ${filePath}, found ${occurrences}.`);
  const content=current.content.replace(search,replacement);
  const r=await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${filePath}`,{
    method:'PUT',headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({message,content:Buffer.from(content,'utf8').toString('base64'),sha:current.sha,branch:'main'})
  });
  if(!r.ok) throw new Error(`GitHub write failed (${r.status})`);
  const data:any=await r.json();
  return {ok:true,path:filePath,commit:data.commit?.sha||'',url:data.commit?.html_url||`https://github.com/${OWNER}/${REPO}/blob/main/${filePath}`};
}
