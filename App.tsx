import React, { useState, useEffect } from 'react';
import { Page, CartItem, Medicine } from './types.ts';
import Header from './components/Header.tsx';
import Home from './pages/Home.tsx';
import SearchPage from './pages/SearchPage.tsx';
import UploadPage from './pages/UploadPage.tsx';
import CallPage from './pages/CallPage.tsx';
import CartPage from './pages/CartPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    try {
      const hash = window.location.hash.replace('#', '') as Page;
      return Object.values(Page).includes(hash) ? hash : Page.HOME;
    } catch {
      return Page.HOME;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('shanti_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('shanti_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const page = event.state?.page as Page;
      if (page && Object.values(Page).includes(page)) {
        setCurrentPage(page);
      } else {
        const hash = window.location.hash.replace('#', '') as Page;
        if (Object.values(Page).includes(hash)) setCurrentPage(hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: Page) => {
    window.history.pushState({ page }, '', `#${page}`);
    setCurrentPage(page);
  };

  const addMultipleToCart = (items: { medicine: Medicine; quantity: number }[]) => {
    setCart(prev => {
      let nextCart = [...prev];
      items.forEach(({ medicine, quantity }) => {
        const existingIndex = nextCart.findIndex(item => item.medicine.name === medicine.name);
        if (existingIndex > -1) {
          nextCart[existingIndex] = { ...nextCart[existingIndex], quantity: nextCart[existingIndex].quantity + quantity };
        } else {
          nextCart.push({ medicine, quantity });
        }
      });
      return nextCart;
    });
    navigateTo(Page.CART);
  };

  const removeFromCart = (name: string) => {
    setCart(prev => prev.filter(item => item.medicine.name !== name));
  };

  const updateQuantity = (name: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicine.name === name) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const setQuantity = (name: string, quantity: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicine.name === name) {
        // Allow 0 here so user can clear the input and type
        return { ...item, quantity: Math.max(0, quantity) };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME: return <Home onNavigate={navigateTo} />;
      case Page.SEARCH: return <SearchPage onBack={() => window.history.back()} onAddMultipleToCart={addMultipleToCart} />;
      case Page.UPLOAD: return <UploadPage onBack={() => window.history.back()} />;
      case Page.CALL: return <CallPage onBack={() => window.history.back()} />;
      case Page.CART: return <CartPage cart={cart} onBack={() => window.history.back()} onRemove={removeFromCart} onUpdateQty={updateQuantity} onSetQty={setQuantity} onNavigate={navigateTo} onClearCart={clearCart} />;
      case Page.ADMIN: return <AdminPage onBack={() => window.history.back()} />;
      case Page.HISTORY: return <HistoryPage onBack={() => window.history.back()} onNavigate={navigateTo} />;
      default: return <Home onNavigate={navigateTo} />;
    }
  };

  const navItems = [
    { id: Page.HOME, label: 'হোম', icon: 'fa-solid fa-house-chimney' },
    { id: Page.SEARCH, label: 'অর্ডার', icon: 'fa-solid fa-square-plus' },
    { id: Page.CART, label: 'কার্ট', icon: 'fa-solid fa-basket-shopping', badge: cart.length },
    { id: Page.HISTORY, label: 'হিস্টরি', icon: 'fa-solid fa-clock-rotate-left' },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[var(--bg-app)] shadow-2xl relative transition-colors duration-300">
      <Header onHome={() => navigateTo(Page.HOME)} onAdminAccess={() => navigateTo(Page.ADMIN)} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
      {currentPage !== Page.ADMIN && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-slate-900/95 backdrop-blur-xl flex justify-around items-center py-3 px-2 z-[60] shadow-2xl rounded-[2.5rem] border border-white/10 no-print">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => navigateTo(item.id)} className={`relative flex flex-col items-center justify-center py-2 px-5 transition-all rounded-2xl ${currentPage === item.id ? 'bg-white/10 text-white scale-110' : 'text-slate-500'}`}>
              <div className="relative">
                <i className={`${item.icon} text-xl`}></i>
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-black border-2 border-slate-900">{item.badge}</span>
                )}
              </div>
              <span className="text-[10px] font-black mt-1 uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default App;