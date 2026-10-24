'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  CircleCheck,
  CircleAlert,
  Sparkles,
  Loader2,
  Clock,
  Flame,
  Box,
  RefreshCw,
} from 'lucide-react';

import CustomerLayout from '../../../../components/customer/CustomerLayout';
import Model3DViewer from '../../../../components/customer/Model3DViewer';
import { useCart } from '../../../../context/CartContext';
import { useTableContext } from '../../../../context/TableContext';
import { menuService } from '../../../../services/menu.service';
import { getArAssetForItem, trackArEvent, ArAssetData } from '../../../../services/ar.service';
import { MenuItem } from '@qr-menu/shared';

export default function FoodDetailsPage() {
  const params = useParams();
  const itemId = String(params?.id ?? '');

  const { addToCart, favorites, toggleFavorite } = useCart();
  const { restaurantId } = useTableContext();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [suggestions, setSuggestions] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [added, setAdded] = useState(false);
  const [arAsset, setArAsset] = useState<ArAssetData | null>(null);

  const isFavorite = item ? favorites.includes(item.id) : false;

  const loadDish = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetched = await menuService.getMenuItem(itemId);
      setItem(fetched);

      if ((fetched as any)?.arAsset) {
        setArAsset((fetched as any).arAsset);
      }
    } catch (err: any) {
      console.error('[FoodDetailsPage] Failed to load dish details:', err);
      setError(err?.message || 'Unable to load dish details. Please check your network connection.');
    } finally {
      setLoading(false);
    }

    // Attempt to fetch dedicated AR asset metadata if available
    try {
      const asset = await getArAssetForItem(itemId);
      if (asset) {
        setArAsset(asset);
      }
    } catch (err) {
      console.warn('[FoodDetailsPage] Optional AR asset fetch error:', err);
    }
  }, [itemId]);

  useEffect(() => {
    loadDish();
  }, [loadDish]);

  // Load suggestions independently so restaurantId changes do not restart dish loading
  useEffect(() => {
    let isMounted = true;
    if (!itemId) return;

    menuService
      .getMenuItems(restaurantId || undefined)
      .then((all) => {
        if (isMounted) {
          setSuggestions(all.filter((i) => i.id !== itemId).slice(0, 3));
        }
      })
      .catch(() => {
        // Non-critical suggestions failure
      });

    return () => {
      isMounted = false;
    };
  }, [itemId, restaurantId]);

  const handleArEvent = useCallback(
    (eventType: string) => {
      if (restaurantId) {
        trackArEvent({
          restaurantId,
          menuItemId: itemId,
          assetId: arAsset?.id,
          eventType,
          deviceType: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop') : undefined,
          arSupported: typeof navigator !== 'undefined' ? ('xr' in navigator) : false,
        });
      }
    },
    [restaurantId, itemId, arAsset]
  );

  const handleAddToCart = () => {
    if (!item || item.isAvailable === false) return;

    addToCart(item, quantity, instructions);
    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1800);
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(20, current + 1));
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-gold)]" />
            </div>
            <h1 className="mt-5 text-lg font-black text-[var(--text-primary)]">Loading dish details</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Please wait a moment...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (error) {
    return (
      <CustomerLayout>
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <CircleAlert className="h-6 w-6 text-red-400" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[var(--text-primary)]">Unable to load dish</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={loadDish}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-black transition hover:brightness-105"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-5 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-gold)]/30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Menu
              </Link>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!item) {
    return (
      <CustomerLayout>
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10">
              <CircleAlert className="h-6 w-6 text-[var(--accent-orange)]" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[var(--text-primary)]">Food item not found</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This menu item could not be found or is no longer available.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-black"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Menu
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const activeAr: ArAssetData | null =
    arAsset ||
    ((item as any)?.arAsset as ArAssetData) ||
    (item.hasAr && item.modelUrl
      ? {
          id: item.id,
          name: item.name,
          modelUrl: item.modelUrl,
          previewImage: item.image,
          widthCm: 20,
          heightCm: 8,
          depthCm: 20,
          portionLabel: 'Sample – avocado placeholder',
          scale: 1,
          status: 'ACTIVE',
        }
      : null);

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
        </div>

        {/* Main details */}
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Image / 3D Viewer */}
          <div className="relative">
            {activeAr ? (
              /* AR asset available — show 3D viewer */
              <div>
                <Model3DViewer
                  modelUrl={activeAr.modelUrl}
                  iosModelUrl={activeAr.iosModelUrl}
                  previewImage={activeAr.previewImage || item.image}
                  name={item.name}
                  scale={activeAr.scale}
                  widthCm={activeAr.widthCm}
                  heightCm={activeAr.heightCm}
                  depthCm={activeAr.depthCm}
                  portionLabel={activeAr.portionLabel}
                  isSample={Boolean(activeAr.name?.toLowerCase().includes('sample') || activeAr.modelUrl?.includes('avocado.glb') || activeAr.portionLabel?.toLowerCase().includes('sample'))}
                  onEvent={handleArEvent}
                />
                {/* Favorite button overlaid */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(item.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-md transition ${
                    isFavorite
                      ? 'border-red-400/30 bg-red-500/10 text-red-400'
                      : 'border-white/10 bg-black/55 text-white hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]'
                  }`}
                >
                  <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            ) : (
              /* No AR asset — standard image with coming soon badge */
              <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)]">
                <div className="aspect-[4/3] min-h-[320px]">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* 3D view coming soon badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-slate-950/80 px-3.5 py-2 text-xs font-semibold text-amber-300 backdrop-blur-md shadow-md">
                  <Box className="h-4 w-4 text-amber-400" />
                  <span>3D view coming soon</span>
                </div>

                {item.badge && (
                  <div className="absolute left-4 top-4 rounded-full border border-[var(--accent-gold)]/30 bg-black/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-gold)] backdrop-blur-md">
                    {item.badge}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleFavorite(item.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-md transition ${
                    isFavorite
                      ? 'border-red-400/30 bg-red-500/10 text-red-400'
                      : 'border-white/10 bg-black/55 text-white hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]'
                  }`}
                >
                  <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 lg:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                <span>{item.categoryId?.replace(/^cat-/, '').toUpperCase() || 'MAIN'}</span>
                <span className="text-[var(--text-muted)]">•</span>
                <span>Silver Sapoon</span>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {item.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
                  <Star className="h-4 w-4 text-[var(--accent-gold)]" fill="currentColor" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {item.rating ? item.rating.toFixed(1) : '4.8'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">({item.reviewCount || 120})</span>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <Clock className="h-4 w-4 text-[var(--accent-gold)]" />
                  <span>
                    {item.prepTimeMin || 15}-{item.prepTimeMax || 25} min
                  </span>
                </div>

                {item.isAvailable !== false ? (
                  <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-500">
                    <CircleCheck className="h-4 w-4" />
                    Available Now
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                    <CircleAlert className="h-4 w-4" />
                    Currently Unavailable
                  </div>
                )}
              </div>

              <p className="mt-6 text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>

              {/* Nutrition Highlights if present */}
              {item.nutrition && (
                <div className="mt-5 grid grid-cols-4 gap-2 border border-[var(--border-color)] rounded-xl p-3 bg-[var(--bg-elevated)]">
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Calories</div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.nutrition.calories} kcal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Protein</div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.nutrition.protein || 0}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Carbs</div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.nutrition.carbs || 0}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Fat</div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.nutrition.fat || 0}g</div>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="mt-6 border-y border-[var(--border-color)] py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Price
                </div>
                <div className="mt-1 text-3xl font-black text-[var(--accent-gold)]">
                  Rs. {Number(item.price).toLocaleString('en-PK')}
                </div>
              </div>

              {/* Quantity */}
              <div className="mt-5">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Quantity
                </div>

                <div className="inline-flex items-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)]">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <div className="flex h-10 min-w-12 items-center justify-center border-x border-[var(--border-color)] px-4 text-sm font-bold text-[var(--text-primary)]">
                    {quantity}
                  </div>

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={quantity >= 20}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-5">
                <label
                  htmlFor="special-instructions"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]"
                >
                  Special Instructions
                </label>

                <textarea
                  id="special-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Less spicy, no onions, extra sauce..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-gold)]/40"
                />
              </div>
            </div>

            {/* Add */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={item.isAvailable === false}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] px-5 text-sm font-black text-black shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:grayscale disabled:opacity-50"
            >
              {added ? (
                <>
                  <CircleCheck className="h-5 w-5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  Add {quantity} to Cart (Rs. {(Number(item.price) * quantity).toLocaleString('en-PK')})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pairing */}
        {suggestions.length > 0 && (
          <section className="mt-10">
            <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                <Sparkles className="h-4 w-4" />
                AI Pairing
              </div>

              <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Frequently Ordered Together</h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Complete your meal with a few complementary choices.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.id}
                    href={`/menu/item/${encodeURIComponent(suggestion.id)}`}
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 transition hover:border-[var(--accent-gold)]/30 hover:scale-[1.01]"
                  >
                    <img
                      src={suggestion.image}
                      alt={suggestion.name}
                      className="h-16 w-16 rounded-xl object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)]">
                        {suggestion.name}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-[var(--accent-gold)]">
                        Rs. {Number(suggestion.price).toLocaleString('en-PK')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </CustomerLayout>
  );
}