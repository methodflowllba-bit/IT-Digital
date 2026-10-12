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
function productFolderIds(folders){
const ids=new Set(folders.filter(f=>f.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').includes('produto')).map(f=>f.id));
let changed=true;while(changed){changed=false;folders.forEach(f=>{if(ids.has(f.parent_id)&&!ids.has(f.id)){ids.add(f.id);changed=true;}});}return ids;
}
async function productsScreen(version){
content.replaceChildren();const status=el('p');status.setAttribute('role','status');status.textContent='Carregando produtos…';content.append(status);
const owner=user.id;
try{
const results=await Promise.all([db.from('document_folders').select('*').order('name'),db.from('documents').select('*').is('parent_it_id',null).order('title'),db.from('document_favorites').select('document_id').eq('user_id',owner)]);
const folders=checked(results[0]),docs=checked(results[1]),favorites=new Set(checked(results[2]).map(f=>f.document_id)),ids=productFolderIds(folders);
if(version!==viewVersion||user?.id!==owner)return;
let currentFolder=null;const crumbs=el('nav',null,'explorer-breadcrumbs'),list=el('div',null,'explorer-items explorer-icons');content.append(crumbs,list);status.textContent='';
const navigate=id=>{currentFolder=id;status.textContent='';render();};
const render=()=>{
if(version!==viewVersion||user?.id!==owner)return;crumbs.replaceChildren();list.replaceChildren();crumbs.append(button('Produtos',()=>navigate(null)));
if(currentFolder){const chain=[],seen=new Set();let id=currentFolder;while(id&&ids.has(id)&&!seen.has(id)){seen.add(id);const f=folders.find(x=>x.id===id);if(!f)break;chain.unshift(f);id=f.parent_id;}chain.forEach(f=>crumbs.append(el('span',' / '),button(f.name,()=>navigate(f.id))));}
const shownFolders=folders.filter(f=>ids.has(f.id)&&(currentFolder?f.parent_id===currentFolder:!ids.has(f.parent_id)));
shownFolders.forEach(f=>{const row=el('div',null,'explorer-item folder-item'),open=button('',()=>navigate(f.id),'explorer-open');open.setAttribute('aria-label','Abrir pasta de produtos: '+f.name);open.append(el('span','📁','file-icon'),el('strong',f.name));row.append(open);list.append(row);});
const shownDocs=currentFolder?docs.filter(d=>d.folder_id===currentFolder):[];
shownDocs.forEach(d=>{const row=el('div',null,'document-row');row.append(el('strong',d.title),button('Visualizar',()=>showDocument(d)));const star=button(favorites.has(d.id)?'★ Favoritado':'☆ Favoritar',async()=>{star.disabled=true;try{const remove=favorites.has(d.id);checked(remove?await db.from('document_favorites').delete().eq('user_id',owner).eq('document_id',d.id):await db.from('document_favorites').upsert({user_id:owner,document_id:d.id},{onConflict:'user_id,document_id',ignoreDuplicates:true}));if(version!==viewVersion||user?.id!==owner)return;if(remove)favorites.delete(d.id);else favorites.add(d.id);status.textContent=remove?'Favorito removido.':'Favorito salvo.';render();}catch(e){status.textContent=e.message;star.disabled=false;}});star.setAttribute('aria-pressed',String(favorites.has(d.id)));row.append(star);list.append(row);});
if(!shownFolders.length&&!shownDocs.length)list.append(el('p',currentFolder?'Esta pasta de produtos está vazia.':'Crie no explorador uma pasta com “produto” no nome para aparecer aqui.','empty'));
};render();
}catch(e){if(version===viewVersion)status.textContent='Não foi possível carregar Produtos. '+e.message;}
}

let stopQrCamera=null;
const qrScripts=new Map();
function qrDependency(name,url){if(window[name])return Promise.resolve();if(qrScripts.has(name))return qrScripts.get(name);const promise=new Promise((resolve,reject)=>{const script=el('script');script.src=url;script.onload=()=>window[name]?resolve():reject(Error('Biblioteca QR indisponível.'));script.onerror=()=>{qrScripts.delete(name);script.remove();reject(Error('Não foi possível carregar o leitor de QR Code. Confira a conexão.'));};document.head.append(script);});qrScripts.set(name,promise);return promise;}
function documentQrUrl(doc){const link=new URL('https://methodflowllba-bit.github.io/IT-Digital/');const info=new URLSearchParams({titulo:doc.title,setor:doc.sector,operacao:doc.operation});link.hash='documento/'+doc.id+'?'+info.toString();return link.href;}
function qrDocumentId(value){
const text=value.trim();if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text))return text;
const url=new URL(text);if(url.origin!=='https://methodflowllba-bit.github.io'||!['/IT-Digital/','/IT-Digital'].includes(url.pathname))throw Error('Este QR Code não pertence ao IT Digital.');
const match=url.hash.match(/^#documento\/([0-9a-f-]{36})(?:\?|$)/i);if(!match||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match[1]))throw Error('QR Code de documento inválido.');return match[1];
}
async function showQrCode(doc){if(!admin())return;try{
await qrDependency('qrcode','https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
const link=documentQrUrl(doc),code=window.qrcode(0,'M');code.addData(link);code.make();
const count=code.getModuleCount(),cell=8,margin=4,size=(count+margin*2)*cell;
const canvas=el('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.fillStyle='#000';for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(code.isDark(r,c))ctx.fillRect((c+margin)*cell,(r+margin)*cell,cell,cell);
canvas.style.width='min(100%,360px)';canvas.style.height='auto';canvas.setAttribute('aria-label','QR Code para '+doc.title);
const dialog=el('dialog',null,'it-viewer-dialog');dialog.append(el('h3','QR Code do documento'),el('strong',doc.title),el('p',`${doc.sector} · ${doc.operation}`),canvas,el('p','Ao ler, será solicitado login se necessário.'));
const download=button('↓ Baixar etiqueta QR',()=>{const label=el('canvas');label.width=Math.max(size,800);label.height=size+150;const g=label.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,label.width,label.height);g.drawImage(canvas,(label.width-size)/2,0);g.fillStyle='#183f59';g.font='bold 20px sans-serif';const lines=[doc.title,`Setor: ${doc.sector}`,`Operação: ${doc.operation}`];lines.forEach((line,i)=>{g.fillText(line,20,size+32+i*32,label.width-40);});const a=el('a');a.download=(doc.title||'documento').replace(/[\\/:*?"<>|]/g,'_')+'-QR.png';a.href=label.toDataURL('image/png');document.body.append(a);a.click();a.remove();});dialog.append(download,button('Fechar',()=>dialog.close()));dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}catch(e){fail(e);}}
async function openQrDocument(id,version){content.replaceChildren();heading.textContent='Documento pelo QR Code';try{const doc=checked(await db.from('documents').select('*').eq('id',id).single());if(version!==viewVersion||!profile?.active)return;if(doc.parent_it_id)throw Error('Leia o QR Code da IT que contém este vídeo.');content.append(el('h3',doc.title),el('p',`${doc.sector} · ${doc.operation}`),button('Visualizar documento',()=>showDocument(doc)));await showDocument(doc);}catch(e){if(version===viewVersion)fail(Error('Documento não encontrado ou acesso indisponível. '+e.message));}}
function qrCameraScreen(version){
content.replaceChildren();heading.textContent='Ler QR Code';const status=el('p');status.setAttribute('role','status');const video=el('video');video.muted=true;video.playsInline=true;video.autoplay=true;video.style.width='100%';video.style.maxWidth='600px';video.style.borderRadius='12px';const canvas=el('canvas');let stream=null,timer=null,closed=false,starting=false;
function stop(){closed=true;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());video.pause();video.srcObject=null;}
stopQrCamera=stop;
async function accept(text){try{const id=qrDocumentId(text);stop();openScreen('documento/'+id);}catch(e){status.textContent=e.message;}}
async function scan(){if(closed||version!==viewVersion)return;try{if(video.readyState>=2&&video.videoWidth){const scale=Math.min(1,640/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const result=window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});if(result){const id=qrDocumentId(result.data);stop();openScreen('documento/'+id);return;}}}catch(e){status.textContent=e.message;}timer=setTimeout(scan,160);}
async function start(){if(starting||stream)return;starting=true;closed=false;status.textContent='Ativando câmera…';try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Câmera indisponível neste navegador. Abra o site por HTTPS.');await qrDependency('jsQR','https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});if(closed||version!==viewVersion){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;video.srcObject=stream;await video.play();status.textContent='Aponte a câmera para a etiqueta QR da IT ou desenho.';scan();}catch(e){stream?.getTracks().forEach(t=>t.stop());stream=null;status.textContent=e.name==='NotAllowedError'?'Permita a câmera nas configurações do navegador e clique em Ativar câmera.':e.message;}finally{starting=false;}}
content.append(el('p','Permita o acesso à câmera para ler a etiqueta da IT ou desenho.'),video,status,button('Ativar câmera',start),button('Desligar câmera',()=>{stop();stream=null;status.textContent='Câmera desligada.';}));
const form=el('form',null,'admin-form'),input=field(form,'Ou cole o link do QR Code / código do documento','qr','text'),submit=el('button','Abrir documento','action');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();accept(input.value);};content.append(form);start();
}

openScreen=function(screen,push=true){stopQrCamera?.();stopQrCamera=null;original(screen,push);const version=++viewVersion;if(!profile?.active)return;if(screen==='qr'){qrCameraScreen(version);return;}if(screen.startsWith('documento/')){const id=screen.slice(10).split('?')[0];openQrDocument(id,version);return;}if(screen==='settings'){settings();return;}if(screen==='products'){productsScreen(version);return;}
if(screen.startsWith('operacao/')||(screen.startsWith('setor/')&&screen!=='setor/Baixa Tensão')||screen==='search'||screen==='mine'){
content.replaceChildren();
const filters=el('div',null,'admin-form');
let input,sectorFilter,typeFilter,operationFilter;
if(screen==='search'||screen==='mine'){
input=el('input');input.placeholder='Buscar pelo título, setor ou operação';input.setAttribute('aria-label','Buscar documentos');filters.append(input);
}
if(screen==='mine'||screen==='search'){
if(screen==='mine')heading.textContent='Meus favoritos';
sectorFilter=field(filters,'Setor','sector','text',['Todos os setores']);
operationFilter=field(filters,'Operação','operation','text',['Todas as operações']);
typeFilter=field(filters,'Tipo','type','text',['Todos os tipos','it','desenho','video']);
}
content.append(filters);
const status=el('p');status.setAttribute('role','status');content.append(status);
const list=el('div');content.append(list);
(async()=>{try{
const owner=user.id;
let q=db.from('documents').select('*').is('parent_it_id',null).order('created_at',{ascending:false});
if(screen.startsWith('operacao/'))q=q.eq('sector','Baixa Tensão').eq('operation',screen.slice(9));
else if(screen.startsWith('setor/'))q=q.eq('sector',screen.slice(6));
const results=await Promise.all([q,db.from('document_favorites').select('document_id').eq('user_id',owner),db.from('document_folders').select('*')]);
const productIds=productFolderIds(checked(results[2]));
const docs=checked(results[0]).filter(d=>screen==='mine'||!productIds.has(d.folder_id));
const favorites=new Set(checked(results[1]).map(f=>f.document_id));
if(version!==viewVersion||user?.id!==owner)return;
if(screen==='mine'||screen==='search'){
const addOptions=(target,values)=>values.forEach(v=>{const o=el('option',v);o.value=v;target.append(o);});
const favoriteDocs=screen==='mine'?docs.filter(d=>favorites.has(d.id)):docs;
addOptions(sectorFilter,[...new Set(favoriteDocs.map(d=>d.sector))].sort());
addOptions(operationFilter,[...new Set(favoriteDocs.map(d=>d.operation))].sort());
}
const render=()=>{
if(version!==viewVersion||user?.id!==owner)return;
list.replaceChildren();
const textQuery=input?.value.trim()||'';
const hasFilters=textQuery||(sectorFilter&&sectorFilter.value!=='Todos os setores')||(operationFilter&&operationFilter.value!=='Todas as operações')||(typeFilter&&typeFilter.value!=='Todos os tipos');
if(screen==='search'&&!hasFilters){status.textContent='';return;}
const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const terms=normalize(textQuery).split(/\s+/).filter(Boolean);
const filtered=docs.filter(d=>(screen!=='mine'||favorites.has(d.id))&&
(!input||terms.every(term=>normalize(`${d.title} ${d.sector} ${d.operation}`).includes(term)))&&
(!sectorFilter||sectorFilter.value==='Todos os setores'||d.sector===sectorFilter.value)&&
(!operationFilter||operationFilter.value==='Todas as operações'||d.operation===operationFilter.value)&&
(!typeFilter||typeFilter.value==='Todos os tipos'||d.type===typeFilter.value));
if(screen==='search')status.textContent=`${filtered.length} documento(s) encontrado(s).`;
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
async function deleteDocument(doc){
const children=checked(await db.from('documents').select('*').eq('parent_it_id',doc.id));
checked(await db.from('documents').delete().eq('id',doc.id));
const paths=[doc.file_path,...children.map(v=>v.file_path)];
const removal=await db.storage.from('brasformer').remove(paths);
if(removal.error)throw Error('O item saiu do catálogo, mas a limpeza do armazenamento falhou. '+removal.error.message);
}
async function copyItem(item,destination){
const newFolders=[],newDocs=[],newPaths=[];
try{
const allFolders=checked(await db.from('document_folders').select('*'));
if(item.kind==='folder'){
let id=destination;const seen=new Set();while(id&&!seen.has(id)){if(id===item.data.id)throw Error('Escolha um destino fora da pasta que está copiando.');seen.add(id);id=allFolders.find(f=>f.id===id)?.parent_id;}
}
async function duplicateDoc(doc,folder,parent=null){
const suffix=doc.file_path.split('.').pop(),path=`${crypto.randomUUID()}.${suffix}`;
checked(await db.storage.from('brasformer').copy(doc.file_path,path));newPaths.push(path);
const payload={title:parent?doc.title:doc.title+' (cópia)',sector:doc.sector,operation:doc.operation,type:doc.type,file_path:path,folder_id:folder,created_by:user.id,parent_it_id:parent};
const saved=checked(await db.from('documents').insert(payload).select().single());newDocs.push(saved.id);
if(doc.type==='it'){
const videos=checked(await db.from('documents').select('*').eq('parent_it_id',doc.id));
for(const v of videos)await duplicateDoc(v,folder,saved.id);
}return saved.id;
}
async function duplicateFolder(source,parent,isTop){
let name=source.name;if(isTop){const existing=allFolders.filter(f=>f.parent_id===parent).map(f=>f.name.toLocaleLowerCase('pt-BR'));let n=1;name=source.name+' (cópia)';while(existing.includes(name.toLocaleLowerCase('pt-BR')))name=source.name+` (cópia ${++n})`;}
const saved=checked(await db.from('document_folders').insert({name,parent_id:parent}).select().single());newFolders.push(saved.id);
const contents=checked(await db.from('documents').select('*').eq('folder_id',source.id).is('parent_it_id',null));
for(const d of contents)await duplicateDoc(d,saved.id);
for(const child of allFolders.filter(f=>f.parent_id===source.id))await duplicateFolder(child,saved.id,false);
}
if(item.kind==='folder')await duplicateFolder(item.data,destination,true);else await duplicateDoc(item.data,destination);
}catch(e){
const cleanup=[];for(const id of newDocs.reverse()){const r=await db.from('documents').delete().eq('id',id);if(r.error)cleanup.push(r.error.message);}
for(const id of newFolders.reverse()){const r=await db.from('document_folders').delete().eq('id',id);if(r.error)cleanup.push(r.error.message);}
if(newPaths.length){const r=await db.storage.from('brasformer').remove(newPaths);if(r.error)cleanup.push(r.error.message);}
if(cleanup.length)throw Error(e.message+' Algumas cópias incompletas precisam ser removidas pelo administrador.');throw e;
}
}
function videoEditor(doc,afterUpload){
const dialog=el('dialog',null,'it-viewer-dialog'),form=el('div',null,'admin-form'),message=el('p'),output=el('div');message.setAttribute('role','status');
const heading=el('div',null,'it-viewer-header');heading.append(el('h3','✂ Preparar vídeo para a IT'),button('Fechar',()=>{if(busy&&!cancelProcessing){message.textContent='Aguarde o envio das partes terminar antes de fechar.';return;}dialog.close();}));dialog.append(heading,el('p','Escolha um vídeo grande, defina o trecho e gere partes menores que 50 MB. O processamento ocorre no seu computador e leva aproximadamente o tempo do trecho. Mantenha esta aba aberta e visível.','notice'),form);
const sourceLabel=el('label','Vídeo original (pode ter mais de 50 MB)'),source=el('input');source.type='file';source.accept='video/*';sourceLabel.append(source);form.append(sourceLabel);
const preview=el('video');preview.controls=true;preview.playsInline=true;preview.preload='metadata';preview.style.width='100%';form.append(preview);
const start=field(form,'Início do trecho (segundos)','start','number'),end=field(form,'Fim do trecho (segundos)','end','number');start.min='0';start.step=end.step='0.1';end.min='0';start.value='0';
form.append(button('Definir início na posição atual',()=>{start.value=preview.currentTime.toFixed(1);}),button('Definir fim na posição atual',()=>{end.value=preview.currentTime.toFixed(1);}));
const quality=field(form,'Qualidade / resolução','quality','text',['720p — qualidade padrão','480p — arquivo menor','360p — mais compacto']);
const limit=field(form,'Tamanho máximo por parte (MB, até 48)','limit','number');limit.min='5';limit.max='48';limit.value='45';
let sourceUrl=null,parts=[],partUrls=[],busy=false,closed=false,cancelProcessing=null;
const generate=button('✂ Gerar partes',process),cancel=button('Cancelar processamento',()=>cancelProcessing?.());cancel.hidden=true;form.append(generate,cancel);
const upload=button('Enviar partes para esta IT',uploadParts);upload.disabled=true;dialog.append(message,output,upload);document.body.append(dialog);dialog.showModal();
function clearParts(){partUrls.forEach(u=>URL.revokeObjectURL(u));partUrls=[];parts=[];output.replaceChildren();upload.disabled=true;}
source.onchange=()=>{if(busy)return;clearParts();if(sourceUrl)URL.revokeObjectURL(sourceUrl);const file=source.files[0];if(!file)return;sourceUrl=URL.createObjectURL(file);preview.src=sourceUrl;message.textContent=`Original: ${(file.size/1024/1024).toFixed(1)} MB. Escolha o trecho e a qualidade.`;};
preview.onloadedmetadata=()=>{if(Number.isFinite(preview.duration)){start.value='0';end.value=preview.duration.toFixed(1);}else message.textContent='Não foi possível determinar a duração. Escolha outro vídeo.';};
function setBusy(value){busy=value;source.disabled=generate.disabled=quality.disabled=start.disabled=end.disabled=limit.disabled=value;cancel.hidden=!value;upload.disabled=value||!parts.length;}
function displayParts(){output.replaceChildren();parts.forEach((p,i)=>{const row=el('div',null,'document-row');row.append(el('strong',`Parte ${i+1} · ${(p.blob.size/1024/1024).toFixed(1)} MB · ${p.start.toFixed(1)}–${p.end.toFixed(1)} s`));const url=URL.createObjectURL(p.blob);partUrls.push(url);row.append(button('▶ Conferir',()=>{const player=el('video');player.controls=true;player.src=url;player.style.width='100%';row.append(player);player.play().catch(()=>{});}),button('↓ Baixar parte',()=>{const a=el('a');a.href=url;a.download=`video-parte-${String(i+1).padStart(2,'0')}.${p.ext}`;document.body.append(a);a.click();a.remove();}));output.append(row);});}
async function process(){
if(!sourceUrl||!source.files[0]){message.textContent='Escolha um vídeo primeiro.';return;}
const a=Number(start.value),b=Number(end.value),max=Number(limit.value);if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a||b>preview.duration+.15||max<5||max>48){message.textContent='Confira o início, o fim e o limite entre 5 e 48 MB.';return;}
if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){message.textContent='Este navegador não suporta o editor. Use Chrome ou Edge atualizado no computador.';return;}
const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){message.textContent='Não há formato compatível para gerar o vídeo neste navegador.';return;}
clearParts();setBusy(true);preview.pause();const result=[];
const settings=quality.value.startsWith('720')?{height:720,bitrate:1500000}:quality.value.startsWith('480')?{height:480,bitrate:800000}:{height:360,bitrate:500000};
try{
await transcode(a,b,settings,mime,max,result);if(closed)return;parts=result;displayParts();message.textContent=`${parts.length} parte(s) prontas. Confira o vídeo e o áudio antes de enviar.`;
}catch(e){if(!closed){clearParts();message.textContent=e.message||'Não foi possível preparar o vídeo.';}}
finally{cancelProcessing=null;if(!closed)setBusy(false);}
}
async function transcode(a,b,settings,mime,max,result){
const video=el('video');video.playsInline=true;video.preload='auto';video.src=sourceUrl;video.style.width='1px';video.style.height='1px';video.style.position='absolute';video.style.opacity='0';dialog.append(video);
let audio=null,stream=null,raf=null,recorder=null,cancelled=false,resolveFinished,rejectFinished,cutting=false,partStart=a,lastTime=a;
const finished=new Promise((resolve,reject)=>{resolveFinished=resolve;rejectFinished=reject;});finished.catch(()=>{});
const stop=()=>{video.pause();if(recorder&&recorder.state!=='inactive')recorder.stop();};
cancelProcessing=()=>{cancelled=true;stop();rejectFinished(Error('Processamento cancelado. Nenhuma parte foi enviada.'));};
const visibility=()=>{if(document.hidden)cancelProcessing?.();};document.addEventListener('visibilitychange',visibility);
try{
await Promise.race([new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('O navegador não conseguiu abrir este vídeo. Converta o original para MP4 e tente novamente.'));video.load();}),finished]);if(cancelled)throw Error('Processamento cancelado.');video.onerror=()=>rejectFinished(Error('Falha ao reproduzir o vídeo original.'));
const AudioClass=window.AudioContext||window.webkitAudioContext;if(!AudioClass)throw Error('Este navegador não suporta o processamento de áudio. Use Chrome ou Edge no computador.');
audio=new AudioClass();await audio.resume();const input=audio.createMediaElementSource(video),destination=audio.createMediaStreamDestination(),silence=audio.createGain();silence.gain.value=0;input.connect(destination);input.connect(silence);silence.connect(audio.destination);
const canvas=el('canvas');const height=Math.min(settings.height,video.videoHeight),ratio=video.videoWidth/video.videoHeight;if(!height||!Number.isFinite(ratio))throw Error('Dimensões do vídeo inválidas.');canvas.height=Math.max(2,Math.round(height/2)*2);canvas.width=Math.max(2,Math.round(canvas.height*ratio/2)*2);const ctx=canvas.getContext('2d');stream=canvas.captureStream(25);destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
if(a>0){await new Promise(resolve=>{video.onseeked=()=>{video.onseeked=null;resolve();};video.currentTime=a;});}
const hardLimit=50*1024*1024,target=(max-2)*1024*1024;
function begin(){let chunks=[],bytes=0;cutting=false;partStart=video.currentTime;
recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:settings.bitrate,audioBitsPerSecond:64000});
recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;}if(bytes>=target&&!cutting&&recorder.state==='recording'){cutting=true;stop();}};
recorder.onerror=e=>rejectFinished(Error('Falha na conversão: '+(e.error?.message||'tente outra qualidade.')));
recorder.onstop=()=>{if(cancelled)return;const blob=new Blob(chunks,{type:mime});if(blob.size>max*1024*1024||blob.size>hardLimit){cancelled=true;rejectFinished(Error('Uma parte ultrapassou o limite. Reduza a qualidade e gere novamente. Nenhuma parte foi enviada.'));return;}const partEnd=Math.min(video.currentTime,b);if(blob.size)result.push({blob,ext:mime.startsWith('video/mp4')?'mp4':'webm',start:partStart,end:partEnd,uploaded:false});if(partEnd>=b-.08||video.ended){resolveFinished();return;}begin();video.play().catch(rejectFinished);};recorder.start(500);
}
function frame(){if(cancelled)return;ctx.drawImage(video,0,0,canvas.width,canvas.height);lastTime=video.currentTime;message.textContent=`Preparando: ${Math.min(100,Math.round((lastTime-a)/(b-a)*100))}% · ${result.length} parte(s) concluídas`;if(lastTime>=b||video.ended){if(!cutting){cutting=true;stop();}return;}raf=requestAnimationFrame(frame);}
ctx.drawImage(video,0,0,canvas.width,canvas.height);begin();video.onended=()=>{if(!cutting){cutting=true;stop();}};await video.play();raf=requestAnimationFrame(frame);await finished;
}finally{cancelled=true;cancelAnimationFrame(raf);video.pause();if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());await audio?.close();video.removeAttribute('src');video.load();video.remove();document.removeEventListener('visibilitychange',visibility);}
}
async function uploadParts(){if(busy||!parts.length)return;setBusy(true);cancel.hidden=true;try{for(let i=0;i<parts.length;i++){const p=parts[i];if(p.uploaded)continue;if(p.blob.size>50*1024*1024)throw Error('Parte acima do limite. Gere novamente.');message.textContent=`Enviando parte ${i+1} de ${parts.length}…`;const path=`${crypto.randomUUID()}.${p.ext}`;checked(await db.storage.from('brasformer').upload(path,p.blob,{contentType:p.blob.type.split(';')[0],upsert:false}));const r=await db.from('documents').insert({title:`${doc.title} — Parte ${String(i+1).padStart(2,'0')}`,sector:doc.sector,operation:doc.operation,type:'video',file_path:path,folder_id:doc.folder_id||null,parent_it_id:doc.id,created_by:user.id});if(r.error){await db.storage.from('brasformer').remove([path]);throw r.error;}p.uploaded=true;}
message.textContent='Todas as partes foram vinculadas à IT.';await afterUpload();}catch(e){message.textContent='Falha no envio: '+e.message+' Clique novamente para enviar somente as partes restantes.';}finally{if(!closed){setBusy(false);upload.disabled=parts.every(p=>p.uploaded);}}}
dialog.addEventListener('cancel',e=>{if(busy&&!cancelProcessing)e.preventDefault();});
dialog.onclose=()=>{if(busy&&cancelProcessing)cancelProcessing();closed=true;preview.pause();if(sourceUrl)URL.revokeObjectURL(sourceUrl);partUrls.forEach(u=>URL.revokeObjectURL(u));dialog.remove();};
}

