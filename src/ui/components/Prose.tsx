import { Fragment, ReactNode } from 'react';

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Mini-markdown: párrafos, "## " subtítulos, "- " viñetas, **negrita**. */
export function Prose({ lines }: { lines: string[] }) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const l of lines) {
    if (l.startsWith('- ')) {
      list.push(l.slice(2));
      continue;
    }
    flush();
    if (l.startsWith('## ')) out.push(<h3 key={out.length} className="h4like">{l.slice(3)}</h3>);
    else out.push(<p key={out.length}>{inline(l)}</p>);
  }
  flush();
  return <div className="prose">{out}</div>;
}
