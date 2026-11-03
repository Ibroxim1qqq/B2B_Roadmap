'use client';
import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { normalizeFilterText } from '../../lib/filters';

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel: string;
  allowCreate?: boolean;
}

const MAX_VISIBLE_OPTIONS = 100;

const TAG_COLORS = [
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-slate-200 text-slate-800'
];

/** The same name always gets the same colour. */
function tagColor(name: string): string {
  const key = normalizeFilterText(name);
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return TAG_COLORS[sum % TAG_COLORS.length];
}

function Tag({ name }: { name: string }) {
  return <span className={`inline-block max-w-full truncate px-2 py-0.5 rounded-md text-xs font-semibold ${tagColor(name)}`}>{name}</span>;
}

export default function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = 'Tanlang...',
  ariaLabel,
  allowCreate = true
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [created, setCreated] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };
  useClickOutside(rootRef, close, isOpen);

  const allOptions = useMemo(() => {
    const unique = new Map<string, string>();
    [...options, ...created, value].forEach(name => {
      const key = normalizeFilterText(name);
      if (key && !unique.has(key)) unique.set(key, name);
    });
    return [...unique.values()];
  }, [options, created, value]);

  const typed = query.trim();
  const typedKey = normalizeFilterText(typed);
  const visible = allOptions.filter(name => normalizeFilterText(name).includes(typedKey));
  const exactMatch = allOptions.find(name => normalizeFilterText(name) === typedKey);
  const canCreate = allowCreate && Boolean(typed) && !exactMatch;

  const choose = (name: string) => {
    onChange(name);
    close();
  };

  const create = () => {
    setCreated(prev => [...prev, typed]);
    choose(typed);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className={`w-full min-h-9 pl-3 pr-2 py-1.5 bg-white border rounded-xl flex items-center gap-1.5 text-xs transition-colors ${
        isOpen ? 'border-[#1b815f] ring-2 ring-emerald-500/10' : 'border-slate-200'
      }`}>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => (isOpen ? close() : setIsOpen(true))}
          className="flex-1 min-w-0 flex items-center text-left cursor-pointer"
        >
          {value ? <Tag name={value} /> : <span className="text-slate-400">{placeholder}</span>}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label={`${ariaLabel}ni tozalash`} className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <input
            type="text"
            autoFocus
            aria-label={`${ariaLabel}: qidirish`}
            placeholder={allowCreate ? 'Tanlang yoki yangisini yozing...' : 'Qidirish...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (exactMatch) choose(exactMatch);
                else if (canCreate) create();
                else if (visible.length > 0) choose(visible[0]);
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                close();
              }
            }}
            className="w-full px-3 py-2 text-xs border-b border-slate-100 outline-none placeholder:text-slate-400"
          />
          <div role="listbox" aria-label={ariaLabel} className="max-h-44 overflow-y-auto py-1">
            {visible.slice(0, MAX_VISIBLE_OPTIONS).map(name => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === value}
                onClick={() => choose(name)}
                className="w-full px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer"
              >
                <Tag name={name} />
                {name === value && <Check className="w-3.5 h-3.5 text-[#1b815f] shrink-0" />}
              </button>
            ))}
            {visible.length > MAX_VISIBLE_OPTIONS && (
              <p className="px-3 py-2 text-xs text-slate-400">Yana {(visible.length - MAX_VISIBLE_OPTIONS).toLocaleString()} ta, qidirib toping</p>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={create}
                className="w-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="shrink-0">Qo&apos;shish:</span>
                <Tag name={typed} />
              </button>
            )}
            {visible.length === 0 && !canCreate && (
              <p className="px-3 py-2 text-xs text-slate-400">Topilmadi</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
