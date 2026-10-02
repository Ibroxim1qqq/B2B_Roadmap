'use client';
import { ReactNode, useEffect, useState, useRef, TouchEvent } from 'react';
import { X, ChevronUp, ChevronDown, Minus } from 'lucide-react';

export type SnapLevel = 'peek' | 'half' | 'full';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: string;
  defaultSnap?: SnapLevel;
}

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  height, 
  defaultSnap = 'half' 
}: Props) {
  const [snap, setSnap] = useState<SnapLevel>(defaultSnap);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  // Reset to defaultSnap when opened
  useEffect(() => {
    if (isOpen) {
      setSnap(defaultSnap);
    }
  }, [isOpen, defaultSnap]);

  // Escape key listener (required for accessibility and test suites)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Touch gesture handling (Yandex Maps / Yandex Go swipe feel)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null || touchCurrentY.current === null) {
      touchStartY.current = null;
      touchCurrentY.current = null;
      return;
    }

    const deltaY = touchStartY.current - touchCurrentY.current; // positive = swipe up, negative = swipe down
    const threshold = 45; // pixels

    if (deltaY > threshold) {
      // Swiped UP
      if (snap === 'peek') setSnap('half');
      else if (snap === 'half') setSnap('full');
    } else if (deltaY < -threshold) {
      // Swiped DOWN
      if (snap === 'full') setSnap('half');
      else if (snap === 'half') setSnap('peek');
      else if (snap === 'peek') onClose();
    }

    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  const toggleSnap = () => {
    if (snap === 'peek') setSnap('half');
    else if (snap === 'half') setSnap('full');
    else setSnap('half');
  };

  // Determine container height class
  const getHeightClass = () => {
    if (height && snap === 'half') return height;
    switch (snap) {
      case 'peek':
        return 'h-[160px] pb-6';
      case 'half':
        return 'h-[55vh]';
      case 'full':
        return 'h-[88vh]';
    }
  };

  return (
    <>
      {/* 1. Backdrop (Interactive & translucent for half/full, non-blocking for peek) */}
      <div 
        className={`fixed inset-0 z-[1000] transition-opacity duration-200 ${
          snap === 'peek' 
            ? 'pointer-events-none opacity-0' 
            : 'bg-black/35 backdrop-blur-xs opacity-100'
        }`}
        onClick={onClose}
      />

      {/* 2. Bottom Sheet Container (Yandex Maps / Yandex Go floating rounded card) */}
      <div 
        className={`fixed bottom-0 left-0 right-0 max-w-3xl mx-auto bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.18)] z-[1001] transition-all duration-300 ease-out flex flex-col border-t border-slate-200/80 ${getHeightClass()}`}
      >
        {/* Drag Handle & Snap Controls Bar */}
        <div 
          className="flex items-center justify-between px-4 pt-2 pb-1.5 cursor-grab active:cursor-grabbing shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={toggleSnap}
        >
          {/* Snap level hint indicator */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (snap === 'peek') setSnap('half');
              else if (snap === 'half') setSnap('peek');
              else setSnap('half');
            }}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title={snap === 'peek' ? "Kengaytirish" : "Kichraytirish"}
          >
            {snap === 'peek' ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : snap === 'full' ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <Minus className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Central Grab Pill */}
          <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors" />

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </>
  );
}
