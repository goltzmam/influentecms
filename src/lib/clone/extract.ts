import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";
type Element = ReturnType<typeof findAll>[number];
import type { AiBlueprint } from "../ai/schema.ts";
const clean = (s: string, n = 5000) => s.replace(/\s+/g," ").trim().slice(0,n);
export function cloneSlug(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55).replace(/-$/g,"") || "portal"; }
export function extractPage(html:string, base:string) {
  const root = parseDocument(html);
  const nodes = (tag:string, within = root.children) => findAll((e:Element)=>e.name===tag,within);
  const all = findAll(()=>true,root.children);
  const text = (e:Element) => clean(textContent(e));
  const absolute = (s:string | undefined) => {try {const u=new URL(s || "",base);return u.protocol==="https:" && !u.username && !u.password ? u.href.slice(0,2000) : "";}catch{return "";}};
  const meta = (name:string) => all.find(e=>e.name==="meta" && (e.attribs.property===name || e.attribs.name===name))?.attribs.content || "";
  const title = clean(meta("og:site_name") || text(nodes("title")[0] || root as unknown as Element).split(/[|–]/)[0],120);
  const h1 = nodes("h1")[0];
  const main = nodes("article")[0] || nodes("main")[0] || root;
  const paragraphs = nodes("p",main.children).map(text).filter(t=>t.length>40).slice(0,45);
  const imageOf = (e:Element) => {const img=nodes("img",e.children)[0];return img ? absolute(img.attribs["data-img-url"] || img.attribs["data-src"] || img.attribs.src || img.attribs["data-lazy-src"]) : "";};
  const logoNode = nodes("img").find(e=>/logo|brand|marca/i.test([e.attribs.alt,e.attribs.class,e.attribs.id,e.attribs.src].join(" ")));
  const logo = logoNode ? absolute(logoNode.attribs["data-src"] || logoNode.attribs.src) : "";
  const favicon = nodes("link").find(e=> /^(shortcut )?icon$/i.test(e.attribs.rel));
  const nav = nodes("nav")[0] || nodes("header")[0];
  const menus = nav ? nodes("a",nav.children).map(e=>({label:clean(text(e),80),url:absolute(e.attribs.href)})).filter(m=>m.label && m.url && !/login|entrar|assinar/i.test(m.label)).filter((m,i,a)=>a.findIndex(x=>x.url===m.url)===i).slice(0,15) : [];
  const headings = all.filter(e=>e.name==="h2"||e.name==="h3").map(text).filter(t=>t.length>2 && t.length<100);
  const articleCards = all.filter(e=>/^(article|a)$/.test(e.name)).map(e=>{
    const link=e.name==="a"?e:nodes("a",e.children)[0];
    const h=[...nodes("h2",e.children),...nodes("h3",e.children)][0];
    const editorial = /feed-post-link|headline|story|news-link|article-link/i.test(link?.attribs.class || "") || /^(h1|h2|h3)$/.test(link?.parent && "name" in link.parent ? String(link.parent.name) : "");
    const title=clean(h?text(h):link?.attribs.title || (editorial && link ? text(link) : ""),200);
    if(title.length<16) return {title:"",url:"",image:""};
    let image = imageOf(e), parent = e.parent;
    for(let depth=0; !image && parent && depth<4; depth++,parent=parent.parent) {
      if("name" in parent) image=imageOf(parent as Element);
    }
    return {title,url:absolute(link?.attribs.href),image};
  }).filter(a=>a.title.length>15 && a.url && new URL(a.url).origin===new URL(base).origin && new URL(a.url).pathname!==new URL(base).pathname).filter((a,i,list)=>list.findIndex(b=>b.url===a.url)===i).slice(0,6);
  const pageLinks = nodes("a").map(e=>({title:clean(text(e),160),url:absolute(e.attribs.href)})).filter(a=>a.url && new URL(a.url).origin===new URL(base).origin && /sobre|quem-somos|contato|privacidade|termos/i.test(new URL(a.url).pathname)).filter((a,i,list)=>list.findIndex(b=>b.url===a.url)===i).slice(0,5);
  const css = nodes("style").map(e=>textContent(e)).join("\n")+all.map(e=>e.attribs.style||"").join(";");
  const colors = [...css.matchAll(/#[a-f\d]{6}\b/ig)].map(m=>m[0].toLowerCase());
  const theme=meta("theme-color");if(/^#[a-f\d]{6}$/i.test(theme)) colors.unshift(theme);
  const stylesheets=nodes("link").filter(e=>e.attribs.rel==="stylesheet").map(e=>absolute(e.attribs.href)).filter(Boolean).slice(0,2);
  const socials=nodes("a").map(e=>absolute(e.attribs.href)).filter(s=>/https:\/\/(www\.)?(instagram.com|facebook.com|youtube.com|x.com|twitter.com|tiktok.com)\//.test(s)).filter((s,i,a)=>a.indexOf(s)===i).slice(0,6);
  const footer = nodes("footer")[0];
  return {url:base,title,headline:clean(h1?text(h1):meta("og:title"),200),description:clean(meta("description")||meta("og:description"),300),logo,favicon: favicon?absolute(favicon.attribs.href):"",image:absolute(meta("og:image")),body:paragraphs.join("\n\n").slice(0,16000),menus,headings:[...new Set(headings)].slice(0,16),articleCards,pageLinks,colors:[...new Set(colors)].slice(0,12),stylesheets,socials,footer:clean(footer?text(footer):"",1000)};
}
export type ExtractedPage = ReturnType<typeof extractPage>;
export function baselineClone(home:ExtractedPage, articles:ExtractedPage[], pages:ExtractedPage[], name?:string): AiBlueprint {
  const nameValue=(name||home.title||new URL(home.url).hostname).slice(0,120);
  const color=home.colors.find(c=> !/^#(ffffff|000000|111111|eeeeee|f[0-9a-f]{5})$/.test(c))||"#285c45";
  const categories=[{name:"Notícias",slug:"noticias"},{name:"Destaques",slug:"destaques"}];
  const imported = articles.filter(p=>p.headline && p.body.length>=80);
  // Cards are headlines, not fabricated full stories. Keep them as short drafts
  // when the original article cannot be read.
  const stories = imported.length ? imported.map(p=>({title:p.headline,slug:cloneSlug(new URL(p.url).pathname.split("/").filter(Boolean).pop()||p.headline),subtitle:p.description.slice(0,400),body:p.body,categorySlug:"noticias",tags:[],seoTitle:p.headline.slice(0,70),seoDescription:p.description.slice(0,180)})) : home.articleCards.slice(0,6).map(a=>({title:a.title,slug:cloneSlug(a.title),subtitle:"",body:`${a.title}\n\nManchete importada da referência. O texto completo não pôde ser lido; revise e complete esta notícia antes de publicar.`,categorySlug:"noticias",tags:[],seoTitle:a.title.slice(0,70),seoDescription:""}));
  if (!stories.length) throw new Error("Não encontramos notícias acessíveis nessa página. Informe a página inicial de um portal de notícias público.");
  const importedPages=pages.filter(p=>p.body.length>=20).map(p=>({title:(p.headline||p.title).slice(0,160),slug:cloneSlug(new URL(p.url).pathname.split("/").filter(Boolean).pop()||p.title),body:p.body.slice(0,12000)}));
  if(!importedPages.length)importedPages.push({title:"Sobre o portal",slug:"sobre",body:home.description.length>=20?home.description:`Informações do ${nameValue}. Edite esta página com a apresentação e os contatos da sua publicação.`});
  const section = (type:"lead"|"latest"|"category",title:string) => ({type,title,categorySlug:type==="category"?"noticias":"",text:"",layout:"news" as const,position:"between" as const});
  return {name:nameValue,slug:cloneSlug(nameValue),template:"daily",rationale:"Estrutura editorial importada e convertida em blocos nativos editáveis.",includeWelcome:false,identity:{color,accentColor:home.colors[1]||"#d5e9cb",surfaceColor:"#ffffff",textColor:"#17252a",font:"sans",tagline:home.description.slice(0,160),description:home.description,seoTitle:nameValue.slice(0,70),seoDescription:home.description.slice(0,180),welcomeTitle:"",welcomeText:"",footer:home.footer},categories,sections:[section("lead","Destaques"),section("latest","Últimas notícias"),section("category",home.headings.find(h=>h.length<50)||"Mais notícias"),...home.headings.filter(h=>h.length<50).slice(1,4).map(h=>section("category",h))].slice(0,16),pages:importedPages.filter((p,i,a)=>a.findIndex(x=>x.slug===p.slug)===i),articles:stories.map((a,i)=>({...a,slug:(a.slug+"-"+(i+1)).slice(0,63)})),design:{navigation:{layout:"horizontal",shrinkOnScroll:true},search:{enabled:true},contact:{enabled:false},newsletter:{enabled:false}},menus:[]};
}
