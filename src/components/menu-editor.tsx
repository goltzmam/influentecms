"use client";
import { useState } from "react";
import type { MenuItem } from "@/lib/experience";
export function MenuEditor({
  name = "menus",
  value = [],
  onChange,
}: {
  name?: string;
  value?: MenuItem[];
  onChange?: (value: MenuItem[]) => void;
}) {
  const [local, setLocal] = useState(value);
  const items = onChange ? value : local;
  function update(next: MenuItem[]) {
    setLocal(next);
    onChange?.(next);
  }
  function rows(
    list: MenuItem[],
    change: (next: MenuItem[]) => void,
    level = 0,
  ): React.ReactNode {
    return (
      <div className={`menu-editor-level level-${level}`}>
        {list.map((item, index) => (
          <div className="menu-editor-item" key={index}>
            <div className="menu-editor-row">
              <span aria-hidden="true">{level ? "↳" : "☰"}</span>
              <label>
                <span className="sr-only">Nome do item</span>
                <input
                  placeholder="Nome do item"
                  maxLength={80}
                  aria-label={level ? "Nome do submenu" : "Nome do item"}
                  value={item.label}
                  onChange={(e) =>
                    change(
                      list.map((v, i) =>
                        i === index ? { ...v, label: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                <span className="sr-only">Destino do item</span>
                <input
                  placeholder="https://… ou /pagina/sobre"
                  maxLength={2000}
                  aria-label={level ? "Destino do submenu" : "Destino do item"}
                  value={item.url}
                  onChange={(e) =>
                    change(
                      list.map((v, i) =>
                        i === index ? { ...v, url: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Subir item ${index + 1}`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...list];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  change(next);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Descer item ${index + 1}`}
                disabled={index === list.length - 1}
                onClick={() => {
                  const next = [...list];
                  [next[index + 1], next[index]] = [
                    next[index],
                    next[index + 1],
                  ];
                  change(next);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-button danger"
                aria-label="Excluir item do menu"
                onClick={() => change(list.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
            {level < 2 && (
              <>
                <button
                  type="button"
                  className="button-ghost small"
                  disabled={(item.children?.length || 0) >= 12}
                  onClick={() =>
                    change(
                      list.map((v, i) =>
                        i === index
                          ? {
                              ...v,
                              children: [
                                ...(v.children || []),
                                { label: "", url: "" },
                              ],
                            }
                          : v,
                      ),
                    )
                  }
                >
                  + Submenu
                </button>
                {item.children?.length
                  ? rows(
                      item.children,
                      (children) =>
                        change(
                          list.map((v, i) =>
                            i === index ? { ...v, children } : v,
                          ),
                        ),
                      level + 1,
                    )
                  : null}
              </>
            )}
          </div>
        ))}
        <button
          type="button"
          className="button-outline"
          disabled={list.length >= (level ? 12 : 15)}
          onClick={() => change([...list, { label: "", url: "" }])}
        >
          + {level ? "Item neste submenu" : "Adicionar item ao menu"}
        </button>
      </div>
    );
  }
  return (
    <div className="menu-editor">
      {name && (
        <input type="hidden" name={name} value={JSON.stringify(items)} />
      )}
      <p className="field-hint">
        Organize a navegação, mova os itens e crie até dois níveis de submenus.
      </p>
      {rows(items, update)}
    </div>
  );
}
