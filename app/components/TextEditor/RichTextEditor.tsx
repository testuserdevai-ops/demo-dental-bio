"use client";
import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css"; // Import Quill's styles

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return; // Prevent reinitialization

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: [
          ["bold", "italic", "underline"], // Formatting options
          ["link", "image"], // Add links and images
          [{ list: "ordered" }, { list: "bullet" }], // Lists
          [{ header: [1, 2, false] }], // Header levels
        ],
      },
    });

    quillRef.current.on("text-change", () => {
      const content = quillRef.current?.root.innerHTML || "";
      onChange(content);
    });
  }, [onChange]);

  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = value;
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="!h-80 border border-gray-300 bg-white rounded-bl-[26px] rounded-br-[26px] p-2 !mb-4"
    ></div>
  );
};

export default RichTextEditor;
