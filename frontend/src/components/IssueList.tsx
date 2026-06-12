import type { ValidationIssue } from "../types";
import { Badge } from "./ui";

export default function IssueList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const sorted = [...issues].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <ul className="space-y-1.5">
      {sorted.map((issue, i) => (
        <li key={`${issue.code}-${issue.field}-${i}`} className="flex items-start gap-2 text-xs">
          <Badge level={issue.level} />
          <span className="text-slate-300">{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}
