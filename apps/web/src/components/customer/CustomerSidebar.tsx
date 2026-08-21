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
  X,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useCartContext } from '../../context/CartContext';
import { useFavoritesContext } from '../../context/FavoritesContext';
import { useTableContext } from '../../context/TableContext';
import { mockMenuItems } from '../../data/mockMenuData';

export function CustomerSidebar() {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [activeItem, setActiveItem] = useState('Home');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [redeemedRewards, setRedeemedRewards] = useState<number[]>([]);
  const [trackStep, setTrackStep] = useState(2); // In Kitchen by default

  const { openDrawer, addItem } = useCartContext();
  const { favorites, toggleFavorite } = useFavoritesContext();
  const { tableNumber } = useTableContext();

  const favoriteItems = mockMenuItems.filter((item) => favorites.includes(item.id));

  const categories = [
    { id: 'appetizers', name: 'Starters / Appetizers' },
    { id: 'mains', name: 'Main Courses' },
    { id: 'pizza', name: 'Pizza & Pasta' },
    { id: 'burgers', name: 'Burgers & Wraps' },
    { id: 'drinks', name: 'Beverages & Drinks' },
    { id: 'desserts', name: 'Desserts & Sweets' },
  ];

  const rewardPerks = [
    { id: 1, points: 100, title: 'Free Artisan Dessert', desc: 'Redeem for any chocolate lava cake or panna cotta.' },
    { id: 2, points: 200, title: '20% Off Total Bill', desc: 'Valid for your current dining table session.' },
    { id: 3, points: 300, title: 'Chef Special Cocktail', desc: 'Complimentary mocktail or signature cocktail.' },
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

  const handleClaimReward = (id: number) => {
    setRedeemedRewards((prev) => [...prev, id]);
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-zinc-950 border-r border-zinc-800/80 p-5 z-30 overflow-y-auto custom-scrollbar transition-colors">
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'Home'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Home className="w-4 h-4 stroke-[2]" />
            <span>Home</span>
          </button>

          {/* All Menu */}
          <button
            onClick={() => handleNavClick('All Menu', 'menu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'All Menu'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 stroke-[2]" />
            <span>All Menu</span>
          </button>

          {/* Expandable Categories Item */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all"
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'Offers'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
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
            onClick={() => {
              setActiveItem('Favorites');
              setActiveModal('Favorites');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'Favorites'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 stroke-[2]" />
              <span>Favorites</span>
            </div>
            {favorites.length > 0 && (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                {favorites.length}
              </span>
            )}
          </button>

          {/* Orders */}
          <button
            onClick={() => {
              setActiveItem('Orders');
              openDrawer();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2]" />
            <span>Orders / Cart</span>
          </button>

          {/* Track Order */}
          <button
            onClick={() => {
              setActiveItem('Track Order');
              setActiveModal('Track Order');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'Track Order'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <MapPin className="w-4 h-4 stroke-[2]" />
            <span>Track Order</span>
          </button>

          {/* Rewards */}
          <button
            onClick={() => {
              setActiveItem('Rewards');
              setActiveModal('Rewards');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'Rewards'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Gift className="w-4 h-4 stroke-[2]" />
              <span>Rewards</span>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500 text-black rounded-full">
              150 pts
            </span>
          </button>

          {/* Contact Us */}
          <button
            onClick={() => handleNavClick('Contact Us', 'about')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeItem === 'Contact Us'
                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
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

      {/* ── MODALS SYSTEM ── */}

      {/* 1. Favorites Modal */}
      {activeModal === 'Favorites' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Heart className="w-5 h-5 fill-amber-400/20 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">My Favorite Dishes</h3>
                  <p className="text-xs text-zinc-400">{favoriteItems.length} bookmarked items</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-3">
              {favoriteItems.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Heart className="w-12 h-12 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-white">No favorites yet</p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Click the heart icon on any dish in the menu to save your favorites here.
                  </p>
                </div>
              ) : (
                favoriteItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      <p className="text-xs font-bold text-amber-400 mt-0.5">${Number(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          addItem(item, 1);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Remove from favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-all mt-2"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* 2. Track Order Modal */}
      {activeModal === 'Track Order' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Live Order Tracking</h3>
              <p className="text-xs text-zinc-400">
                Table: <span className="text-amber-400 font-bold">{tableNumber || '07'}</span> • Est. Time: <span className="text-emerald-400 font-bold">12-15 Mins</span>
              </p>
            </div>

            {/* Tracking Timeline */}
            <div className="space-y-4 pt-2">
              {[
                { id: 1, label: 'Order Received', desc: 'Sent to kitchen system' },
                { id: 2, label: 'In Kitchen / Preparing', desc: 'Chef is cooking your dishes' },
                { id: 3, label: 'Plating & Quality Check', desc: 'Garnishing and preparing for serving' },
                { id: 4, label: 'Ready for Table', desc: 'Waiter on the way to your table' },
              ].map((step) => {
                const isDone = trackStep >= step.id;
                const isCurrent = trackStep === step.id;
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        isDone
                          ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {isDone ? '✓' : step.id}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isCurrent ? 'text-amber-400 animate-pulse' : isDone ? 'text-white' : 'text-zinc-500'}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. Rewards & Loyalty Modal */}
      {activeModal === 'Rewards' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Points Summary Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Lumière Rewards</p>
                <p className="text-3xl font-black text-white mt-1">150 <span className="text-xs font-medium text-zinc-400">Pts</span></p>
                <p className="text-[10px] text-zinc-400 mt-1">Earn 1 pt per $1 spent on every QR order</p>
              </div>
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>

            {/* Redeemable Perks */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-300">Available Perks</h4>
              {rewardPerks.map((perk) => {
                const isClaimed = redeemedRewards.includes(perk.id);
                return (
                  <div
                    key={perk.id}
                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                          {perk.points} pts
                        </span>
                        <h5 className="text-xs font-bold text-white">{perk.title}</h5>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{perk.desc}</p>
                    </div>

                    <button
                      onClick={() => handleClaimReward(perk.id)}
                      disabled={isClaimed}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        isClaimed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-600 text-black shadow-sm'
                      }`}
                    >
                      {isClaimed ? 'Claimed ✓' : 'Redeem'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. App Download Modal */}
      {activeModal === 'App Download' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
              📱
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Lumière Mobile App</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Install our PWA app directly to your home screen for instant contactless re-ordering and VIP rewards.
              </p>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerSidebar;