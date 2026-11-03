"use client";
import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { MediaInput } from "./media-input";
export function RichEditor({
  value = "",
  portalId,
  name = "content",
}: {
  value?: string;
  portalId: string;
  name?: string;
}) {
  const [html, setHtml] = useState(value),
    [inlineImage, setInlineImage] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["https"] },
      }),
      Image,
      Youtube.configure({ nocookie: true }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });
  const tools = [
    ["B", () => editor?.chain().focus().toggleBold().run()],
    ["Itálico", () => editor?.chain().focus().toggleItalic().run()],
    ["Título", () => editor?.chain().focus().toggleHeading({ level: 2 }).run()],
    ["Lista", () => editor?.chain().focus().toggleBulletList().run()],
    ["Citação", () => editor?.chain().focus().toggleBlockquote().run()],
    ["↶", () => editor?.chain().focus().undo().run()],
    ["↷", () => editor?.chain().focus().redo().run()],
  ] as const;
  return (
    <div className="rich-editor">
      <input type="hidden" name={name} value={html} />
      <div className="editor-toolbar">
        {tools.map(([label, run]) => (
          <button type="button" key={label} onClick={run}>
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL HTTPS do link");
            if (url?.startsWith("https://"))
              editor?.chain().focus().setLink({ href: url }).run();
          }}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL do vídeo no YouTube");
            if (
              url &&
              /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)
            )
              editor?.commands.setYoutubeVideo({ src: url });
          }}
        >
          Vídeo
        </button>
      </div>
      <EditorContent editor={editor} />
      <details>
        <summary>Inserir imagem no conteúdo</summary>
        <MediaInput
          portalId={portalId}
          name="inline_image"
          onChange={setInlineImage}
        />
        <button
          type="button"
          disabled={!inlineImage}
          onClick={() => {
            if (
              inlineImage.startsWith("https://") ||
              /^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(inlineImage)
            )
              editor
                ?.chain()
                .focus()
                .setImage({ src: inlineImage, alt: "" })
                .run();
          }}
        >
          Inserir no texto
        </button>
      </details>
    </div>
  );
}
