import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { referenceUrl } from "../ai/schema.ts";
export class CloneReadError extends Error {}
export function publicIPv4(address: string) {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && [0,168].includes(p[1])) || (p[0] === 198 && [18,19,51].includes(p[1])) ||
    (p[0] === 203 && p[1] === 0 && p[2] === 113));
}
export type Resource = { url: string; type: string; bytes: Buffer };
// Resolve and pin a public address on EVERY redirect. No cookies, credentials,
// scripts or ambient authorization are forwarded to reference sites.
export async function readPublicResource(value: string, kind: "html" | "css" | "image" | "xml", signal?: AbortSignal): Promise<Resource> {
  const budget = signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000);
  let current = value;
  for (let hop = 0; hop <= 4; hop++) {
    if (!referenceUrl.safeParse(current).success) throw new CloneReadError("Use um endereço HTTPS público, sem login.");
    const url = new URL(current);
    const addresses = await lookup(url.hostname, { all: true, family: 4 });
    if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw new CloneReadError("Esse endereço não é um site público disponível para importação.");
    if (budget.aborted) throw new CloneReadError("A leitura da referência demorou demais.");
    const result = await new Promise<{status:number; location?:string; type:string; bytes:Buffer}>((resolve, reject) => {
      const req = request(url, {
        method: "GET", signal: budget,
        lookup: (_hostname, options, callback) => { if(options.all) callback(null, addresses); else callback(null, addresses[0].address, 4); },
        headers: {"User-Agent":"InfluenteClone/1.0 (public editorial import)", Accept: kind === "html" ? "text/html" : kind === "css" ? "text/css" : kind === "xml" ? "application/xml,text/xml" : "image/*", "Accept-Encoding":"identity"},
      }, res => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400) {res.resume();resolve({status,location:res.headers.location,type:"",bytes:Buffer.alloc(0)});return;}
        const type = String(res.headers["content-type"] || "").split(";")[0].toLowerCase();
        const limit = kind === "image" ? 5 * 1024 * 1024 : 1500000;
        if (status !== 200 || !({html:["text/html","application/xhtml+xml"],css:["text/css"],xml:["application/xml","text/xml","application/rss+xml"],image:["image/jpeg","image/png","image/webp","image/gif","image/avif"]}[kind]).includes(type)) {res.destroy();reject(new CloneReadError("A referência bloqueou a leitura ou retornou um formato incompatível."));return;}
        let size = 0;const chunks:Buffer[]=[];
        res.on("data", chunk => {size += chunk.length;if(size>limit){res.destroy();reject(new CloneReadError("O arquivo da referência é grande demais."));}else chunks.push(chunk);});
        res.on("end",()=>resolve({status,type,bytes:Buffer.concat(chunks)}));res.on("error",reject);
      });
      req.on("error",reject);req.end();
    });
    if (result.status >= 300 && result.status < 400 && result.location) {current = new URL(result.location,current).href;continue;}
    return {url:current,type:result.type,bytes:result.bytes};
  }
  throw new CloneReadError("A referência redirecionou muitas vezes.");
}
