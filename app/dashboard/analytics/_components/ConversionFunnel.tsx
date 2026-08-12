import type { FunnelStage } from "@/lib/analytics/dashboard-contract";
import { AnalyticsSurface } from "./AnalyticsSurface";
import { formatNumber, formatPercent } from "./format";

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const maximum = Math.max(...stages.map((stage) => stage.count), 1);
  return (
    <AnalyticsSurface
      title="Conversion funnel"
      description="A booking click is patient intent, not a completed appointment."
    >
      <ol className="space-y-3">
        {stages.map((stage) => (
          <li key={stage.id}>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {stage.label}
                </p>
                {stage.previousStepRate !== null ? (
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(stage.previousStepRate)} from previous step
                  </p>
                ) : null}
              </div>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatNumber(stage.count)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(stage.count / maximum) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </AnalyticsSurface>
  );
}
