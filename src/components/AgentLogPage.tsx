import type { CommunityData } from '@/lib/useCommunityData';
import { Activity, Search, RefreshCw, HelpCircle, ChevronRight } from 'lucide-react';
import type { SessionType } from '@/lib/types';

export default function AgentLogPage({ data }: { data: CommunityData }) {
  if (data.agentLogs.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
        <p className="text-neutral-400 text-sm">No agent activity yet.</p>
        <p className="text-neutral-600 text-xs mt-1">The AI agent's reasoning steps will appear here after you run a match.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-200">Agent Audit Trail</h3>
        </div>
        <p className="text-xs text-neutral-500">Every agent run produces an auditable session showing its reasoning, tool use, and decisions.</p>
      </div>

      {data.agentLogs.map((log) => (
        <div key={log.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <SessionIcon type={log.session_type} />
              <div>
                <p className="text-sm font-medium text-neutral-200 capitalize">{log.session_type.replace('_', ' ')} session</p>
                <p className="text-xs text-neutral-500">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Result summary */}
          <div className="px-4 py-3 bg-neutral-800/30 border-b border-neutral-800">
            <p className="text-xs text-neutral-400">
              <span className="text-neutral-600 uppercase tracking-wide font-medium">Result: </span>
              {log.result_summary}
            </p>
          </div>

          {/* Log entries */}
          <div className="p-4 space-y-1">
            {log.log_entries.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <span className="text-[10px] text-neutral-600 font-mono pt-0.5 flex-shrink-0 w-16">{entry.timestamp}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide">{entry.step}</span>
                  <p className="text-xs text-neutral-300 leading-relaxed">{entry.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionIcon({ type }: { type: SessionType }) {
  const icons: Record<SessionType, typeof Activity> = {
    match: Activity,
    search: Search,
    self_correct: RefreshCw,
    clarify: HelpCircle,
  };
  const Icon = icons[type] ?? Activity;
  return (
    <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center">
      <Icon className="w-4 h-4 text-neutral-400" />
    </div>
  );
}
