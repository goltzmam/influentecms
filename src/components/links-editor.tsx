"use client";
import { useState } from "react";
export function LinksEditor({
  name,
  value = [],
}: {
  name: string;
  value?: { label: string; url: string }[];
}) {
  const [links, setLinks] = useState(value);
  function move(index:number,direction:number){setLinks(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});}
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(links)} />
      {links.map((link, i) => (
        <div className="link-row" key={i}>
          <input
            aria-label="Rótulo"
            placeholder="Nome"
            value={link.label}
            onChange={(e) =>
              setLinks(
                links.map((l, n) =>
                  n === i ? { ...l, label: e.target.value } : l,
                ),
              )
            }
          />
          <input
            aria-label="Endereço"
            placeholder="https://... ou /caminho"
            value={link.url}
            onChange={(e) =>
              setLinks(
                links.map((l, n) =>
                  n === i ? { ...l, url: e.target.value } : l,
                ),
              )
            }
          />
          <button type="button" className="button-ghost" aria-label={`Subir ${link.label||'link'}`} disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" className="button-ghost" aria-label={`Descer ${link.label||'link'}`} disabled={i===links.length-1} onClick={()=>move(i,1)}>↓</button>
          <button
            type="button"
            className="button-ghost"
            aria-label="Remover link"
            onClick={() => setLinks(links.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button-outline"
        onClick={() => setLinks([...links, { label: "", url: "" }])}
      >
        + Adicionar link
      </button>
    </div>
  );
}
