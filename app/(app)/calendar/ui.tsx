// Componentes presentacionales chicos y compartidos del calendario.

export const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400'
    }`}
  >
    {children}
  </button>
);

export const DayLabel = ({ dotCls, text }: { dotCls: string; text: string }) => (
  <div className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-900/40 min-w-0">
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
    <span className="truncate">{text}</span>
  </div>
);

export const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-full ${color}`} />
    {label}
  </span>
);

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    {title && (
      <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {title}
      </h3>
    )}
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">{children}</div>
  </div>
);
