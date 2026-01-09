import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

/** 
 * TYPES 
 */
interface Medicine {
  id: string;
  name: string;
  category: string;
  price?: number;
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface User {
  phone: string;
  password: string;
  createdAt: number;
}

interface Order {
  id: string;
  timestamp: number;
  type: 'prescription' | 'cart';
  items?: CartItem[];
  imageUrl?: string;
  deliveryAddress: string;
  deliveryCharge: number;
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
}

enum Page {
  HOME = 'home',
  SEARCH = 'search',
  UPLOAD = 'upload',
  CART = 'cart',
  HISTORY = 'history',
  ADMIN = 'admin'
}

const MIN_ORDER_AMOUNT = 250;

/**
 * AI SERVICES
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

async function interpretNoteAI(note: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `আপনি একজন ফার্মাসিস্ট। নিচের ওষুধের লিস্ট বিশ্লেষণ করুন: "${note}"। 
      প্রতিটি ওষুধের নাম এবং বাংলাদেশে বর্তমান সঠিক বাজারমূল্য (MRP) বের করুন। 
      ফলাফল JSON ফরম্যাটে দিন: {"items": [{"name": "ওষুধের নাম", "price": 10, "category": "ট্যাবলেট"}]}`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : "{\"items\":[]}");
  } catch (e) {
    console.error("AI Error:", e);
    return { items: [] };
  }
}

async function analyzePrescriptionAI(base64Image: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } },
        { text: "এই প্রেসক্রিপশনটি বিশ্লেষণ করুন। ওষুধের নাম এবং আনুমানিক মূল্য JSON ফরম্যাটে দিন: {\"items\": [{\"name\": \"...\", \"price\": 0}]}" }
      ],
      config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : "{\"items\":[]}");
  } catch (e) {
    console.error("AI Error:", e);
    return { items: [] };
  }
}

/**
 * UI COMPONENTS
 */
const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  className?: string;
  icon?: string;
  disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', className = '', icon, disabled = false }) => {
  const variants = {
    primary: "bg-red-600 text-white border-b-4 border-red-800",
    secondary: "bg-blue-600 text-white border-b-4 border-blue-800",
    danger: "bg-rose-500 text-white border-b-4 border-rose-700",
    success: "bg-emerald-600 text-white border-b-4 border-emerald-800",
    outline: "bg-white text-slate-700 border-2 border-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700"
  };

  return (
    <button 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full py-4 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:translate-y-1 active:border-b-0 ${variants[variant]} ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'} ${className}`}
    >
      {icon && <i className={icon}></i>}
      {children}
    </button>
  );
};

const ActionCard: React.FC<{ icon: string; title: string; desc: string; color: string; onClick: () => void }> = ({ icon, title, desc, color, onClick }) => (
  <button onClick={onClick} className="clay-card p-6 rounded-3xl flex items-center gap-6 active:scale-95 transition-all text-left group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${color}`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-black group-hover:text-red-600 transition-colors">{title}</h3>
      <p className="text-xs text-slate-400 font-bold">{desc}</p>
    </div>
  </button>
);

/**
 * MAIN APP COMPONENT
 */
