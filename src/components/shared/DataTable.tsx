import * as React from 'react';

type DataTableProps = {
  children: React.ReactNode;
  className?: string;
};

export function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <table className="w-full border-collapse text-[13px]">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--bg-surface)]">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`h-10 border-b border-[var(--border-subtle)] px-3 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

type TrProps = {
  children: React.ReactNode;
  active?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Tr({ children, active, hoverable = true, onClick, className = '' }: TrProps) {
  return (
    <tr
      onClick={onClick}
      className={`group border-b border-[var(--border-subtle)] transition-colors duration-150 ${
        hoverable ? 'hover:bg-white/[0.03]' : ''
      } ${active ? 'bg-white/[0.03]' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {active && (
        <td className="w-0 p-0">
          <div className="absolute h-10 w-0.5 bg-[var(--accent-primary)]" />
        </td>
      )}
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = '',
  numeric,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <td
      className={`h-12 px-3 align-middle text-[var(--text-primary)] ${
        numeric ? 'font-mono tabular-nums text-[13px]' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}
