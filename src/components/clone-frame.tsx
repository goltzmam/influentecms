"use client";
import {useEffect,useRef,useState,useId} from "react";
export function CloneFrame({src,title="Portal importado"}:{src:string;title?:string}) {
 const ref=useRef<HTMLIFrameElement>(null);const frameId=useId();const token=Array.from(frameId).map(c=>c.charCodeAt(0).toString(16)).join("").padEnd(32,"0").slice(0,32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,"$1-$2-$3-$4-$5");const [height,setHeight]=useState(1200);
 useEffect(()=>{const listener=(e:MessageEvent)=>{if(e.source!==ref.current?.contentWindow||e.data?.channel!=="influente-clone"||e.data.token!==token)return;if(e.data.type==="search"&&typeof e.data.query==="string"&&e.data.query.length<=200){const base=src.split("/clone")[0];window.location.href=`${base}/busca?q=${encodeURIComponent(e.data.query)}`;}if(e.data.type==="height"&&Number.isFinite(e.data.height))setHeight(Math.min(60000,Math.max(200,e.data.height)));};window.addEventListener("message",listener);return()=>window.removeEventListener("message",listener);},[token,src]);
 return <iframe ref={ref} title={title} src={`${src}${src.includes("?")?"&":"?"}token=${token}`} sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation" style={{display:"block",width:"100%",height,border:0,background:"white"}} />;
}
