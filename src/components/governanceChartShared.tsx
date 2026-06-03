import { type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type ChartVariant = 'pie' | 'bar';

export interface ChartSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function chartSlicesFromCounts(
  meta: readonly { key: string; label: string; color: string }[],
  counts: Record<string, number>
): ChartSlice[] {
  return meta
    .map(({ key, label, color }) => ({
      key,
      label,
      value: counts[key] ?? 0,
      color,
    }))
    .filter((d) => d.value > 0);
}

export function GovernanceChartEmpty({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: '0.85rem',
        textAlign: 'center',
        padding: '0.5rem',
      }}
    >
      No actions to display
    </div>
  );
}

export function GovernancePie({
  data,
  size,
}: {
  data: ChartSlice[];
  size: number;
}) {
  if (data.length === 0) {
    return <GovernanceChartEmpty size={size} />;
  }

  const chartData = data.map((d) => ({ name: d.label, value: d.value, color: d.color }));
  // Keep the pie smaller than the box so adjacent legend/layout has room; no slice labels (they clip).
  const outerRadius = Math.min(size * 0.32, 90);

  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          label={false}
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _name, item) => [
            value,
            String(item?.payload?.name ?? 'Actions'),
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GovernanceBar({
  data,
  size,
}: {
  data: ChartSlice[];
  size: number;
}) {
  if (data.length === 0) {
    return <GovernanceChartEmpty size={size} />;
  }

  const chartData = data.map((d) => ({ name: d.label, value: d.value, color: d.color }));
  const yAxisWidth = Math.min(200, Math.max(120, ...chartData.map((d) => d.name.length * 6.5)));

  return (
    <ResponsiveContainer width={size} height={Math.max(size, 160)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={yAxisWidth}
          tick={{ fill: '#e5e5e5', fontSize: 11 }}
        />
        <Tooltip formatter={(value: number) => [value, 'Actions']} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GovernanceChartPlot({
  data,
  size,
  variant,
}: {
  data: ChartSlice[];
  size: number;
  variant: ChartVariant;
}) {
  if (variant === 'bar') {
    return <GovernanceBar data={data} size={size} />;
  }
  return <GovernancePie data={data} size={size} />;
}

export function GovernanceCompactLegend({ data }: { data: ChartSlice[] }) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        fontSize: '0.72rem',
        lineHeight: 1.35,
        color: '#d4d4d4',
        width: '100%',
        maxWidth: 200,
      }}
    >
      {data.map(({ key, label, value, color }) => (
        <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', marginBottom: '0.2rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: color,
              flexShrink: 0,
              marginTop: 2,
            }}
          />
          <span>
            {label}: <strong>{value}</strong>
            {total > 0 && (
              <span style={{ color: '#9ca3af' }}> ({Math.round((value / total) * 100)}%)</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GovernanceChartLegend({
  meta,
  counts,
}: {
  meta: readonly { key: string; label: string; color: string }[];
  counts: Record<string, number>;
}) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.85rem' }}>
      {meta.map(({ key, label, color }) => (
        <li key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <span>
            {label}: <strong>{counts[key] ?? 0}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface GovernanceChartModalProps {
  open: boolean;
  titleId: string;
  title: string;
  onClose: () => void;
  excludeUnfinalized: boolean;
  onExcludeUnfinalizedChange: (value: boolean) => void;
  excludedCount: number;
  totalCount: number;
  variant: ChartVariant;
  onVariantChange: (variant: ChartVariant) => void;
  chartData: ChartSlice[];
  meta: readonly { key: string; label: string; color: string }[];
  counts: Record<string, number>;
  footer?: ReactNode;
  children?: ReactNode;
}

export function GovernanceChartModal({
  open,
  titleId,
  title,
  onClose,
  excludeUnfinalized,
  onExcludeUnfinalizedChange,
  excludedCount,
  totalCount,
  variant,
  onVariantChange,
  chartData,
  meta,
  counts,
  footer,
  children,
}: GovernanceChartModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        className="rounded-lg border-2 border-[#ffa722] bg-[#111111] text-neutral-100"
        style={{ padding: '1.5rem', maxWidth: 'min(560px, 95vw)', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.25rem' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '1.5rem',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '0 0.25rem',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name={`${titleId}-variant`}
              checked={variant === 'pie'}
              onChange={() => onVariantChange('pie')}
            />
            Pie
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name={`${titleId}-variant`}
              checked={variant === 'bar'}
              onChange={() => onVariantChange('bar')}
            />
            Bar
          </label>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            marginBottom: '1rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <input
            type="checkbox"
            checked={excludeUnfinalized}
            onChange={(e) => onExcludeUnfinalizedChange(e.target.checked)}
            style={{ marginTop: '0.2rem' }}
          />
          <span>Exclude governance actions that have not yet finalized</span>
        </label>

        {excludeUnfinalized && excludedCount > 0 && (
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
            {excludedCount} action{excludedCount === 1 ? '' : 's'} still in voting excluded.
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
          <GovernanceChartPlot
            data={chartData}
            size={variant === 'bar' ? 320 : 240}
            variant={variant}
          />
          <GovernanceChartLegend meta={meta} counts={counts} />
        </div>

        {children}

        {footer ?? (
          <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center' }}>
            Based on {totalCount} governance action{totalCount === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  );
}

export function GovernanceChartThumbnail({
  title,
  chartData,
  onClick,
}: {
  title: string;
  chartData: ChartSlice[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Open ${title}`}
      style={{
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '0.75rem 1rem',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: 200,
        color: '#f5f5f5',
      }}
    >
      <span
        style={{
          fontWeight: 'bold',
          fontSize: '0.95rem',
          textAlign: 'center',
          width: '100%',
          color: '#fafafa',
        }}
      >
        {title}
      </span>
      <GovernancePie data={chartData} size={140} />
      <GovernanceCompactLegend data={chartData} />
      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Click to expand</span>
    </button>
  );
}
