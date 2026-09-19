'use client';
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: string;
}

export default function BottomSheet({ isOpen, onClose, children, height = 'h-[80vh]' }: Props) {
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

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-[1000] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div 
        className={`fixed bottom-0 left-0 right-0 max-w-3xl mx-auto bg-white rounded-t-2xl shadow-2xl z-[1001] transition-transform transform ${isOpen ? 'translate-y-0' : 'translate-y-full'} ${height} flex flex-col`}
      >
        <div className="flex justify-center p-2 cursor-grab active:cursor-grabbing" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}

