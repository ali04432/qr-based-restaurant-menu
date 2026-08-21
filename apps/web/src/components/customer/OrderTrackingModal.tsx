import React, { useEffect, useState } from 'react';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

export function OrderTrackingModal({ orderId, onClose }: OrderTrackingModalProps) {
  const [step, setStep] = useState(1);

  // Simulate order progress
  useEffect(() => {
    const timer1 = setTimeout(() => setStep(2), 3000); // IN KITCHEN
    const timer2 = setTimeout(() => setStep(3), 6000); // COOKING
    const timer3 = setTimeout(() => setStep(4), 9000); // READY
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const steps = [
    { id: 1, label: 'Received', icon: '📝' },
    { id: 2, label: 'In Kitchen', icon: '👨‍🍳' },
    { id: 3, label: 'Cooking', icon: '🔥' },
    { id: 4, label: 'Ready/Served', icon: '✨' },
  ];

  return (
    <div className="fixed inset-0 bg-bg-page/95 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card w-full max-w-md border border-[var(--border-color)] relative text-center py-10">
        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          ✓
        </div>
        
        <h2 className="text-3xl font-display font-bold text-white mb-2">Order Confirmed!</h2>
        <p className="text-text-secondary mb-8">Order #{orderId.substring(0, 8).toUpperCase()}</p>

        {/* Progress Tracker */}
        <div className="relative max-w-xs mx-auto mb-10">
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-surface-elevated -z-10"></div>
          
          <div className="space-y-6">
            {steps.map((s, idx) => {
              const isCompleted = step >= s.id;
              const isActive = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors duration-500 ${
                    isCompleted ? 'bg-brand-500 text-white shadow-glow' : 'bg-surface-elevated text-text-muted border border-[var(--border-color)]'
                  }`}>
                    {isCompleted ? '✓' : s.id}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold transition-colors duration-500 ${isCompleted ? 'text-white' : 'text-text-muted'}`}>{s.label}</p>
                    {isActive && <p className="text-xs text-brand-400 animate-pulse mt-0.5">Current Status</p>}
                  </div>
                  <div className="text-2xl grayscale opacity-50">{s.icon}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={onClose} className="btn-secondary w-full py-3">
          Return to Menu
        </button>
      </div>
    </div>
  );
}
