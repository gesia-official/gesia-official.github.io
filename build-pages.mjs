import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const template=fs.readFileSync(path.join(root,'_site-template.html'),'utf8');
const script=fs.readFileSync(path.join(root,'site.js'),'utf8');
const keys=['home','about','technology','business','bot-application','publication','contact','privacy'];
const origin='https://gesia-official.github.io';
const urlPath=(k,l)=>k==='home'?(l==='en'?'/en.html':'/'):'/'+(l==='en'?'en-':'')+k+'.html';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function rendered(key,language){
 const nodes=new Map();
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{remove(){},toggle(){},add(){}},setAttribute(){},removeAttribute(){},querySelector(){return node()},focus(){},scrollIntoView(){},appendChild(){}});
 const document={documentElement:{lang:language},body:node(),title:'',querySelector(sel){if(sel==='.inquiry')return null;if(!nodes.has(sel))nodes.set(sel,node());return nodes.get(sel)},querySelectorAll(){return []},getElementById(){return node()},createElement:node,addEventListener(){}};
 const sandbox={document,location:{pathname:urlPath(key,language),hash:'',search:'',hostname:'localhost',origin,href:origin+urlPath(key,language)},history:{replaceState(){}},localStorage:{getItem(){return null},setItem(){}},URL,URLSearchParams,Date,console,addEventListener(){},scrollTo(){}};sandbox.window=sandbox;
 vm.createContext(sandbox);vm.runInContext(script,sandbox,{timeout:5000});
 let main=nodes.get('#main').innerHTML;
 if(key==='technology')main=main.replace(/(<div[^>]*id="node-detail"[^>]*>).*?(<\/div>)/s,(_,a,b)=>a+escape(nodes.get('#node-detail')?.textContent||'')+b);
 if(key==='bot-application')main=main.replace(/(<div[^>]*id="bot-example"[^>]*>).*?(<\/div>)/s,(_,a,b)=>a+(nodes.get('#bot-example')?.innerHTML||'')+b);
 return {main,footer:nodes.get('#footer').innerHTML,language:nodes.get('#language').innerHTML,meta:vm.runInContext('PAGE_META['+JSON.stringify(key)+']['+(language==='en'?1:0)+']',sandbox),title:document.title,description:vm.runInContext('PAGE_META['+JSON.stringify(key)+'][1]['+(language==='en'?1:0)+']',sandbox)};
}
function links(html,language){return html.replace(/href="#([a-z-]+)"/g,(m,k)=>keys.includes(k)?'href="'+urlPath(k,language)+'"':m);}
for(const language of ['ko','en'])for(const key of keys){
 const r=rendered(key,language),url=origin+urlPath(key,language);let html=template;
 html=html.replace('<html lang="ko">','<html lang="'+language+'">');
 html=html.replace(/<title>.*?<\/title>/s,'<title>'+escape(r.title)+'</title>');
 html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+escape(r.description)+'">');
 for(const name of ['og:title','twitter:title'])html=html.replace(new RegExp('(<meta (?:property|name)="'+name+'" content=")[^"]*(">)'),(_,a,b)=>a+escape(r.title)+b);
 for(const name of ['og:description','twitter:description'])html=html.replace(new RegExp('(<meta (?:property|name)="'+name+'" content=")[^"]*(">)'),(_,a,b)=>a+escape(r.description)+b);
 html=html.replace(/(<meta property="og:locale" content=")[^"]*(">)/,(_,a,b)=>a+(language==='en'?'en_US':'ko_KR')+b);
 html=html.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+url+'">');
 html=html.replace(/(<meta property="og:url" content=")[^"]*(">)/,(_,a,b)=>a+url+b);
 const alternates=['ko','en','x-default'].map(l=>'<link rel="alternate" hreflang="'+l+'" href="'+origin+urlPath(key,l==='en'?'en':'ko')+'">').join('\n');
 const page={"@context":"https://schema.org","@type":"WebPage",url,name:r.title,description:r.description,inLanguage:language,isPartOf:{'@type':'WebSite',url:origin+'/',name:'GESIA Platform'}};
 if(key==='publication')page.mainEntity={'@type':'Book',name:'인간과 봇이 협력하는 AX경영',author:{'@type':'Person',name:'박원우'},isbn:'9791176614153',datePublished:'2026-10-28',inLanguage:'ko',publisher:{'@type':'Organization',name:'21세기북스'},image:origin+'/publication-cover.jpg'};
 html=html.replace('</head>',alternates+'\n<script type="application/ld+json">'+JSON.stringify(page)+'</script>\n</head>');
 html=html.replace('<main id="main" tabindex="-1"></main>','<main id="main" tabindex="-1">'+r.main+'</main>');
 html=html.replace('<footer id="footer"></footer>','<footer id="footer">'+r.footer+'</footer>');
 html=html.replace(/(<button id="language"[^>]*>).*?(<\/button>)/s,(_,a,b)=>a+r.language+b);
 html=links(html,language);
 const dest=path.join(root,key==='home'&&language==='ko'?'index.html':urlPath(key,language).slice(1));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);
 if(!r.main.includes('<h1>')||html.includes('<main id="main" tabindex="-1"></main>'))throw Error('Missing prerendered main: '+key);
}
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+['ko','en'].flatMap(l=>keys.map(k=>'<url><loc>'+origin+urlPath(k,l)+'</loc>'+['ko','en'].map(a=>'<xhtml:link rel="alternate" hreflang="'+a+'" href="'+origin+urlPath(k,a)+'"/>').join('')+'</url>')).join('\n')+'\n</urlset>\n';
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /_site-template.html\nDisallow: /build-pages.mjs\nSitemap: '+origin+'/sitemap.xml\n');
console.log('Built 16 static Korean/English pages, metadata, alternates and sitemap.');
