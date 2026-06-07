/**
 * @deprecated Use CodingWorkspace from `coding-engine` instead.
 */
import { CodingWorkspace } from '../../coding-engine';

export default function CodeEditor({ value, onChange, language = 'javascript', theme }) {
  return (
    <CodingWorkspace
      code={value || ''}
      language={language}
      onCodeChange={onChange}
      compact
      className="rounded-2xl overflow-hidden border border-slate-800"
    />
  );
}
