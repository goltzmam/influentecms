import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractPage,baselineClone} from '../src/lib/clone/extract.ts';
import {generateClone} from '../src/lib/clone/generate.ts';
import {publicIPv4,readPublicResource} from '../src/lib/clone/web.ts';
import {blueprintSchema,creationPayload,personalize} from '../src/lib/ai/schema.ts';
const home=`<!doctype html><title>Portal Exemplo</title><meta name="description" content="Jornalismo local com todas as novidades da nossa cidade."><meta name="theme-color" content="#6421de"><header><img alt="Logo" src="/logo.webp"><nav><a href="/sobre">Sobre</a><a href="/politica">Política</a></nav></header><main><h1>Notícias da cidade</h1><h2>Política</h2><article><a href="/noticia/ponte"><img src="/ponte.jpg"><h2>Nova ponte é inaugurada na região central</h2></a></article></main><footer>Informações e contato do portal <a href="https://instagram.com/exemplo">Instagram</a></footer><script>fetch('http://169.254.169.254/')</script>`;
const article=`<html><meta property="og:image" content="/ponte.jpg"><article><h1>Nova ponte é inaugurada na região central</h1><p>A nova ponte foi inaugurada nesta semana e melhora a circulação de moradores entre os bairros da região central da cidade.</p></article></html>`;
const about=`<title>Sobre</title><main><h1>Sobre o portal</h1><p>Nossa equipe acompanha todos os dias os acontecimentos e as novidades importantes da cidade.</p></main>`;
const read=async(url,kind)=>({url,type:'text/html',bytes:Buffer.from(url.endsWith('/sobre')?about:url.includes('/noticia/')?article:home)});
test('Clone extrai conteúdo, menu, identidade e imagens sem executar scripts',()=>{
 const page=extractPage(home,'https://example.com');assert.equal(page.logo,'https://example.com/logo.webp');assert.equal(page.articleCards.length,1);assert.equal(page.menus[0].url,'https://example.com/sobre');assert.equal(page.colors[0],'#6421de');assert.equal(page.socials[0],'https://instagram.com/exemplo');assert.equal(page.pageLinks.length,1);
 const plan=baselineClone(page,[extractPage(article,'https://example.com/noticia/ponte')],[extractPage(about,'https://example.com/sobre')]);assert.equal(blueprintSchema.safeParse(plan).success,true);assert.match(plan.articles[0].body,/A nova ponte foi inaugurada/);assert.ok(!plan.articles[0].body.includes('fetch('));
});
test('Clone bloqueia endereços internos, credenciais e formatos inseguros',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','192.168.1.1','172.16.0.1','224.1.1.1','::1','0.0.0.0','999.1.1.1'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('8.8.8.8'),true);
 for(const url of ['https://127.0.0.1','https://localhost','http://example.com','https://user:pass@example.com','https://example.com:8443'])await assert.rejects(readPublicResource(url,'html'));
});
test('Clone importa fatos, converte links de páginas e preserva resultado se IA falhar',async()=>{
 const result=await generateClone({url:'https://example.com',name:'Minha Cidade' },undefined,{read,generate:async()=>{throw Error('quota');}});
 assert.equal(result.plan.name,'Minha Cidade');assert.equal(result.model,'clone-import');assert.equal(result.plan.clone.covers[result.plan.articles[0].slug],'https://example.com/ponte.jpg');assert.match(result.plan.menus[0].url,/^\/pagina\/sobre$/);assert.ok(result.document.html.includes("logo.webp"));assert.equal(result.plan.clone.report.length,5);
 const payload=creationPayload(result.plan);assert.equal(payload.sections[0].adSlots.length,0);assert.equal(payload.settings.socials[0].url,'https://instagram.com/exemplo');assert.ok(!payload.articles[0].content.includes('<script>'));
 const edited=personalize(result.plan,{name:'Novo Nome',slug:'novo-nome',template:'modern',...result.plan.identity});assert.ok(edited.clone);assert.equal(edited.articles[0].title,result.plan.articles[0].title);
});
test('Clone não fabrica notícias quando referência não tem conteúdo legível',async()=>{
 await assert.rejects(generateClone({url:'https://example.com',refine:false},undefined,{read:async url=>({url,type:'text/html',bytes:Buffer.from('<title>Site protegido</title><div>Ative JavaScript</div>')})}),/notícias acessíveis/);
});
test('Clone mantém manchete como texto incompleto quando a notícia está bloqueada',async()=>{
 const result=await generateClone({url:'https://example.com',refine:false},undefined,{read:async(url,kind)=>{if(url.includes('/noticia/'))throw Error();return read(url,kind);}});
 assert.match(result.plan.articles[0].body,/texto completo não pôde ser lido/);assert.ok(result.warnings.some(w=>w.includes('manchetes')));
});