function itVideoTools(dialog,doc){
const area=el('section');area.append(el('h4','Vídeo da operação'));const videos=el('div'),msg=el('p');msg.setAttribute('role','status');area.append(videos,msg);dialog.append(area);
async function reload(){try{const items=checked(await db.from('documents').select('*').eq('parent_it_id',doc.id).order('created_at'));videos.replaceChildren();if(!items.length)videos.append(el('p','Nenhum vídeo vinculado a esta IT.'));items.forEach(v=>{const row=el('div',null,'document-row');row.append(button('▶ Assistir vídeo da operação',()=>showDocument(v)),el('span',v.title));if(admin())row.append(button('Excluir vídeo',async()=>{if(!confirm('Excluir este vídeo da IT?'))return;try{await deleteDocument(v);await reload();}catch(e){msg.textContent=e.message;}},'danger'));videos.append(row);});}catch(e){msg.textContent=e.message;}}
if(admin()){
const form=el('form',null,'admin-form'),label=el('label','Adicionar vídeo a esta IT (MP4/WebM, até 50 MB)'),file=el('input');file.type='file';file.accept='.mp4,.webm';file.required=true;label.append(file);const submit=el('button','Enviar vídeo para esta IT','action');submit.type='submit';form.append(label,submit);area.append(form);
form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;msg.textContent='Enviando vídeo…';let path;try{const f=file.files[0],ext=f?.name.split('.').pop().toLowerCase();if(!f||!['mp4','webm'].includes(ext)||f.size>50*1024*1024)throw Error('Escolha um vídeo MP4/WebM de até 50 MB.');path=`${crypto.randomUUID()}.${ext}`;checked(await db.storage.from('brasformer').upload(path,f,{upsert:false}));const r=await db.from('documents').insert({title:f.name,sector:doc.sector,operation:doc.operation,type:'video',file_path:path,folder_id:doc.folder_id||null,parent_it_id:doc.id,created_by:user.id});if(r.error){await db.storage.from('brasformer').remove([path]);throw r.error;}file.value='';msg.textContent='Vídeo vinculado à IT.';await reload();}catch(err){msg.textContent=err.message;}finally{submit.disabled=false;}};
area.append(button('Vincular vídeo já cadastrado',async()=>{try{const available=checked(await db.from('documents').select('*').eq('type','video').is('parent_it_id',null).order('title'));if(!available.length){msg.textContent='Não há vídeos separados disponíveis.';return;}const chooser=el('div',null,'admin-form'),select=el('select');select.setAttribute('aria-label','Vídeo já cadastrado');available.forEach(v=>{const o=el('option',v.title);o.value=v.id;select.append(o);});chooser.append(select,button('Vincular à IT',async()=>{try{checked(await db.from('documents').update({parent_it_id:doc.id,folder_id:doc.folder_id||null,sector:doc.sector,operation:doc.operation}).eq('id',select.value));chooser.remove();msg.textContent='Vídeo vinculado. Ele ficará dentro da IT.';await reload();}catch(e){msg.textContent=e.message;}}),button('Cancelar',()=>chooser.remove()));area.append(chooser);}catch(e){msg.textContent=e.message;}}));
}if(admin())area.append(button('✂ Reduzir / dividir vídeo grande',()=>videoEditor(doc,reload)));reload();
}

let pdfLibraryPromise;
function loadPdfLibrary(){
if(!pdfLibraryPromise)pdfLibraryPromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs';return lib;}).catch(e=>{pdfLibraryPromise=null;throw e;});
return pdfLibraryPromise;
}
function pdfMobileViewer(host,url,dialog){
const controls=el('div',null,'pdf-controls'),pages=el('div',null,'pdf-pages'),status=el('p');status.setAttribute('role','status');status.textContent='Carregando páginas da IT…';
const select=el('select');select.setAttribute('aria-label','Página da IT');select.disabled=true;
let pdf=null,task=null,observer=null,closed=false,currentPage=1,busy=Promise.resolve();const entries=[],rendered=new Map();
const prev=button('← Anterior',()=>jump(currentPage-1)),next=button('Próxima →',()=>jump(currentPage+1));prev.disabled=true;next.disabled=true;
controls.append(prev,select,next);host.append(controls,status,pages);
function jump(n){if(!pdf)return;currentPage=Math.max(1,Math.min(pdf.numPages,n));select.value=String(currentPage);prev.disabled=currentPage===1;next.disabled=currentPage===pdf.numPages;entries[currentPage-1].scrollIntoView({behavior:'smooth',block:'start'});enqueue(currentPage);}
select.onchange=()=>jump(Number(select.value));
function trackScroll(){if(!pdf||closed)return;const top=dialog.getBoundingClientRect().top+80;const visible=entries.find(p=>p.getBoundingClientRect().bottom>top);if(!visible)return;currentPage=Number(visible.dataset.page);select.value=String(currentPage);prev.disabled=currentPage===1;next.disabled=currentPage===pdf.numPages;enqueue(currentPage);}
dialog.addEventListener('scroll',trackScroll,{passive:true});
async function renderPage(n){if(closed||rendered.has(n))return;const card=entries[n-1];if(!card)return;const page=await pdf.getPage(n);if(closed)return;
const base=page.getViewport({scale:1}),width=Math.max(200,Math.min(host.clientWidth||320,1100)-20),scale=width/base.width,dpr=Math.min(window.devicePixelRatio||1,2);const viewport=page.getViewport({scale:scale*dpr});const canvas=el('canvas');canvas.setAttribute('aria-label',`Página ${n} da IT`);canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width='100%';canvas.style.height='auto';
card.replaceChildren(el('p',`Página ${n} de ${pdf.numPages}`,'pdf-page-caption'),canvas);const renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});task=renderTask;await renderTask.promise;task=null;if(closed)return;rendered.set(n,canvas);page.cleanup();
// Mantém no máximo seis páginas desenhadas para limitar memória no celular.
if(rendered.size>6){const candidates=[...rendered.keys()].filter(k=>Math.abs(k-currentPage)>2).sort((a,b)=>Math.abs(b-currentPage)-Math.abs(a-currentPage));while(rendered.size>6&&candidates.length){const k=candidates.shift(),old=rendered.get(k);old.width=1;old.height=1;entries[k-1].replaceChildren(el('p',`Página ${k} de ${pdf.numPages}`,'pdf-page-caption'));rendered.delete(k);}}
}
function enqueue(n){busy=busy.then(()=>closed?null:renderPage(n)).catch(e=>{if(!closed)status.textContent='Não foi possível desenhar a página. '+e.message;});}
(async()=>{try{const lib=await loadPdfLibrary();if(closed)return;const loading=lib.getDocument({url});task=loading;pdf=await loading.promise;task=null;if(closed){pdf.destroy();return;}
const first=await pdf.getPage(1),base=first.getViewport({scale:1}),height=(Math.max(200,Math.min(host.clientWidth||320,1100)-20)/base.width)*base.height;
for(let n=1;n<=pdf.numPages;n++){const option=el('option',`Página ${n} / ${pdf.numPages}`);option.value=String(n);select.append(option);const card=el('section',null,'pdf-page');card.style.minHeight=Math.ceil(height)+'px';card.dataset.page=String(n);card.append(el('p',`Página ${n} de ${pdf.numPages}`,'pdf-page-caption'));entries.push(card);pages.append(card);}
select.disabled=false;next.disabled=pdf.numPages===1;status.textContent='Role para ver as próximas páginas ou use os botões acima.';
if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(events=>{for(const e of events){if(!e.isIntersecting)continue;const n=Number(e.target.dataset.page);enqueue(n);}}, {root:dialog,rootMargin:'400px 0px',threshold:0});entries.forEach(p=>observer.observe(p));}
enqueue(1);

}catch(e){if(!closed)status.textContent='Não foi possível abrir o PDF. Verifique a conexão e tente novamente. '+e.message;}})();
return ()=>{closed=true;dialog.removeEventListener('scroll',trackScroll);observer?.disconnect();task?.cancel?.();task?.destroy?.();pdf?.destroy();rendered.forEach(c=>{c.width=1;c.height=1;});};
}

async function showDocument(doc){try{
const access=checked(await db.from('profiles').select('active').eq('id',user.id).single());if(!access.active)throw Error('Seu acesso está bloqueado.');
const {signedUrl}=checked(await db.storage.from('brasformer').createSignedUrl(doc.file_path,600));
const dialog=el('dialog',null,'it-viewer-dialog'),head=el('div',null,'it-viewer-header');head.append(el('h3',doc.title),button('Fechar',()=>dialog.close()));dialog.append(head);
let viewer,cleanup;
if(doc.type==='video'){viewer=el('video');viewer.controls=true;viewer.setAttribute('controlsList','nodownload');viewer.disablePictureInPicture=true;viewer.src=signedUrl;dialog.append(viewer);}
else if(/\.(png|jpe?g|webp)$/i.test(doc.file_path)){viewer=el('img');viewer.alt=doc.title;viewer.src=signedUrl;dialog.append(viewer);}
else{viewer=el('div',null,'pdf-mobile-viewer');dialog.append(viewer);}
if(doc.type==='it')itVideoTools(dialog,doc);
document.body.append(dialog);dialog.showModal();
if(viewer.className==='pdf-mobile-viewer')cleanup=pdfMobileViewer(viewer,signedUrl,dialog);
dialog.onclose=()=>{cleanup?.();if(viewer.tagName==='VIDEO')viewer.pause();viewer.removeAttribute('src');dialog.remove();};
}catch(e){fail(e);}}

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
let folders=[],docs=[],favorites=new Set(),currentFolder=null,loadVersion=0,viewMode='icons',selected=null,clipboard=null,busy=false;
const valid=()=>version===viewVersion&&user?.id===owner;
const launcher=button('📂 Abrir explorador de arquivos',()=>{box.hidden=!box.hidden;launcher.setAttribute('aria-expanded',String(!box.hidden));});launcher.className='explorer-launch';launcher.setAttribute('aria-expanded','false');host.append(launcher);
const box=el('section',null,'windows-explorer');box.hidden=true;box.setAttribute('aria-label','Explorador de arquivos');
const titlebar=el('div',null,'explorer-titlebar');titlebar.append(el('h3','📂 Explorador de arquivos'),button('Fechar',()=>{box.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();}));box.append(titlebar);
const toolbar=el('div',null,'explorer-toolbar'),crumbs=el('nav',null,'explorer-breadcrumbs'),status=el('p',null,'explorer-status'),list=el('div',null,'explorer-items');
crumbs.setAttribute('aria-label','Caminho da pasta');status.setAttribute('role','status');
const search=el('input');search.placeholder='Buscar pasta ou documento em todo o explorador';search.setAttribute('aria-label','Buscar no explorador');search.style.width='100%';
const addressbar=el('div',null,'explorer-addressbar'),workspace=el('div',null,'explorer-workspace'),tree=el('aside',null,'explorer-tree'),pane=el('div',null,'explorer-pane'),count=el('p',null,'explorer-count');tree.setAttribute('aria-label','Árvore de pastas');addressbar.append(crumbs,search);pane.append(list);workspace.append(tree,pane);box.append(toolbar,addressbar,status,workspace,count);host.append(box);
const notify=e=>{if(valid())status.textContent=e.code==='23505'?'Já existe uma pasta com esse nome neste local.':e.code==='23503'?'A pasta contém arquivos ou subpastas. Mova o conteúdo antes de excluir.':(e.message||'Não foi possível concluir a ação.');};
async function load(){const request=++loadVersion;try{
const results=await Promise.all([db.from('document_folders').select('*').order('name'),db.from('documents').select('*').is('parent_it_id',null).order('title'),db.from('document_favorites').select('document_id').eq('user_id',owner)]);
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
function selectItem(kind,data){selected={kind,data};render();}
async function renameSelected(){if(!selected||busy)return;const item=selected;const name=prompt('Novo nome:',item.kind==='folder'?item.data.name:item.data.title);if(!name?.trim())return;try{checked(await db.from(item.kind==='folder'?'document_folders':'documents').update(item.kind==='folder'?{name:name.trim()}:{title:name.trim()}).eq('id',item.data.id));selected=null;await load();}catch(e){notify(e);}}
async function deleteSelected(){if(!selected||busy)return;const item=selected;if(item.kind==='folder'&&(folders.some(f=>f.parent_id===item.data.id)||docs.some(d=>d.folder_id===item.data.id))){status.textContent='Esvazie a pasta antes de excluir.';return;}if(!confirm('Excluir '+(item.data.name||item.data.title)+'?'+(item.data.type==='it'?' Os vídeos vinculados também serão excluídos.':'')))return;try{if(item.kind==='folder')checked(await db.from('document_folders').delete().eq('id',item.data.id));else await deleteDocument(item.data);selected=null;await load();status.textContent='Item excluído.';}catch(e){notify(e);}}
function render(){if(!valid())return;toolbar.replaceChildren();crumbs.replaceChildren();list.replaceChildren();tree.replaceChildren();
list.className='explorer-items '+(viewMode==='icons'?'explorer-icons':'explorer-details');
const ancestors=new Set();let parent=currentFolder;while(parent&&!ancestors.has(parent)){ancestors.add(parent);parent=folders.find(f=>f.id===parent)?.parent_id;}
const rootButton=button('📂 Todas as pastas',()=>navigate(null),'tree-folder');rootButton.setAttribute('aria-current',String(!currentFolder));tree.append(rootButton);
function branch(parentId,host,seen){folders.filter(f=>f.parent_id===parentId).forEach(f=>{if(seen.has(f.id))return;const children=folders.some(c=>c.parent_id===f.id);const entry=el('div',null,'tree-entry'),folderButton=button('📁 '+f.name,()=>navigate(f.id),'tree-folder');folderButton.setAttribute('aria-current',String(f.id===currentFolder));if(children){const group=el('details'),summary=el('summary');group.open=ancestors.has(f.id);summary.append(folderButton);group.append(summary);branch(f.id,group,new Set([...seen,f.id]));entry.append(group);}else entry.append(folderButton);host.append(entry);});}branch(null,tree,new Set());
const up=button('↑ Pasta acima',()=>navigate(folders.find(f=>f.id===currentFolder)?.parent_id||null));up.disabled=!currentFolder;toolbar.append(up);
if(admin()){
toolbar.append(button('＋ Nova pasta',()=>createFolder(currentFolder)));
const copy=button('⧉ Copiar',()=>{clipboard=selected;status.textContent='Item copiado. Abra a pasta de destino e clique em Colar.';render();});copy.disabled=!selected||busy;
const paste=button('▣ Colar',async()=>{if(!clipboard||busy)return;busy=true;render();status.textContent='Copiando arquivos…';try{await copyItem(clipboard,currentFolder);await load();status.textContent='Cópia concluída.';}catch(e){notify(e);}finally{busy=false;render();}});paste.disabled=!clipboard||busy;
const rename=button('✎ Renomear',renameSelected);rename.disabled=!selected||busy;
const del=button('🗑 Excluir',deleteSelected);del.disabled=!selected||busy;
toolbar.append(copy,paste,rename,del);

if(uploadSelect)toolbar.append(button('Enviar arquivo aqui',()=>{uploadSelect.value=currentFolder||'';uploadSelect.scrollIntoView({behavior:'smooth',block:'center'});uploadSelect.focus();}));
}
toolbar.append(button('↻ Atualizar',()=>load()));const viewButton=button(viewMode==='icons'?'☷ Detalhes':'▦ Ícones',()=>{viewMode=viewMode==='icons'?'details':'icons';render();});toolbar.append(viewButton);
crumbs.append(button('Todas as pastas',()=>navigate(null)));
if(currentFolder){const chain=[],seen=new Set();let id=currentFolder;while(id&&!seen.has(id)){seen.add(id);const f=folders.find(x=>x.id===id);if(!f)break;chain.unshift(f);id=f.parent_id;}chain.forEach(f=>{crumbs.append(el('span',' / '),button(f.name,()=>navigate(f.id)));});}
const query=search.value.trim().toLocaleLowerCase('pt-BR');
const matches=text=>text.toLocaleLowerCase('pt-BR').includes(query);
const visibleFolders=folders.filter(f=>query?matches(folderPath(folders,f.id)):f.parent_id===currentFolder);
visibleFolders.forEach(f=>{
const row=el('div',null,'explorer-item folder-item'),open=button('',()=>navigate(f.id),'explorer-open');open.setAttribute('aria-label','Abrir pasta: '+f.name);open.append(el('span','📁','file-icon'),el('strong',f.name));row.append(open,el('span',query?folderPath(folders,f.id):`${folders.filter(x=>x.parent_id===f.id).length} subpastas · ${docs.filter(d=>d.folder_id===f.id).length} arquivos`,'file-meta'));
if(admin()){
const choose=button(selected?.kind==='folder'&&selected.data.id===f.id?'☑ Selecionada':'□ Selecionar',()=>selectItem('folder',f));choose.setAttribute('aria-pressed',String(selected?.kind==='folder'&&selected.data.id===f.id));row.append(choose);
row.append(button('Renomear pasta',async()=>{const name=prompt('Novo nome da pasta:',f.name);if(name===null)return;const clean=name.trim();if(!clean||clean.length>120||/[\\/]/.test(clean)){status.textContent='Nome inválido.';return;}try{checked(await db.from('document_folders').update({name:clean}).eq('id',f.id));status.textContent='Pasta renomeada.';await load();}catch(e){notify(e);}}));
const hasContent=folders.some(x=>x.parent_id===f.id)||docs.some(d=>d.folder_id===f.id);
const remove=button('Excluir pasta vazia',async()=>{if(!confirm(`Excluir a pasta vazia "${f.name}"?`))return;try{checked(await db.from('document_folders').delete().eq('id',f.id));status.textContent='Pasta excluída.';await load();}catch(e){notify(e);}},'danger');remove.disabled=hasContent;remove.title=hasContent?'Mova os arquivos e remova as subpastas primeiro.':'Excluir pasta vazia';row.append(remove);
}list.append(row);});
const visibleDocs=docs.filter(d=>query?matches(`${d.title} ${folderPath(folders,d.folder_id)} ${d.sector} ${d.operation}`):(d.folder_id||null)===currentFolder);
visibleDocs.forEach(d=>{
const row=el('div',null,'explorer-item file-item'),open=button('',()=>showDocument(d),'explorer-open');open.setAttribute('aria-label','Visualizar: '+d.title);open.append(el('span',d.type==='video'?'🎬':d.type==='desenho'?'🖼':'📄','file-icon'),el('strong',d.title));row.append(open,el('span',`${d.type==='it'?'IT':d.type==='video'?'Vídeo':'Desenho'} · ${d.sector} · ${d.operation}${query?' · '+(folderPath(folders,d.folder_id)||'Sem pasta'):''}`,'file-meta'));
const star=button(favorites.has(d.id)?'★ Favoritado':'☆ Favoritar',async()=>{star.disabled=true;try{const remove=favorites.has(d.id);checked(remove?await db.from('document_favorites').delete().eq('user_id',owner).eq('document_id',d.id):await db.from('document_favorites').upsert({user_id:owner,document_id:d.id},{onConflict:'user_id,document_id',ignoreDuplicates:true}));if(valid()){if(remove)favorites.delete(d.id);else favorites.add(d.id);status.textContent=remove?'Favorito removido.':'Favorito salvo.';render();}}catch(e){notify(e);star.disabled=false;}});star.setAttribute('aria-pressed',String(favorites.has(d.id)));star.setAttribute('aria-label',`${favorites.has(d.id)?'Remover dos favoritos':'Favoritar'}: ${d.title}`);row.append(star);
if(admin()){const choose=button(selected?.kind==='document'&&selected.data.id===d.id?'☑ Selecionado':'□ Selecionar',()=>selectItem('document',d));choose.setAttribute('aria-pressed',String(selected?.kind==='document'&&selected.data.id===d.id));row.append(choose,button('Mover arquivo',()=>moveDocument(d)));}list.append(row);
});
count.textContent=`${visibleFolders.length} pastas · ${visibleDocs.length} arquivos`;
if(!visibleFolders.length&&!visibleDocs.length)list.append(el('p',query?'Nenhum resultado encontrado.':currentFolder?'Esta pasta está vazia.':'Nenhuma pasta ou arquivo sem pasta. Crie uma pasta raiz para começar.','empty'));
}
search.oninput=render;load();return {refresh:load};
}

function settings(){content.replaceChildren();const size=button('Alternar tamanho do texto',()=>{document.body.classList.toggle('large');localStorage.setItem('it-digital-large',String(document.body.classList.contains('large')));});content.append(size);const explorerHost=el('div');content.append(explorerHost);if(!admin()){explorer(explorerHost);content.append(el('p','Seu acesso permite navegar, visualizar e favoritar os documentos.','notice'));return;}
content.append(el('h3','Enviar desenho ou IT'));const form=el('form',null,'admin-form');field(form,'Título','title');const folderLabel=el('label','Pasta de destino'),folderSelect=el('select');folderSelect.name='folder_id';folderSelect.setAttribute('aria-label','Pasta de destino para upload');folderOptions(folderSelect,[]);folderLabel.append(folderSelect);form.append(folderLabel);const fileExplorer=explorer(explorerHost,folderSelect);const sector=field(form,'Setor','sector','text',sectors.map(s=>s[0]));const operation=field(form,'Operação','operation','text',['Bobinagem secundária','Bobinagem primária','Montagem','Teste','Acabamento']);sector.onchange=()=>{operation.replaceChildren();(sector.value==='Baixa Tensão'?['Bobinagem secundária','Bobinagem primária','Montagem','Teste','Acabamento']:['Geral']).forEach(v=>{const o=el('option',v);o.value=v;operation.append(o);});};field(form,'Tipo','type','text',['desenho','it']);const file=field(form,'Documento — PDF ou imagem (até 50 MB)','file','file');file.accept='.pdf,.png,.jpg,.jpeg,.webp';const submit=el('button','Enviar arquivo','action');form.append(submit,el('p','Para adicionar o vídeo, abra a IT e use Enviar vídeo para esta IT.','notice'));const status=el('p');status.setAttribute('role','status');form.append(status);form.onsubmit=async ev=>{ev.preventDefault();submit.disabled=true;status.textContent='Enviando…';let path;try{const f=file.files[0];if(!f||f.size>50*1024*1024)throw Error('Escolha um arquivo de até 50 MB.');const ext=f.name.split('.').pop().toLowerCase();if(!['pdf','png','jpg','jpeg','webp'].includes(ext))throw Error('Formato não permitido.');const kind=form.elements.type.value;if((kind==='video')!==['mp4','webm'].includes(ext))throw Error('Selecione Vídeo para MP4/WebM; desenhos e ITs devem ser PDF ou imagem.');path=`${crypto.randomUUID()}.${ext}`;checked(await db.storage.from('brasformer').upload(path,f,{upsert:false}));const result=await db.from('documents').insert({title:form.elements.title.value.trim(),sector:sector.value,operation:operation.value,type:kind,file_path:path,created_by:user.id,folder_id:folderSelect.value||null}).select().single();if(result.error){await db.storage.from('brasformer').remove([path]);throw result.error;}status.textContent='Arquivo enviado com sucesso. QR Code gerado para esta identificação.';showQrCode(result.data);const savedFolder=folderSelect.value;form.reset();folderSelect.value=savedFolder;sector.onchange();await manageDocuments();await fileExplorer.refresh();}catch(e){status.textContent=e.message||'Falha no envio.';}finally{submit.disabled=false;}};content.append(form);
content.append(el('h3','Conteúdos cadastrados'));const docs=el('div');docs.id='admin-documents';content.append(docs);manageDocuments();
content.append(el('h3','Criar acesso de funcionário'));const uf=el('form',null,'admin-form');field(uf,'E-mail','email','email');const pw=field(uf,'Senha inicial (mínimo 12 caracteres)','password','password');pw.minLength=12;const create=el('button','Criar usuário','action');uf.append(create);const us=el('p');us.setAttribute('role','status');uf.append(us);uf.onsubmit=async ev=>{ev.preventDefault();create.disabled=true;us.textContent='Criando…';try{const data=checked(await db.functions.invoke('itdigital-users',{body:{email:uf.elements.email.value.trim(),password:pw.value}}));if(data?.error)throw Error(data.error);uf.reset();us.textContent='Usuário criado e liberado para visualizar.';await manageUsers();}catch(e){us.textContent='Não foi possível criar o usuário. Confira se a função itdigital-users foi implantada no Supabase. '+(e.message||'');}finally{create.disabled=false;}};content.append(uf);
content.append(el('h3','Liberar ou bloquear usuários'));const users=el('div');users.id='admin-users';content.append(users);manageUsers();}
async function downloadDocument(doc){
if(!admin())throw Error('Download disponível apenas ao administrador.');
const blob=checked(await db.storage.from('brasformer').download(doc.file_path));
const url=URL.createObjectURL(blob),link=document.createElement('a');
const ext=doc.file_path.split('.').pop();
const title=(doc.title||'documento').replace(/[\\/:*?"<>|]/g,'_');
link.href=url;link.download=title.toLowerCase().endsWith('.'+ext.toLowerCase())?title:title+'.'+ext;
document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function downloadButton(doc){const b=button('↓ Baixar',async()=>{b.disabled=true;try{await downloadDocument(doc);}catch(e){fail(e);}finally{b.disabled=false;}});return b;}

async function manageDocuments(){const target=document.querySelector('#admin-documents');if(!target)return;try{const docs=checked(await db.from('documents').select('*').is('parent_it_id',null).order('created_at',{ascending:false}));target.replaceChildren();docs.forEach(d=>{const row=el('div',null,'document-row');row.append(el('strong',d.title),button('Visualizar',()=>showDocument(d)),downloadButton(d),button('▦ QR Code',()=>showQrCode(d)),button('Editar título',async()=>{const title=prompt('Novo título:',d.title);if(!title?.trim())return;try{checked(await db.from('documents').update({title:title.trim()}).eq('id',d.id));manageDocuments();}catch(e){fail(e);}}),button('Excluir',async()=>{if(!confirm(`Excluir ${d.title}?`))return;try{await deleteDocument(d);manageDocuments();}catch(e){fail(e);}},'danger'));target.append(row);});if(!docs.length)target.append(el('p','Nenhum conteúdo cadastrado.'));}catch(e){fail(e);}}
async function manageUsers(){const target=document.querySelector('#admin-users');if(!target)return;try{const users=checked(await db.from('profiles').select('*').order('email'));target.replaceChildren();users.forEach(p=>{const row=el('div',null,'user-row');row.append(el('strong',p.email),el('span',`${p.role==='admin'?'Administrador':'Usuário'} · ${p.active?'Liberado':'Bloqueado'}`));if(p.id!==user.id)row.append(button(p.active?'Bloquear':'Liberar',async()=>{try{checked(await db.from('profiles').update({active:!p.active}).eq('id',p.id));manageUsers();}catch(e){fail(e);}}));target.append(row);});}catch(e){fail(e);}}
async function refresh(){try{const result=await db.auth.getUser();if(result.error||!result.data.user){lock('Entre com seu e-mail e senha.');return;}user=result.data.user;profile=checked(await db.from('profiles').select('*').eq('id',user.id).single());if(!profile.active){lock('Seu acesso ainda não foi liberado pelo administrador.',true);return;}login.hidden=true;main.hidden=false;bar.hidden=false;bar.replaceChildren(el('span',`${user.email} · ${admin()?'Administrador':'Usuário'}`),button('Sair',async()=>{await db.auth.signOut();lock('Você saiu do sistema.');}));openScreen(decodeURIComponent(location.hash.slice(1))||'home',false);}catch(e){lock('Não foi possível validar seu acesso: '+(e.message||'Verifique a conexão.'),true);}}
function lock(text,canExit=false){stopQrCamera?.();stopQrCamera=null;profile=null;user=null;viewVersion++;main.hidden=true;content.replaceChildren();login.hidden=false;message.textContent=text;bar.hidden=!canExit;bar.replaceChildren();if(canExit)bar.append(button('Sair',async()=>{await db.auth.signOut();lock('Entre com seu e-mail e senha.');}));document.querySelectorAll('dialog').forEach(d=>d.close());}
document.querySelector('#login-form').onsubmit=async ev=>{ev.preventDefault();const f=ev.target,b=f.querySelector('button');b.disabled=true;message.textContent='Entrando…';try{checked(await db.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value}));f.elements.password.value='';await refresh();}catch(e){message.textContent='Não foi possível entrar. Confira o e-mail, a senha e sua conexão.';}finally{b.disabled=false;}};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')lock('Entre com seu e-mail e senha.');});refresh();
})();
