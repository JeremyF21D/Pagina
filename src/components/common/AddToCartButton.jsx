import React, { useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';

/**
 * AddToCartButton Component
 * Replicates the viral TikTok/CodePen "Add to Cart" button micro-interaction:
 * 1. Default state: Cart icon + "Comprar"
 * 2. On click:
 *    - Text smoothly slides down
 *    - Shopping cart slides into the center
 *    - A package box drops from above right into the cart with an elastic bounce
 *    - The cart absorbs the impact and zooms off to the right
 *    - Brief success checkmark ("¡Añadido!") appears
 *    - Updates cart and returns to idle
 */
export function AddToCartButton({ productId, stock, className = '', label = 'Añadir' }) {
  const { addToCart } = useCart();
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'animating' | 'done'
  const isBusyRef = useRef(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (stock <= 0 || isBusyRef.current) return;

    isBusyRef.current = true;
    setAnimState('animating');

    // At 850ms, cart is loaded and zooming out -> trigger cart context & header bump
    setTimeout(() => {
      addToCart(productId, 1);

      const cartEl = document.getElementById('sabrina-cart-btn') || document.getElementById('header-cart-btn');
      if (cartEl) {
        cartEl.classList.remove('cart-bump-active');
        void cartEl.offsetWidth; // Force reflow
        cartEl.classList.add('cart-bump-active');

        const badge = document.createElement('div');
        badge.className = 'fly-cart-plus-one';
        badge.innerText = '+1';
        cartEl.appendChild(badge);
        setTimeout(() => badge.remove(), 700);
      }
    }, 850);

    // At 1150ms: show brief "¡Añadido!" checkmark
    setTimeout(() => {
      setAnimState('done');
    }, 1150);

    // At 1800ms: return cleanly to idle state
    setTimeout(() => {
      setAnimState('idle');
      isBusyRef.current = false;
    }, 1800);
  };

  if (stock <= 0) {
    return (
      <button 
        type="button"
        disabled
        className="py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 bg-zinc-800 text-zinc-500 cursor-not-allowed w-full shadow-md select-none"
      >
        <i className="fa-solid fa-ban text-[10px]"></i>
        <span>Agotado</span>
      </button>
    );
  }

  return (
    <button 
      type="button"
      onClick={handleClick}
      disabled={animState !== 'idle'}
      className={`btn-add-cart-anim ${animState === 'animating' ? 'is-animating' : ''} ${animState === 'done' ? 'is-done' : ''} ${className}`}
      title="Añadir repuesto al carrito"
    >
      {/* 1. Default Label: Icon + Text */}
      <span className="btn-label-default">
        <i className="fa-solid fa-cart-plus text-[10px]"></i>
        <span>{label}</span>
      </span>

      {/* 2. Micro-Interaction Track: Cart + Dropping Box */}
      <div className="btn-cart-track" aria-hidden="true">
        <div className="btn-moving-cart">
          {/* SVG Shopping Cart */}
          <svg className="svg-cart-icon" viewBox="0 0 34 26" fill="none">
            <path
              d="M1.5 2.5h4.2l3.4 13.5h14.8l3.2-10H8.2"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="11" cy="21.5" r="2.2" fill="currentColor" />
            <circle cx="22.5" cy="21.5" r="2.2" fill="currentColor" />
          </svg>

          {/* 3D Package Box that drops into basket */}
          <div className="btn-drop-box">
            <div className="btn-drop-box-tape"></div>
          </div>
        </div>
      </div>

      {/* 3. Success Feedback Label */}
      <span className="btn-label-success">
        <i className="fa-solid fa-check text-[10px] text-emerald-300"></i>
        <span>¡Añadido!</span>
      </span>
    </button>
  );
}