test('Clone reconhece manchete cujo link está dentro de h2 e imagem irmã',()=>{
 const p=extractPage('<main><div class="feed-post"><img src="/capa.jpg"><h2><a class="feed-post-link" href="/noticia/a">Uma notícia com título editorial sem heading dentro do link</a></h2></div></main>','https://example.com');
 assert.equal(p.articleCards.length,1);assert.equal(p.articleCards[0].image,'https://example.com/capa.jpg');assert.ok(blueprintSchema.safeParse(baselineClone(p,[],[])).success);
});

test('Documento original preserva grades e CSS, elimina scripts e gera editor válido',async()=>{
 const {captureDocument,renderDocument,sanitizeDocument}=await import('../src/lib/clone/document.ts');
 const html='<html><head><link rel="stylesheet" href="/tema.css"><style>.logo{width:100px}</style></head><body class="home theme"><header><img src="/logo.png" onerror="alert(1)"></header><main class="grade"><section><h1>Título original</h1><img data-img-url="/anuncio.png" src="/blank.png"><a href="/noticia">Notícia</a></section></main><footer>Rodapé original</footer><script>fetch("https://evil.test")</script></body></html>';
 const doc=await captureDocument(html,'https://example.com',undefined,async url=>({url,type:'text/css',bytes:Buffer.from('.grade{display:grid;grid-template-columns:2fr 1fr;background:url(/fundo.png)}')}));
 assert.match(doc.css,/grid-template-columns:2fr 1fr/);assert.ok(doc.css.includes('https://example.com/fundo.png'));assert.ok(doc.html.includes('https://example.com/anuncio.png'));assert.ok(!doc.html.includes('<script'));assert.ok(!doc.html.includes('onerror'));assert.ok(doc.html.includes('<footer'));
 const rendered=renderDocument(doc,'11111111-1111-4111-8111-111111111111',true);const script=rendered.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];assert.doesNotThrow(()=>new Function(script));assert.match(rendered,/default-src 'none'/);assert.match(rendered,/grid-template-columns/);
 const clean=sanitizeDocument({...doc,html:doc.html+'<iframe src="https://evil.example"></iframe><img src="javascript:alert(1)">'});assert.ok(!clean.html.includes('<iframe'));assert.ok(!clean.html.includes('javascript:'));
});

test('IDs de menus persistem quando botão é inserido antes do elemento original',async()=>{
 const {sanitizeDocument}=await import('../src/lib/clone/document.ts');
 const doc=sanitizeDocument({sourceUrl:'https://example.com',bodyClass:'',css:'',html:'<header data-clone-node="n1"><button data-clone-menu-toggle="n2">Menu</button><nav data-clone-node="n2" data-clone-menu-layout="burger">Links</nav></header>'});
 assert.match(doc.html,/<nav data-clone-node="n2"/);assert.match(doc.html,/data-clone-menu-toggle="n2"/);const ids=[...doc.html.matchAll(/data-clone-node="(n\d+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
