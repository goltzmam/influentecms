import {test} from 'node:test';import assert from 'node:assert/strict';
import {localizeLinks,discoverPages,internalPath} from '../src/lib/clone/links.ts';
import {renderDocument} from '../src/lib/clone/document.ts';
const doc={sourceUrl:'https://juremanews.com.br/',bodyClass:'',css:'',html:'<header><a href="http://www.juremanews.com.br/categoria/cidades/">Cidades</a><a href="/quem-somos/">Quem somos</a><a href="https://juremanews.com.br/">Home</a><a href="https://instagram.com/jurema">Social</a></header>'};
test('Todos os links internos usam o clone, incluindo páginas não importadas e domínio próprio',()=>{
 for(const base of ['/p/news','']){const localized=localizeLinks(doc,base);const out=renderDocument(localized,'11111111-1111-4111-8111-111111111111');assert.ok(out.includes(`href="${base}/original/categoria/cidades"`));assert.ok(out.includes(`href="${base}/original/quem-somos"`));assert.ok(!out.includes('href="https://instagram.com/jurema"'));assert.ok(!out.includes('href="http://www.juremanews.com.br'));}
 const edited=localizeLinks({...doc,html:'<a href="https://instagram.com/minhamarca" data-clone-user-link="true">Minha rede</a>'},'/p/news');assert.ok(edited.html.includes('href="https://instagram.com/minhamarca"'));
});
test('Descoberta percorre páginas e elimina parâmetros de rastreamento e caminhos privados',()=>{
 const pages=discoverPages(doc.html,doc.sourceUrl);assert.equal(pages.length,2);assert.equal(internalPath('https://evil.example/a',doc.sourceUrl),null);assert.equal(internalPath('/wp-admin/',doc.sourceUrl),null);assert.equal(internalPath('/post/?utm_source=x',doc.sourceUrl),'/post');
});
test('Ícones sociais não dependem de fonte externa e altura não usa o viewport anterior',()=>{
 const out=renderDocument({...doc,html:'<footer><a href="#"><i class="td-icon-facebook"></i></a><a href="#"><i class="td-icon-instagram"></i></a></footer>'},'11111111-1111-4111-8111-111111111111');assert.ok(out.includes('influente-social-symbol'));assert.ok(out.includes('<svg'));assert.ok(!out.includes('class="td-icon-facebook"'));assert.ok(!out.includes('Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)'));assert.ok(out.includes('getBoundingClientRect().height'));
 const script=out.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];assert.doesNotThrow(()=>new Function(script));
});
