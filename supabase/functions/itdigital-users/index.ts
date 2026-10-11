import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const cors = {'Access-Control-Allow-Origin':'https://methodflowllba-bit.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req: Request)=>{
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'Método não permitido'},405);
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'Login obrigatório'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth.user)return reply({error:'Login inválido'},401);
  const {data:profile,error:profileError}=await db.from('profiles').select('role,active').eq('id',auth.user.id).single();
  if(profileError||profile?.role!=='admin'||!profile.active)return reply({error:'Acesso exclusivo do administrador'},403);
  try{
    const {email,password}=await req.json();
    if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<12)return reply({error:'Informe e-mail válido e senha com 12 caracteres ou mais'},400);
    const {data,error}=await db.auth.admin.createUser({email:email.trim().toLowerCase(),password,email_confirm:true});
    if(error)return reply({error:error.message},400);
    const {error:saveError}=await db.from('profiles').upsert({id:data.user.id,email:data.user.email,role:'usuario',active:true});
    if(saveError){await db.auth.admin.deleteUser(data.user.id);return reply({error:'Falha ao cadastrar perfil'},500);}
    return reply({id:data.user.id});
  }catch{return reply({error:'Não foi possível processar a solicitação'},400);}
});
