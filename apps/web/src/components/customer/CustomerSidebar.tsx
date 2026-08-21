'use client';

import React, { useState } from 'react';
import {
  Home,
  UtensilsCrossed,
  Tag,
  Heart,
  ShoppingBag,
  MapPin,
  Gift,
  Headphones,
  ChevronDown,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';
import { useCartContext } from '../../context/CartContext';

export function CustomerSidebar() {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [activeItem, setActiveItem] = useState('Home');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { openDrawer } = useCartContext();

  const categories = [
    { id: 'appetizers', name: 'Starters / Appetizers' },
    { id: 'mains', name: 'Main Courses' },
    { id: 'pizza', name: 'Pizza & Pasta' },
    { id: 'burgers', name: 'Burgers & Wraps' },
    { id: 'drinks', name: 'Beverages & Drinks' },
    { id: 'desserts', name: 'Desserts & Sweets' },
  ];

  const handleNavClick = (itemName: string, sectionId?: string) => {
    setActiveItem(itemName);
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-zinc-950 border-r border-zinc-800/80 p-5 z-30 overflow-y-auto custom-scrollbar">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-black text-amber-400 text-lg shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            L
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider text-white uppercase">LUMIÈRE</h2>
            <p className="text-[9px] text-amber-400 font-semibold tracking-widest uppercase -mt-1">Fine Dining</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1.5 text-xs font-semibold">
          {/* Home */}
          <button
            onClick={() => handleNavClick('Home', 'hero')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeItem === 'Home'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <Home className="w-4 h-4 stroke-[2]" />
            <span>Home</span>
          </button>

          {/* All Menu */}
          <button
            onClick={() => handleNavClick('All Menu', 'menu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeItem === 'All Menu'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <UtensilsCrossed className="w-4 h-4 stroke-[2]" />
            <span>All Menu</span>
          </button>

          {/* Expandable Categories Item */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 stroke-[2]" />
                <span>Categories</span>
              </div>
              {isCategoriesOpen ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* Sub-Categories Submenu */}
            {isCategoriesOpen && (
              <div className="pl-9 pr-2 space-y-1 border-l-2 border-zinc-800/80 ml-5 py-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleNavClick(cat.name, 'menu')}
                    className="w-full text-left py-2 px-3 text-[11px] text-zinc-400 hover:text-amber-300 hover:bg-zinc-900/60 rounded-xl transition-all truncate block"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Offers */}
          <button
            onClick={() => handleNavClick('Offers', 'offers')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeItem === 'Offers'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 stroke-[2]" />
              <span>Offers</span>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full">
              New
            </span>
          </button>

          {/* Favorites */}
          <button
            onClick={() => { setActiveItem('Favorites'); setActiveModal('Favorites'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeItem === 'Favorites'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <Heart className="w-4 h-4 stroke-[2]" />
            <span>Favorites</span>
          </button>

          {/* Orders */}
          <button
            onClick={() => { setActiveItem('Orders'); openDrawer(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2]" />
            <span>Orders</span>
          </button>

          {/* Track Order */}
          <button
            onClick={() => { setActiveItem('Track Order'); setActiveModal('Track Order'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeItem === 'Track Order'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <MapPin className="w-4 h-4 stroke-[2]" />
            <span>Track Order</span>
          </button>

          {/* Rewards */}
          <button
            onClick={() => { setActiveItem('Rewards'); setActiveModal('Rewards'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeItem === 'Rewards'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <Gift className="w-4 h-4 stroke-[2]" />
            <span>Rewards</span>
          </button>

          {/* Contact Us */}
          <button
            onClick={() => handleNavClick('Contact Us', 'about')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeItem === 'Contact Us'
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
          >
            <Headphones className="w-4 h-4 stroke-[2]" />
            <span>Contact Us</span>
          </button>
        </nav>

        {/* Get the App Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-2">
          <h4 className="text-xs font-bold text-white">Get the App</h4>
          <p className="text-[10px] text-zinc-400 leading-tight">Order faster & earn rewards</p>
          <button
            onClick={() => setActiveModal('App Download')}
            className="w-full py-2 bg-zinc-800 hover:bg-amber-500 hover:text-black text-white text-[11px] font-bold rounded-xl transition-all"
          >
            Download
          </button>
        </div>
      </aside>

      {/* Information Modal Popup */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                {activeModal === 'Favorites' && <Heart className="w-6 h-6" />}
                {activeModal === 'Track Order' && <MapPin className="w-6 h-6" />}
                {activeModal === 'Rewards' && <Gift className="w-6 h-6" />}
                {activeModal === 'App Download' && <ShoppingBag className="w-6 h-6" />}
              </div>

              <h3 className="text-base font-bold text-white">{activeModal}</h3>
              <p className="text-xs text-zinc-400">
                {activeModal === 'Favorites' && 'Your bookmarked dishes will appear here.'}
                {activeModal === 'Track Order' && 'Enter your order ID or scan table QR to track live status.'}
                {activeModal === 'Rewards' && 'You currently have 150 Lumière Loyalty Points available.'}
                {activeModal === 'App Download' && 'iOS & Android App launching soon on App Store!'}
              </p>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerSidebar;