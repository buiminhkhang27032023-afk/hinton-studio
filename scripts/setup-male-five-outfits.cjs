const fs=require('node:fs');
const base='http://localhost:3210';
async function req(p,init){const r=await fetch(base+p,init);const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));return d;}
(async()=>{
const old=await req('/api/projects/prj_d2348d47832c/graph');
const graph=await req('/api/projects/prj_8a2e12414084/graph');
const male=graph.nodes.find(n=>n.id==='male_reference');
const video=graph.nodes.find(n=>n.id==='male_video');
const keys=['bikini','blazer','uniform','fox','gown'];
const labels=['Cardigan xanh','Blazer công sở','Cardigan hồng và váy xếp ly','Trang phục cáo cam','Đầm dạ hội đỏ'];
const nodes=[male];male.position={x:0,y:500};const edges=[];
for(let i=0;i<keys.length;i++){
const key=keys[i],src=old.nodes.find(n=>n.id==='img_outfit_'+key);
const sourceUrl=src.data.result?.url||src.data.imageUrl;
if(!sourceUrl)throw Error('Missing outfit '+key);
nodes.push({id:'male_outfit_'+key,type:'image',position:{x:400,y:i*420},data:{label:labels[i],imageUrl:sourceUrl,status:'idle'}});
nodes.push({id:'male_tryon_'+key,type:'fashion_tryon',position:{x:850,y:i*420},data:{label:'Nhân vật nam · '+labels[i],modelId:'seed:image:gemini-compose',modelKind:'image',aspect:'9:16',prompt:'Use the exact adult man in the identity reference. Preserve his male face, short hair, masculine body proportions and identity. Dress him in the exact clothing and accessories from the garment reference, including its colors, material and cut. Do not copy the female garment model or feminize his face. Show one full-body adult man head to toe, clean white studio background. Output a single portrait, not a multi-panel character sheet.',status:'idle',result:null,error:null}});
edges.push({id:'male-to-'+key,source:male.id,target:'male_tryon_'+key,sourceHandle:'image',targetHandle:'model'},
{id:'outfit-to-'+key,source:'male_outfit_'+key,target:'male_tryon_'+key,sourceHandle:'image',targetHandle:'garment'},
{id:'tryon-to-video-'+key,source:'male_tryon_'+key,target:video.id,sourceHandle:'image',targetHandle:'image'});
}
video.position={x:1350,y:600};
video.data.prompt='Create a 10-second vertical photorealistic fashion lookbook using @Ảnh1 through @Ảnh5 as the SAME adult male in FIVE different outfits. Keep his exact male face, short hair, body proportions and identity. Use each reference outfit exactly: 1 light blue cardigan look, 2 dark office blazer look, 3 pink cardigan and pleated skirt look, 4 orange fox costume, 5 burgundy evening gown. Do not replace these with a black suit. 0–2s extreme low camera near the floor pointing upward, fully clothed, professional non-sexual fashion pose in outfit 1; 2–3.6s hard cut to locked eye-level full-body lookbook outfit 1; 3.6–5.2s outfit 2; 5.2–6.8s outfit 3; 6.8–8.4s outfit 4; 8.4–10s outfit 5. After the opening all shots use a fixed full-body camera including head and shoes, clean white studio, small chibi of the same man in matching clothes at the side and flat-lay clothing cards. Natural small gestures. Hard cuts only, no clothing morph, no extra real people, no female character, no identity drift, no text, no watermark.';
video.data.continuity='Cùng một nhân vật nam; giữ trang phục theo từng ảnh tham chiếu. Không dùng bộ suit mặc định thay cho 5 bộ đồ.';
video.data.result=null;video.data.status='idle';video.data.error=null;
nodes.push(video);
await req('/api/projects/prj_8a2e12414084/graph',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({nodes,edges,viewport:{x:20,y:20,zoom:0.55}})});
console.log(JSON.stringify({nodes:nodes.length,edges:edges.length,outfits:labels}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
