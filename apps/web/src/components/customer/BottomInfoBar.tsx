import React from 'react';

export function BottomInfoBar() {
  return (
    <div className="w-full bg-surface-elevated border-t border-[var(--border-color)] mt-24 py-12 px-6 sm:px-12 text-center md:text-left">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand */}
        <div className="col-span-1 md:col-span-1 flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-lg">L</div>
            <span className="font-display font-bold text-white tracking-wide">LUMIÈRE</span>
          </div>
          <p className="text-sm text-text-secondary">Redefining the fine dining experience with technology and taste.</p>
        </div>

        {/* Hours */}
        <div>
          <h4 className="text-white font-bold mb-4">Opening Hours</h4>
          <p className="text-sm text-text-secondary mb-1">Mon - Thu: 11:00 AM - 10:00 PM</p>
          <p className="text-sm text-text-secondary mb-1">Fri - Sat: 11:00 AM - 11:30 PM</p>
          <p className="text-sm text-text-secondary">Sunday: 10:00 AM - 9:00 PM</p>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-bold mb-4">Contact Us</h4>
          <p className="text-sm text-text-secondary mb-1">123 Culinary Avenue, Food District</p>
          <p className="text-sm text-text-secondary mb-1">+1 (555) 123-4567</p>
          <p className="text-sm text-brand-400 hover:underline cursor-pointer">reservations@lumiere.com</p>
        </div>

        {/* Notices */}
        <div>
          <h4 className="text-white font-bold mb-4">Notices</h4>
          <p className="text-xs text-text-muted mb-2">
            ⚠️ <strong>Allergies:</strong> Please inform our staff of any severe food allergies before placing your order.
          </p>
          <p className="text-xs text-text-muted">
            100% Halal Certified meat used in all our preparations.
          </p>
        </div>

      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[var(--border-color)] text-center">
        <p className="text-xs text-text-muted">
          &copy; {new Date().getFullYear()} Lumière Restaurant. All rights reserved. Powered by QR Platform Phase 2.
        </p>
      </div>
    </div>
  );
}
