'use client';

import React from 'react';
import { MapPin, Phone, Mail, ShieldAlert, Sparkles } from 'lucide-react';

export function BottomInfoBar() {
  return (
    <div className="w-full bg-[#111214]/90 backdrop-blur-xl border-t border-[#1D1F23] mt-24 py-12 px-6 sm:px-12 text-center md:text-left shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div className="col-span-1 md:col-span-1 flex flex-col items-center md:items-start">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D6A84F]/20 to-transparent border border-[#D6A84F]/40 flex items-center justify-center font-black text-[#D6A84F] text-lg shadow-[0_0_15px_rgba(214,168,79,0.2)]">
              L
            </div>
            <span className="font-display font-bold text-[#F8FAFC] tracking-widest uppercase">LUMIÈRE</span>
          </div>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">Redefining the fine dining experience with technology and taste.</p>
        </div>

        {/* Hours */}
        <div>
          <h4 className="text-[#F8FAFC] font-bold text-sm mb-4 tracking-wide uppercase">Opening Hours</h4>
          <p className="text-xs text-[#A1A1AA] mb-1.5">Mon - Thu: 11:00 AM - 10:00 PM</p>
          <p className="text-xs text-[#A1A1AA] mb-1.5">Fri - Sat: 11:00 AM - 11:30 PM</p>
          <p className="text-xs text-[#A1A1AA]">Sunday: 10:00 AM - 9:00 PM</p>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-[#F8FAFC] font-bold text-sm mb-4 tracking-wide uppercase">Contact Us</h4>
          <p className="text-xs text-[#A1A1AA] mb-1.5 flex items-center justify-center md:justify-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#D6A84F]" /> 123 Culinary Avenue, Food District
          </p>
          <p className="text-xs text-[#A1A1AA] mb-1.5 flex items-center justify-center md:justify-start gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#D6A84F]" /> +1 (555) 123-4567
          </p>
          <p className="text-xs text-[#D6A84F] hover:underline cursor-pointer flex items-center justify-center md:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5" /> reservations@lumiere.com
          </p>
        </div>

        {/* Notices */}
        <div>
          <h4 className="text-[#F8FAFC] font-bold text-sm mb-4 tracking-wide uppercase">Notices</h4>
          <p className="text-xs text-[#A1A1AA] mb-2 leading-relaxed bg-[#17181B] p-2.5 rounded-xl border border-[#1D1F23]">
            ⚠️ <strong className="text-[#F8FAFC]">Allergies:</strong> Please inform our staff of any severe food allergies before ordering.
          </p>
          <p className="text-xs text-[#22C55E] font-semibold flex items-center justify-center md:justify-start gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 100% Halal Certified meat used.
          </p>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#1D1F23] text-center">
        <p className="text-xs text-[#71717A]">
          &copy; {new Date().getFullYear()} Lumière Restaurant. All rights reserved. Powered by QR Platform Phase 2.
        </p>
      </div>
    </div>
  );
}

export default BottomInfoBar;