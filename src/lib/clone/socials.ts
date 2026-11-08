import {parseDocument} from 'htmlparser2';import {findAll,getOuterHTML} from 'domutils';
const paths:Record<string,string>={
 facebook:'M14 8h4V4h-4c-4 0-5 2-5 5v3H6v4h3v8h5v-8h4l1-4h-5V9c0-1 0-1 1-1',
 instagram:'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0M17.5 6.5h.01',
 x:'M3 3h4l14 18h-4L3 3M21 3 3 21',
 youtube:'M3 5h18v14H3zM10 9l6 3-6 3z',
 whatsapp:'M20 11a8 8 0 0 1-12 7l-5 2 2-5a8 8 0 1 1 15-4M9 7c0 4 3 7 7 7',
 linkedin:'M4 9v12M4 4h.01M10 21V9h6a4 4 0 0 1 4 4v8M10 13v8',
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 rss:'M4 4a16 16 0 0 1 16 16M4 11a9 9 0 0 1 9 9M4 19h.01',
};
export function replaceSocialIcons(html:string){const root=parseDocument(html);
 for(const icon of findAll(e=>['i','span'].includes(e.name)&&/icon|fa[sb]?\b/.test(e.attribs.class||''),root.children)){
  const cls=icon.attribs.class||'';const network=Object.keys(paths).find(n=>n==='x'?/(twitter|icon-x\b)/i.test(cls):new RegExp(n,'i').test(cls));if(!network)continue;
  icon.name='span';icon.attribs.class='influente-social-symbol';icon.attribs['aria-hidden']='true';
  icon.children=parseDocument(`<svg width="20" height="20" aria-hidden="true"><path transform="scale(.833333)" d="${paths[network]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`).children;
  let a=icon.parent;while(a&&(!('name'in a)||a.name!=='a'))a=a.parent;if(a&&'attribs'in a){if(network==='search')a.attribs['data-clone-search-toggle']='true';else a.attribs['data-clone-social-network']=network;a.attribs['aria-label']=network==='search'?'Buscar':network==='x'?'X':network[0].toUpperCase()+network.slice(1);}
 }
 return root.children.map(n=>getOuterHTML(n)).join('');
}
export const socialStyles=`.influente-social-symbol{display:inline-flex!important;align-items:center;justify-content:center;font-family:Arial!important;font-size:0!important;line-height:1!important;width:20px;height:20px}.influente-social-symbol:before,.influente-social-symbol:after{display:none!important;content:none!important}.influente-social-symbol svg{display:block;width:20px;height:20px;flex:none}a[data-clone-social-network]{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:34px;min-height:34px;padding:7px!important;box-sizing:border-box;border-radius:8px;line-height:1!important}footer a[data-clone-social-network],.td-footer-wrapper a[data-clone-social-network],.td-header-wrap a[data-clone-social-network]{color:#fff}.td-sub-footer-container{margin-bottom:0!important}html,body,#td-outer-wrap{min-height:0!important;height:auto!important}body{display:flow-root;margin-bottom:0!important;padding-bottom:0!important}`;