const App: React.FC = () => {
  const [page, setPage] = useState<Page>(Page.HOME);
  const [cart, setCart] = useState<CartItem[]>(() => JSON.parse(localStorage.getItem('shanti_cart') || '[]'));
  const [orders, setOrders] = useState<Order[]>(() => JSON.parse(localStorage.getItem('shanti_orders') || '[]'));
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const adminTimerRef = useRef<number | null>(null);

  useEffect(() => localStorage.setItem('shanti_cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('shanti_orders', JSON.stringify(orders)), [orders]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const startAdminAccess = () => { adminTimerRef.current = window.setTimeout(() => setPage(Page.ADMIN), 3000); };
  const stopAdminAccess = () => { if (adminTimerRef.current) clearTimeout(adminTimerRef.current); };

  const addToCart = (medicine: Medicine, quantity: number = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.medicine.name === medicine.name);
      if (idx > -1) {
        const next = [...prev];
        next[idx].quantity += quantity;
        return next;
      }
      return [...prev, { medicine, quantity }];
    });
    setPage(Page.CART);
  };

  const removeFromCart = (name: string) => setCart(prev => prev.filter(i => i.medicine.name !== name));

  const updateOrder = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
    localStorage.setItem('shanti_orders', JSON.stringify(updatedOrders));
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative bg-[var(--bg-app)] pb-32">
      {/* Header */}
      <header className="sticky top-0 glass z-50 px-5 py-3 flex items-center justify-between shadow-sm no-print">
        <div 
          onClick={() => setPage(Page.HOME)}
          onMouseDown={startAdminAccess}
          onMouseUp={stopAdminAccess}
          onTouchStart={startAdminAccess}
          onTouchEnd={stopAdminAccess}
          className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all"
        >
          <img src="https://raw.githubusercontent.com/AnisurRahman-Anis/medicine-logo/main/shanti-logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg shadow-sm" />
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-red-600 leading-none">শান্তি</h1>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">মেডিকেয়ার</span>
          </div>
        </div>
        <button onClick={toggleDark} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {isDark ? <i className="fa-solid fa-sun text-amber-400"></i> : <i className="fa-solid fa-moon text-blue-500"></i>}
        </button>
      </header>

      {/* Page Content */}
      <main className="p-6">
        {page === Page.HOME && <HomePage onNavigate={setPage} />}
        {page === Page.SEARCH && <SearchPage onBack={() => setPage(Page.HOME)} onAdd={addToCart} />}
        {page === Page.UPLOAD && <UploadPage onBack={() => setPage(Page.HOME)} onComplete={() => setPage(Page.HISTORY)} />}
        {page === Page.CART && <CartPage cart={cart} setCart={setCart} onNavigate={setPage} onOrder={() => setPage(Page.HISTORY)} />}
        {page === Page.HISTORY && <HistoryPage orders={orders} onBack={() => setPage(Page.HOME)} />}
        {page === Page.ADMIN && <AdminPage orders={orders} setOrders={updateOrder} onBack={() => setPage(Page.HOME)} />}
      </main>

      {/* Navigation */}
      {page !== Page.ADMIN && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass rounded-3xl p-2 flex justify-around shadow-2xl z-40 no-print">
          {[
            { id: Page.HOME, icon: 'fa-house', label: 'হোম' },
            { id: Page.SEARCH, icon: 'fa-magnifying-glass', label: 'খুঁজুন' },
            { id: Page.CART, icon: 'fa-basket-shopping', label: 'কার্ট', badge: cart.length },
            { id: Page.HISTORY, icon: 'fa-clock-rotate-left', label: 'হিস্টরি' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setPage(item.id as Page)}
              className={`relative flex flex-col items-center p-3 rounded-2xl transition-all ${page === item.id ? 'text-red-600' : 'text-slate-400'}`}
            >
              <i className={`fa-solid ${item.icon} text-lg`}></i>
              <span className="text-[8px] font-black uppercase mt-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black px-1 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

/**
 * PAGE COMPONENTS
 */

const HomePage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="clay-card rounded-[3rem] p-10 text-center space-y-4">
      <h2 className="text-8xl font-black text-red-600 tracking-tighter">শান্তি</h2>
      <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs">মেডিকেয়ার</p>
      <div className="bg-red-50 dark:bg-red-900/10 py-2 px-6 rounded-full inline-block">
        <p className="text-red-700 dark:text-red-400 font-black italic">"স্বাস্থ্যের পাশে, শান্তির সাথে"</p>
      </div>
    </div>
    <div className="grid gap-4">
      <ActionCard icon="fa-list-check" title="ওষুধের তালিকা" desc="নাম লিখে অর্ডার করুন" color="text-red-600 bg-red-50" onClick={() => onNavigate(Page.SEARCH)} />
      <ActionCard icon="fa-camera" title="প্রেসক্রিপশন আপলোড" desc="ছবি তুলে পাঠান" color="text-emerald-600 bg-emerald-50" onClick={() => onNavigate(Page.UPLOAD)} />
      <ActionCard icon="fa-phone" title="সরাসরি কল দিন" desc="01717477765" color="text-blue-600 bg-blue-50" onClick={() => window.open('tel:01717477765')} />
    </div>
  </div>
);

const SearchPage: React.FC<{ onBack: () => void; onAdd: (m: Medicine, q: number) => void }> = ({ onBack, onAdd }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleProcess = async () => {
    if (!note.trim()) return;
    setLoading(true);
    const data = await interpretNoteAI(note);
    setResults(data.items || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 clay-card rounded-xl flex items-center justify-center"><i className="fa-solid fa-chevron-left"></i></button>
        <h2 className="text-2xl font-black">ওষুধ খুঁজুন</h2>
      </div>
      <div className="clay-card p-4 rounded-2xl space-y-4">
        <textarea 
          placeholder="যেমন: নাপা ৫টা, সেকলো ১ পাতা..." 
          className="w-full h-32 bg-transparent outline-none font-bold text-lg resize-none"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <Button onClick={handleProcess} disabled={loading} icon={loading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-wand-magic-sparkles"}>
          {loading ? "যাচাই হচ্ছে..." : "লিস্ট তৈরি করুন"}
        </Button>
      </div>
      {results.map((item, i) => (
        <div key={i} className="clay-card p-5 rounded-2xl flex justify-between items-center border-l-8 border-l-red-600">
          <div>
            <h4 className="font-black">{item.name}</h4>
            <p className="text-red-600 font-bold">৳{item.price}</p>
          </div>
          <button onClick={() => onAdd({ id: Math.random().toString(), name: item.name, price: item.price, category: item.category || 'General' }, 1)} className="w-10 h-10 bg-red-600 text-white rounded-xl shadow-lg"><i className="fa-solid fa-plus"></i></button>
        </div>
      ))}
    </div>
  );
};

const UploadPage: React.FC<{ onBack: () => void; onComplete: () => void }> = ({ onBack, onComplete }) => {
  const [image, setImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOrder = () => {
    if (!image || !address) return alert("সব তথ্য দিন");
    setLoading(true);
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: Date.now(),
      type: 'prescription',
      imageUrl: image,
      deliveryAddress: address,
      deliveryCharge: 20,
      paymentMethod: 'COD',
      senderNumber: 'Manual',
      transactionId: 'PRE-PAID',
      status: 'pending'
    };
    const saved = JSON.parse(localStorage.getItem('shanti_orders') || '[]');
    localStorage.setItem('shanti_orders', JSON.stringify([newOrder, ...saved]));
    setTimeout(() => { setLoading(false); onComplete(); }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 clay-card rounded-xl flex items-center justify-center"><i className="fa-solid fa-chevron-left"></i></button>
        <h2 className="text-2xl font-black">প্রেসক্রিপশন আপলোড</h2>
      </div>
      {!image ? (
        <label className="w-full h-64 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer">
          <i className="fa-solid fa-camera text-4xl text-slate-300"></i>
          <span className="font-bold text-slate-400">ছবি তুলুন বা আপলোড দিন</span>
          <input type="file" capture="environment" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="space-y-4">
          <img src={image} className="w-full h-64 object-cover rounded-3xl" />
          <textarea placeholder="ডেলিভারি ঠিকানা..." className="clay-card w-full p-4 rounded-2xl outline-none font-bold" value={address} onChange={e => setAddress(e.target.value)} />
          <Button onClick={handleOrder} variant="success" disabled={loading}>{loading ? "অর্ডার হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}</Button>
        </div>
      )}
    </div>
  );
};

const CartPage: React.FC<{ cart: CartItem[]; setCart: (c: CartItem[]) => void; onNavigate: (p: Page) => void; onOrder: () => void }> = ({ cart, setCart, onNavigate, onOrder }) => {
  const [address, setAddress] = useState('');
  const subtotal = cart.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0);

  const handleOrder = () => {
    if (subtotal < MIN_ORDER_AMOUNT) return alert(`নূন্যতম ৳${MIN_ORDER_AMOUNT} অর্ডার প্রয়োজন`);
    if (!address) return alert("ঠিকানা দিন");
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: Date.now(),
      type: 'cart',
      items: cart,
      deliveryAddress: address,
      deliveryCharge: 20,
      paymentMethod: 'COD',
      senderNumber: 'Manual',
      transactionId: 'COD',
      status: 'pending'
    };
    const saved = JSON.parse(localStorage.getItem('shanti_orders') || '[]');
    localStorage.setItem('shanti_orders', JSON.stringify([newOrder, ...saved]));
    setCart([]);
    onOrder();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black">অর্ডার রিভিউ</h2>
      {cart.length === 0 ? (
        <div className="text-center py-20">
          <p className="opacity-30 font-black mb-6">কার্ট খালি</p>
          <Button onClick={() => onNavigate(Page.SEARCH)}>ওষুধ যোগ করুন</Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map((item, i) => (
              <div key={i} className="clay-card p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="font-black">{item.medicine.name}</h4>
                  <p className="text-red-600 font-bold">৳{item.medicine.price} x {item.quantity}</p>
                </div>
                <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-rose-500"><i className="fa-solid fa-trash"></i></button>
              </div>
            ))}
          </div>
          <div className="clay-card p-8 rounded-[2.5rem] space-y-6">
            <div className="flex justify-between font-black text-xl">
              <span>মোট বিল:</span>
              <span className="text-red-600">৳{subtotal}</span>
            </div>
            <textarea placeholder="ডেলিভারি ঠিকানা..." className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 outline-none font-bold" value={address} onChange={e => setAddress(e.target.value)} />
            <Button onClick={handleOrder} variant="success" disabled={subtotal < MIN_ORDER_AMOUNT}>
              {subtotal < MIN_ORDER_AMOUNT ? `আরও ৳${MIN_ORDER_AMOUNT - subtotal} লাগবে` : "অর্ডার নিশ্চিত করুন"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const HistoryPage: React.FC<{ orders: Order[]; onBack: () => void }> = ({ orders, onBack }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="w-10 h-10 clay-card rounded-xl flex items-center justify-center"><i className="fa-solid fa-chevron-left"></i></button>
      <h2 className="text-2xl font-black">অর্ডার হিস্টরি</h2>
    </div>
    {orders.length === 0 ? (
      <div className="text-center py-20 opacity-30 font-black">কোনো অর্ডার নেই</div>
    ) : (
      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} className="clay-card p-6 rounded-2xl border-l-[12px] border-l-red-600">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-black text-lg">আইডি: #{o.id}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(o.timestamp).toLocaleString('bn-BD')}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${o.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {o.status}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between font-black">
              <span>টোটাল:</span>
              <span className="text-red-600">৳{(o.items?.reduce((a, i) => a + (i.medicine.price || 0) * i.quantity, 0) || 0) + o.deliveryCharge}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const AdminPage: React.FC<{ orders: Order[]; setOrders: (o: Order[]) => void; onBack: () => void }> = ({ orders, setOrders, onBack }) => {
  const [selected, setSelected] = useState<Order | null>(null);

  const updateStatus = (id: string, s: Order['status']) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: s } : o);
    setOrders(updated);
    if (selected?.id === id) setSelected({ ...selected, status: s });
  };

  const deleteOrder = (id: string) => {
    if (confirm("অর্ডারটি মুছে ফেলতে চান?")) {
      const updated = orders.filter(o => o.id !== id);
      setOrders(updated);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">অ্যাডমিন প্যানেল</h2>
        <button onClick={onBack} className="text-red-500 font-black">বন্ধ করুন</button>
      </div>
      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} onClick={() => setSelected(o)} className={`clay-card p-5 rounded-2xl flex justify-between items-center border-l-8 cursor-pointer active:scale-95 transition-all ${o.status === 'pending' ? 'border-amber-500' : 'border-emerald-500'}`}>
            <div>
              <h4 className="font-black text-lg">#{o.id} • {o.type === 'prescription' ? 'Prescription' : 'Cart'}</h4>
              <p className="text-[10px] opacity-50 font-bold uppercase">{new Date(o.timestamp).toLocaleTimeString()}</p>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-300"></i>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end animate-in slide-in-from-bottom duration-300 no-print">
          <div className="w-full max-w-md mx-auto bg-[var(--bg-app)] rounded-t-[3rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black">অর্ডার ডিটেইলস</h3>
              <button onClick={() => setSelected(null)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="clay-card p-6 rounded-[2rem] border-l-[10px] border-l-blue-600">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">ডেলিভারি ঠিকানা</p>
              <p className="font-black text-slate-800 dark:text-slate-100 italic leading-relaxed">" {selected.deliveryAddress} "</p>
            </div>

            {selected.items && (
              <div className="clay-card p-6 rounded-[2rem] border-l-[10px] border-l-emerald-600">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">ওষুধের তালিকা</p>
                <div className="space-y-2">
                  {selected.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between font-bold border-b border-slate-50 dark:border-slate-800 py-1">
                      <span>{i.medicine.name} x {i.quantity}</span>
                      <span>৳{(i.medicine.price || 0) * i.quantity}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-black text-xl text-emerald-600">
                    <span>মোট বিল:</span>
                    <span>৳{(selected.items.reduce((a, i) => a + (i.medicine.price || 0) * i.quantity, 0)) + selected.deliveryCharge}</span>
                  </div>
                </div>
              </div>
            )}

            {selected.imageUrl && (
              <div className="clay-card p-6 rounded-[2rem] border-l-[10px] border-l-orange-500">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">প্রেসক্রিপশন কপি</p>
                <img src={selected.imageUrl} className="w-full rounded-2xl cursor-zoom-in" onClick={() => window.open(selected.imageUrl, '_blank')} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => updateStatus(selected.id, 'confirmed')} variant="secondary" icon="fa-solid fa-check">কনফার্ম</Button>
              <Button onClick={() => updateStatus(selected.id, 'delivered')} variant="success" icon="fa-solid fa-truck">ডেলিভারড</Button>
            </div>
            
            <button 
              onClick={() => deleteOrder(selected.id)} 
              className="w-full py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest border-2 border-rose-50 rounded-2xl"
            >
              ডিলিট করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * RENDER
 */
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}