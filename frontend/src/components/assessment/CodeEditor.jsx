import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ 
  value, 
  onChange, 
  language = 'javascript', 
  theme = 'vs-dark' 
}) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        theme={theme}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 20, bottom: 20 },
          lineNumbers: 'on',
          roundedSelection: true,
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
          formatOnPaste: true,
          formatOnType: true,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
        }}
      />
    </div>
  );
}
