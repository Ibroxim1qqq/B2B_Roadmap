'use client';
import { useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';

interface ViaPoint {
  lat: number;
  lng: number;
  name: string;
  source_id?: string;
}

interface ViaPointListProps {
  points: ViaPoint[];
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

interface DragState {
  index: number;
  over: number;
  startY: number;
  startScroll: number;
  stride: number;
  dy: number;
}

const AUTO_SCROLL_EDGE = 28;
const AUTO_SCROLL_STEP = 8;

/** Rows are only shifted while dragging; the order changes on release, so the route is not recalculated midway. */
export default function ViaPointList({ points, onMove, onRemove }: ViaPointListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    const target = e.target as HTMLElement;
    if (e.button !== 0 || target.closest('[data-no-drag]')) return;
    // On a phone only the handle drags, so the list can still be scrolled by its rows.
    if (e.pointerType !== 'mouse' && !target.closest('[data-drag-handle]')) return;
    const list = listRef.current;
    if (!list || points.length < 2) return;
    const rows = list.children;
    const stride = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ index, over: index, startY: e.clientY, startScroll: list.scrollTop, stride, dy: 0 });
  };

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const list = listRef.current;
    if (!drag || !list) return;
    const box = list.getBoundingClientRect();
    if (e.clientY < box.top + AUTO_SCROLL_EDGE) list.scrollTop -= AUTO_SCROLL_STEP;
    else if (e.clientY > box.bottom - AUTO_SCROLL_EDGE) list.scrollTop += AUTO_SCROLL_STEP;
    const dy = e.clientY - drag.startY + (list.scrollTop - drag.startScroll);
    const over = Math.max(0, Math.min(points.length - 1, drag.index + Math.round(dy / drag.stride)));
    setDrag({ ...drag, dy, over });
  };

  const endDrag = () => {
    if (drag && drag.over !== drag.index) onMove(drag.index, drag.over);
    setDrag(null);
  };

  // While dragging, a row's place is where it will land on release.
  const placeOf = (i: number): number => {
    if (!drag) return i;
    if (i === drag.index) return drag.over;
    if (drag.index < i && i <= drag.over) return i - 1;
    if (drag.over <= i && i < drag.index) return i + 1;
    return i;
  };

  const seen = new Map<string, number>();

  return (
    <div ref={listRef} className="relative space-y-1 max-h-48 overflow-y-auto" data-testid="via-point-list">
      {points.map((point, index) => {
        const base = `${point.lat},${point.lng},${point.source_id ?? point.name}`;
        const repeat = seen.get(base) ?? 0;
        seen.set(base, repeat + 1);
        const isDragged = drag?.index === index;
        const offset = !drag ? 0 : isDragged ? drag.dy : (placeOf(index) - index) * drag.stride;

        return (
          <div
            key={`${base},${repeat}`}
            onPointerDown={(e) => startDrag(e, index)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => setDrag(null)}
            style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
            className={`relative flex items-center gap-1.5 h-9 pl-1 pr-3 rounded-lg select-none cursor-grab ${
              isDragged ? 'z-10 bg-white shadow-md ring-1 ring-[#1b815f] cursor-grabbing' : 'bg-slate-50'
            } ${drag && !isDragged ? 'transition-transform duration-150' : ''}`}
          >
            <button
              type="button"
              data-drag-handle
              title="Bosib turib suring"
              aria-label={`${point.name} nuqtasini surish: yuqoriga yoki pastga strelka`}
              onKeyDown={(e) => {
                const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : -1;
                if (to < 0 || to >= points.length) return;
                e.preventDefault();
                onMove(index, to);
              }}
              style={{ touchAction: 'none' }}
              className="p-2 text-slate-400 hover:text-slate-700 cursor-grab shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-medium flex items-center justify-center shrink-0">
              {placeOf(index) + 1}
            </span>
            <span className="flex-1 min-w-0 text-[13px] text-slate-800 truncate" title={point.name}>{point.name}</span>
            <button
              type="button"
              data-no-drag
              onClick={() => onRemove(index)}
              title="Nuqtani olib tashlash"
              aria-label={`${point.name} nuqtasini olib tashlash`}
              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
