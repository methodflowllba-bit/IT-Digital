'use strict';
(() => {
const login=document.querySelector('#login'), main=document.querySelector('main'), bar=document.querySelector('#account-bar'), message=document.querySelector('#auth-message');
if(!window.supabase){message.textContent='Não foi possível carregar a conexão. Verifique a internet e recarregue a página.';return;}
const db=window.supabase.createClient('https://pebcdwbzdbnmzwxqricd.supabase.co','sb_publishable_q-VuS2WzdtUfJRQ2BMkvBQ_Zp0K2rBh');
let profile=null, user=null, viewVersion=0;
const original=openScreen;
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x;};
const button=(text,fn,cls='action')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
const fail=(e)=>{console.error(e);const n=el('p',e.message||'Não foi possível concluir a ação.','notice');n.setAttribute('role','alert');content.prepend(n);};
const checked=(r)=>{if(r.error)throw r.error;return r.data;};
const admin=()=>profile?.active&&profile.role==='admin';
function field(form,label,name,type='text',options){const l=el('label',label),x=el(options?'select':'input');x.name=name;if(options)options.forEach(v=>{const o=el('option',v);o.value=v;x.append(o);});else x.type=type;x.required=true;l.append(x);form.append(l);return x;}
openScreen=function(screen,push=true){original(screen,push);const version=++viewVersion;if(!profile?.active)return;if(screen==='settings'){settings();return;}
if(screen.startsWith('operacao/')||(screen.startsWith('setor/')&&screen!=='setor/Baixa Tensão')||screen==='search'||screen==='mine'){
content.replaceChildren();
const filters=el('div',null,'admin-form');
let input,sectorFilter,typeFilter,operationFilter;
if(screen==='search'||screen==='mine'){
input=el('input');input.placeholder='Buscar pelo título, setor ou operação';input.setAttribute('aria-label','Buscar documentos');filters.append(input);
}
if(screen==='mine'){
heading.textContent='Meus favoritos';
sectorFilter=field(filters,'Setor','sector','text',['Todos os setores']);
operationFilter=field(filters,'Operação','operation','text',['Todas as operações']);
typeFilter=field(filters,'Tipo','type','text',['Todos os tipos','it','desenho','video']);
}
content.append(filters);
const status=el('p');status.setAttribute('role','status');content.append(status);
const list=el('div');content.append(list);
(async()=>{try{
const owner=user.id;
let q=db.from('documents').select('*').order('created_at',{ascending:false});
if(screen.startsWith('operacao/'))q=q.eq('sector','Baixa Tensão').eq('operation',screen.slice(9));
else if(screen.startsWith('setor/'))q=q.eq('sector',screen.slice(6));
const results=await Promise.all([q,db.from('document_favorites').select('document_id').eq('user_id',owner)]);
const docs=checked(results[0]);
const favorites=new Set(checked(results[1]).map(f=>f.document_id));
if(version!==viewVersion||user?.id!==owner)return;
if(screen==='mine'){
const addOptions=(target,values)=>values.forEach(v=>{const o=el('option',v);o.value=v;target.append(o);});
const favoriteDocs=docs.filter(d=>favorites.has(d.id));
addOptions(sectorFilter,[...new Set(favoriteDocs.map(d=>d.sector))].sort());
addOptions(operationFilter,[...new Set(favoriteDocs.map(d=>d.operation))].sort());
}
const render=()=>{
if(version!==viewVersion||user?.id!==owner)return;
list.replaceChildren();
const filtered=docs.filter(d=>(screen!=='mine'||favorites.has(d.id))&&
(!input||`${d.title} ${d.sector} ${d.operation}`.toLocaleLowerCase('pt-BR').includes(input.value.toLocaleLowerCase('pt-BR')))&&
(!sectorFilter||sectorFilter.value==='Todos os setores'||d.sector===sectorFilter.value)&&
(!operationFilter||operationFilter.value==='Todas as operações'||d.operation===operationFilter.value)&&
(!typeFilter||typeFilter.value==='Todos os tipos'||d.type===typeFilter.value));
if(!filtered.length)list.append(el('p',screen==='mine'?(favorites.size?'Nenhum favorito corresponde aos filtros.':'Você ainda não tem favoritos. Abra Setores ou Buscar e clique em ☆ Favoritar.'):'Nenhum documento encontrado.','empty'));
filtered.forEach(d=>{
const row=el('div',null,'document-row');
const star=button(favorites.has(d.id)?'★ Favoritado':'☆ Favoritar',async()=>{
star.disabled=true;status.textContent='Salvando…';
try{
const remove=favorites.has(d.id);
const result=remove?await db.from('document_favorites').delete().eq('user_id',owner).eq('document_id',d.id):await db.from('document_favorites').upsert({user_id:owner,document_id:d.id},{onConflict:'user_id,document_id',ignoreDuplicates:true});
checked(result);
if(version!==viewVersion||user?.id!==owner)return;
if(remove)favorites.delete(d.id);else favorites.add(d.id);
status.textContent=remove?'Documento retirado dos favoritos.':'Documento salvo nos favoritos.';
render();
}catch(e){if(version===viewVersion){status.textContent='Não foi possível salvar o favorito. '+(e.message||'Tente novamente.');star.disabled=false;}}
});
star.setAttribute('aria-pressed',String(favorites.has(d.id)));
star.setAttribute('aria-label',`${favorites.has(d.id)?'Remover dos favoritos':'Favoritar'}: ${d.title}`);
row.append(el('strong',d.title),el('span',`${d.type} · ${d.sector} · ${d.operation}`),button('Visualizar',()=>showDocument(d)),star);list.append(row);
});};
if(input)input.oninput=render;
[sectorFilter,typeFilter,operationFilter].filter(Boolean).forEach(f=>f.onchange=render);
render();
}catch(e){if(version===viewVersion)fail(e);}})();
}};
async function showDocument(doc){try{checked(await db.from('profiles').select('active').eq('id',user.id).single());const {signedUrl}=checked(await db.storage.from('brasformer').createSignedUrl(doc.file_path,300));const dialog=el('dialog');dialog.append(el('h3',doc.title),button('Fechar',()=>dialog.close()));let viewer;if(doc.type==='video'){viewer=el('video');viewer.controls=true;viewer.setAttribute('controlsList','nodownload');viewer.disablePictureInPicture=true;}else if(/\.(png|jpe?g|webp)$/i.test(doc.file_path)){viewer=el('img');viewer.alt=doc.title;}else{viewer=el('iframe');viewer.title=doc.title;}viewer.src=signedUrl;dialog.append(viewer);document.body.append(dialog);dialog.onclose=()=>{if(viewer.tagName==='VIDEO')viewer.pause();viewer.removeAttribute('src');dialog.remove();};dialog.showModal();}catch(e){fail(e);}}
// Pastas organizam o catálogo; os arquivos privados mantêm seu endereço.
function folderPath(folders,id){
const names=[],seen=new Set();
while(id){if(seen.has(id))break;seen.add(id);const f=folders.find(x=>x.id===id);if(!f)break;names.unshift(f.name);id=f.parent_id;}
return names.join(' / ');
}
function folderOptions(select,folders,selected=null){
select.replaceChildren();const root=el('option','Sem pasta (raiz)');root.value='';select.append(root);
folders.map(f=>({id:f.id,path:folderPath(folders,f.id)})).sort((a,b)=>a.path.localeCompare(b.path,'pt-BR')).forEach(f=>{const o=el('option',f.path);o.value=f.id;select.append(o);});
select.value=selected||'';
}
function explorer(host,uploadSelect=null){
const owner=user.id,version=viewVersion;
let folders=[],docs=[],favorites=new Set(),currentFolder=null,loadVersion=0;
const valid=()=>version===viewVersion&&user?.id===owner;
const box=el('section');box.setAttribute('aria-label','Explorador de arquivos');
box.append(el('h3','Explorador de arquivos'));
const toolbar=el('div',null,'document-row'),crumbs=el('nav'),status=el('p'),list=el('div');
crumbs.setAttribute('aria-label','Caminho da pasta');status.setAttribute('role','status');
const search=el('input');search.placeholder='Buscar pasta ou documento em todo o explorador';search.setAttribute('aria-label','Buscar no explorador');search.style.width='100%';
box.append(toolbar,crumbs,search,status,list);host.append(box);
const notify=e=>{if(valid())status.textContent=e.code==='23505'?'Já existe uma pasta com esse nome neste local.':e.code==='23503'?'A pasta contém arquivos ou subpastas. Mova o conteúdo antes de excluir.':(e.message||'Não foi possível concluir a ação.');};
async function load(){const request=++loadVersion;try{
const results=await Promise.all([db.from('document_folders').select('*').order('name'),db.from('documents').select('*').order('title'),db.from('document_favorites').select('document_id').eq('user_id',owner)]);
const nextFolders=checked(results[0]),nextDocs=checked(results[1]),nextFavs=checked(results[2]);
if(!valid()||request!==loadVersion)return;
folders=nextFolders;docs=nextDocs;favorites=new Set(nextFavs.map(x=>x.document_id));
if(currentFolder&&!folders.some(f=>f.id===currentFolder))currentFolder=null;
if(uploadSelect)folderOptions(uploadSelect,folders,uploadSelect.value);
render();
}catch(e){if(valid()&&request===loadVersion)notify(e);}}
function navigate(id){currentFolder=id;search.value='';status.textContent='';render();}
async function createFolder(parent){const name=prompt(parent?'Nome da subpasta:':'Nome da pasta raiz:');if(name===null)return;const clean=name.trim();if(!clean||clean.length>120||/[\\/]/.test(clean)){status.textContent='Use um nome de 1 a 120 caracteres, sem barras.';return;}
try{checked(await db.from('document_folders').insert({name:clean,parent_id:parent}));status.textContent='Pasta criada.';await load();}catch(e){notify(e);}}
function moveDocument(doc){
const dialog=el('dialog'),form=el('form',null,'admin-form'),label=el('label','Pasta de destino'),select=el('select');select.setAttribute('aria-label','Pasta de destino');folderOptions(select,folders,doc.folder_id);label.append(select);form.append(label);
const save=el('button','Mover arquivo','action');save.type='submit';const msg=el('p');msg.setAttribute('role','status');form.append(save,button('Cancelar',()=>dialog.close()),msg);
dialog.append(el('h3',`Mover: ${doc.title}`),form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();
form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{checked(await db.from('documents').update({folder_id:select.value||null}).eq('id',doc.id));dialog.close();if(valid()){status.textContent='Arquivo movido.';await load();}}catch(err){msg.textContent=err.message||'Não foi possível mover.';save.disabled=false;}};dialog.showModal();
}
function render(){if(!valid())return;toolbar.replaceChildren();crumbs.replaceChildren();list.replaceChildren();
if(admin()){
toolbar.append(button('＋ Nova pasta raiz',()=>createFolder(null)));
if(currentFolder)toolbar.append(button('＋ Nova subpasta',()=>createFolder(currentFolder)));
if(uploadSelect)toolbar.append(button('Enviar arquivo aqui',()=>{uploadSelect.value=currentFolder||'';uploadSelect.scrollIntoView({behavior:'smooth',block:'center'});uploadSelect.focus();}));
}
toolbar.append(button('Atualizar pastas',()=>load()));
crumbs.append(button('Todas as pastas',()=>navigate(null)));
if(currentFolder){const chain=[],seen=new Set();let id=currentFolder;while(id&&!seen.has(id)){seen.add(id);const f=folders.find(x=>x.id===id);if(!f)break;chain.unshift(f);id=f.parent_id;}chain.forEach(f=>{crumbs.append(el('span',' / '),button(f.name,()=>navigate(f.id)));});}
const query=search.value.trim().toLocaleLowerCase('pt-BR');
const matches=text=>text.toLocaleLowerCase('pt-BR').includes(query);
const visibleFolders=folders.filter(f=>query?matches(folderPath(folders,f.id)):f.parent_id===currentFolder);
visibleFolders.forEach(f=>{
const row=el('div',null,'document-row');row.append(button(`📁 ${f.name}`,()=>navigate(f.id)),el('span',query?folderPath(folders,f.id):'Pasta'));
if(admin()){
row.append(button('Renomear pasta',async()=>{const name=prompt('Novo nome da pasta:',f.name);if(name===null)return;const clean=name.trim();if(!clean||clean.length>120||/[\\/]/.test(clean)){status.textContent='Nome inválido.';return;}try{checked(await db.from('document_folders').update({name:clean}).eq('id',f.id));status.textContent='Pasta renomeada.';await load();}catch(e){notify(e);}}));
const hasContent=folders.some(x=>x.parent_id===f.id)||docs.some(d=>d.folder_id===f.id);
const remove=button('Excluir pasta vazia',async()=>{if(!confirm(`Excluir a pasta vazia "${f.name}"?`))return;try{checked(await db.from('document_folders').delete().eq('id',f.id));status.textContent='Pasta excluída.';await load();}catch(e){notify(e);}},'danger');remove.disabled=hasContent;remove.title=hasContent?'Mova os arquivos e remova as subpastas primeiro.':'Excluir pasta vazia';row.append(remove);
}list.append(row);});
const visibleDocs=docs.filter(d=>query?matches(`${d.title} ${folderPath(folders,d.folder_id)} ${d.sector} ${d.operation}`):(d.folder_id||null)===currentFolder);
visibleDocs.forEach(d=>{
const row=el('div',null,'document-row');row.append(el('strong',d.title),el('span',`${d.type} · ${d.sector} · ${d.operation}${query?' · '+(folderPath(folders,d.folder_id)||'Sem pasta'):''}`),button('Visualizar',()=>showDocument(d)));
const star=button(favorites.has(d.id)?'★ Favoritado':'☆ Favoritar',async()=>{star.disabled=true;try{const remove=favorites.has(d.id);checked(remove?await db.from('document_favorites').delete().eq('user_id',owner).eq('document_id',d.id):await db.from('document_favorites').upsert({user_id:owner,document_id:d.id},{onConflict:'user_id,document_id',ignoreDuplicates:true}));if(valid()){if(remove)favorites.delete(d.id);else favorites.add(d.id);status.textContent=remove?'Favorito removido.':'Favorito salvo.';render();}}catch(e){notify(e);star.disabled=false;}});star.setAttribute('aria-pressed',String(favorites.has(d.id)));star.setAttribute('aria-label',`${favorites.has(d.id)?'Remover dos favoritos':'Favoritar'}: ${d.title}`);row.append(star);
if(admin())row.append(button('Mover arquivo',()=>moveDocument(d)));list.append(row);
});
if(!visibleFolders.length&&!visibleDocs.length)list.append(el('p',query?'Nenhum resultado encontrado.':currentFolder?'Esta pasta está vazia.':'Nenhuma pasta ou arquivo sem pasta. Crie uma pasta raiz para começar.','empty'));
}
search.oninput=render;load();return {refresh:load};
}

function settings(){content.replaceChildren();const size=button('Alternar tamanho do texto',()=>{document.body.classList.toggle('large');localStorage.setItem('it-digital-large',String(document.body.classList.contains('large')));});content.append(size);const explorerHost=el('div');content.append(explorerHost);if(!admin()){explorer(explorerHost);content.append(el('p','Seu acesso permite navegar, visualizar e favoritar os documentos.','notice'));return;}
content.append(el('h3','Enviar desenho, vídeo ou IT'));const form=el('form',null,'admin-form');field(form,'Título','title');const folderLabel=el('label','Pasta de destino'),folderSelect=el('select');folderSelect.name='folder_id';folderSelect.setAttribute('aria-label','Pasta de destino para upload');folderOptions(folderSelect,[]);folderLabel.append(folderSelect);form.append(folderLabel);const fileExplorer=explorer(explorerHost,folderSelect);const sector=field(form,'Setor','sector','text',sectors.map(s=>s[0]));const operation=field(form,'Operação','operation','text',['Bobinagem secundária','Bobinagem primária','Montagem','Teste','Acabamento']);sector.onchange=()=>{operation.replaceChildren();(sector.value==='Baixa Tensão'?['Bobinagem secundária','Bobinagem primária','Montagem','Teste','Acabamento']:['Geral']).forEach(v=>{const o=el('option',v);o.value=v;operation.append(o);});};field(form,'Tipo','type','text',['desenho','video','it']);const file=field(form,'Arquivo — PDF, imagem ou vídeo (até 50 MB)','file','file');file.accept='.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm';const submit=el('button','Enviar arquivo','action');form.append(submit);const status=el('p');status.setAttribute('role','status');form.append(status);form.onsubmit=async ev=>{ev.preventDefault();submit.disabled=true;status.textContent='Enviando…';let path;try{const f=file.files[0];if(!f||f.size>50*1024*1024)throw Error('Escolha um arquivo de até 50 MB.');const ext=f.name.split('.').pop().toLowerCase();if(!['pdf','png','jpg','jpeg','webp','mp4','webm'].includes(ext))throw Error('Formato não permitido.');const kind=form.elements.type.value;if((kind==='video')!==['mp4','webm'].includes(ext))throw Error('Selecione Vídeo para MP4/WebM; desenhos e ITs devem ser PDF ou imagem.');path=`${crypto.randomUUID()}.${ext}`;checked(await db.storage.from('brasformer').upload(path,f,{upsert:false}));const result=await db.from('documents').insert({title:form.elements.title.value.trim(),sector:sector.value,operation:operation.value,type:kind,file_path:path,created_by:user.id,folder_id:folderSelect.value||null});if(result.error){await db.storage.from('brasformer').remove([path]);throw result.error;}status.textContent='Arquivo enviado com sucesso.';const savedFolder=folderSelect.value;form.reset();folderSelect.value=savedFolder;sector.onchange();await manageDocuments();await fileExplorer.refresh();}catch(e){status.textContent=e.message||'Falha no envio.';}finally{submit.disabled=false;}};content.append(form);
content.append(el('h3','Conteúdos cadastrados'));const docs=el('div');docs.id='admin-documents';content.append(docs);manageDocuments();
content.append(el('h3','Criar acesso de funcionário'));const uf=el('form',null,'admin-form');field(uf,'E-mail','email','email');const pw=field(uf,'Senha inicial (mínimo 12 caracteres)','password','password');pw.minLength=12;const create=el('button','Criar usuário','action');uf.append(create);const us=el('p');us.setAttribute('role','status');uf.append(us);uf.onsubmit=async ev=>{ev.preventDefault();create.disabled=true;us.textContent='Criando…';try{const data=checked(await db.functions.invoke('itdigital-users',{body:{email:uf.elements.email.value.trim(),password:pw.value}}));if(data?.error)throw Error(data.error);uf.reset();us.textContent='Usuário criado e liberado para visualizar.';await manageUsers();}catch(e){us.textContent='Não foi possível criar o usuário. Confira se a função itdigital-users foi implantada no Supabase. '+(e.message||'');}finally{create.disabled=false;}};content.append(uf);
content.append(el('h3','Liberar ou bloquear usuários'));const users=el('div');users.id='admin-users';content.append(users);manageUsers();}
async function manageDocuments(){const target=document.querySelector('#admin-documents');if(!target)return;try{const docs=checked(await db.from('documents').select('*').order('created_at',{ascending:false}));target.replaceChildren();docs.forEach(d=>{const row=el('div',null,'document-row');row.append(el('strong',d.title),button('Visualizar',()=>showDocument(d)),button('Editar título',async()=>{const title=prompt('Novo título:',d.title);if(!title?.trim())return;try{checked(await db.from('documents').update({title:title.trim()}).eq('id',d.id));manageDocuments();}catch(e){fail(e);}}),button('Excluir',async()=>{if(!confirm(`Excluir ${d.title}?`))return;try{checked(await db.storage.from('brasformer').remove([d.file_path]));checked(await db.from('documents').delete().eq('id',d.id));manageDocuments();}catch(e){fail(e);}},'danger'));target.append(row);});if(!docs.length)target.append(el('p','Nenhum conteúdo cadastrado.'));}catch(e){fail(e);}}
async function manageUsers(){const target=document.querySelector('#admin-users');if(!target)return;try{const users=checked(await db.from('profiles').select('*').order('email'));target.replaceChildren();users.forEach(p=>{const row=el('div',null,'user-row');row.append(el('strong',p.email),el('span',`${p.role==='admin'?'Administrador':'Usuário'} · ${p.active?'Liberado':'Bloqueado'}`));if(p.id!==user.id)row.append(button(p.active?'Bloquear':'Liberar',async()=>{try{checked(await db.from('profiles').update({active:!p.active}).eq('id',p.id));manageUsers();}catch(e){fail(e);}}));target.append(row);});}catch(e){fail(e);}}
async function refresh(){try{const result=await db.auth.getUser();if(result.error||!result.data.user){lock('Entre com seu e-mail e senha.');return;}user=result.data.user;profile=checked(await db.from('profiles').select('*').eq('id',user.id).single());if(!profile.active){lock('Seu acesso ainda não foi liberado pelo administrador.',true);return;}login.hidden=true;main.hidden=false;bar.hidden=false;bar.replaceChildren(el('span',`${user.email} · ${admin()?'Administrador':'Usuário'}`),button('Sair',async()=>{await db.auth.signOut();lock('Você saiu do sistema.');}));openScreen(decodeURIComponent(location.hash.slice(1))||'home',false);}catch(e){lock('Não foi possível validar seu acesso: '+(e.message||'Verifique a conexão.'),true);}}
function lock(text,canExit=false){profile=null;user=null;viewVersion++;main.hidden=true;content.replaceChildren();login.hidden=false;message.textContent=text;bar.hidden=!canExit;bar.replaceChildren();if(canExit)bar.append(button('Sair',async()=>{await db.auth.signOut();lock('Entre com seu e-mail e senha.');}));document.querySelectorAll('dialog').forEach(d=>d.close());}
document.querySelector('#login-form').onsubmit=async ev=>{ev.preventDefault();const f=ev.target,b=f.querySelector('button');b.disabled=true;message.textContent='Entrando…';try{checked(await db.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value}));f.elements.password.value='';await refresh();}catch(e){message.textContent='Não foi possível entrar. Confira o e-mail, a senha e sua conexão.';}finally{b.disabled=false;}};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')lock('Entre com seu e-mail e senha.');});refresh();
})();
