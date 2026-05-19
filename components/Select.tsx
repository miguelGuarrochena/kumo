'use client';

// Dropdown custom estilo popover. Reemplaza el <select> nativo,
// que en mobile abre el picker del SO (feo) y no tiene styling en desktop.
//
// Soporta:
// - opciones planas: SelectOption[]
// - opciones agrupadas: SelectGroup[]
// - búsqueda interna opcional (searchable)
// - render custom de la opción seleccionada (leftIcon, rightHint)
//
// Cierre por click-fuera, Escape, o tap en la opción.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search as SearchIcon, X } from 'lucide-react';

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;       // texto secundario a la derecha (ej. "GMT-3")
  prefix?: string;     // chip o label corto al inicio (ej. flag "ES")
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
  // Si querés renderizar el botón con tu propio markup
  renderTrigger?: (current: SelectOption | null, open: boolean) => React.ReactNode;
};

const flattenOptions = (
  options?: SelectOption[],
  groups?: SelectGroup[],
): SelectOption[] => {
  if (options) return options;
  if (groups) return groups.flatMap((g) => g.options);
  return [];
};

export const Select = ({
  value,
  onChange,
  options,
  groups,
  placeholder = 'Seleccionar...',
  searchable = false,
  className = '',
  buttonClassName = '',
  ariaLabel,
  disabled = false,
  renderTrigger,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo(() => flattenOptions(options, groups), [options, groups]);
  const current = allOptions.find((o) => o.value === value) ?? null;

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset query cuando se cierra
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filterPredicate = (opt: SelectOption): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.hint?.toLowerCase().includes(q) === true ||
      opt.value.toLowerCase().includes(q)
    );
  };

  const filteredGroups: SelectGroup[] = useMemo(() => {
    if (groups) {
      return groups
        .map((g) => ({ ...g, options: g.options.filter(filterPredicate) }))
        .filter((g) => g.options.length > 0);
    }
    if (options) {
      const filtered = options.filter(filterPredicate);
      return filtered.length > 0 ? [{ label: '', options: filtered }] : [];
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, options, query]);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {renderTrigger ? (
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full"
        >
          {renderTrigger(current, open)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 text-base text-left transition-colors ${
            open
              ? 'border-sky-400 ring-2 ring-sky-100 dark:ring-sky-900/40'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
        >
          {current?.prefix && (
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
              {current.prefix}
            </span>
          )}
          <span className="flex-1 truncate text-slate-700 dark:text-slate-100">
            {current ? current.label : <span className="text-slate-400">{placeholder}</span>}
          </span>
          {current?.hint && (
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
              {current.hint}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-[18rem] flex flex-col"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto py-1">
              {filteredGroups.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 italic text-center">
                  Sin resultados
                </p>
              ) : (
                filteredGroups.map((group, gi) => (
                  <div key={gi}>
                    {group.label && (
                      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                        {group.label}
                      </p>
                    )}
                    {group.options.map((opt) => {
                      const active = opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          {opt.prefix && (
                            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                              {opt.prefix}
                            </span>
                          )}
                          <span className="flex-1 truncate text-left">{opt.label}</span>
                          {opt.hint && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                              {opt.hint}
                            </span>
                          )}
                          {active && <Check className="w-4 h-4 text-sky-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
