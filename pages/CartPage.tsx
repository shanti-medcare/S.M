import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, MIN_ORDER_AMOUNT, Page, Order } from '../types.ts';
import Button from '../components/Button.tsx';

interface CartPageProps {
  cart: CartItem[];
  onBack: () => void;
  onRemove: (name: string) => void;
  onUpdateQty: (name: string, delta: number) => void;
  onSetQty: (name: string, quantity: number) => void;
  onNavigate: (page: Page) => void;
  onClearCart: () => void;
}

const CartPage: React.FC<CartPageProps> = ({ cart, onBack, onRemove, onUpdateQty, onSetQty, onNavigate, onClearCart }) => {
  const [distance, setDistance] = useState<'1-2' | '3' | '4-5'>(() => (sessionStorage.getItem('shanti_cart_dist') as any) || '1-2');
  const [senderNumber, setSenderNumber] = useState(() => localStorage.getItem('customer_phone') || sessionStorage.getItem('shanti_cart_sender') || '');
  const [transactionId, setTransactionId] = useState(() => sessionStorage.getItem('shanti_cart_txid') || '');
  const [deliveryAddress, setDeliveryAddress] = useState(() => sessionStorage.getItem('shanti_cart_addr') || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  const totalMedicine = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.medicine.price || 0) * (item.quantity || 0), 0);
  }, [cart]);

  const deliveryCharge = distance === '1-2' ? 20 : distance === '3' ? 30 : 40;
  const isEligible = totalMedicine >= MIN_ORDER_AMOUNT;
  const officialPaymentPhone = "01745707133";

  useEffect(() => {
    sessionStorage.setItem('shanti_cart_dist', distance);
    sessionStorage.setItem('shanti_cart_addr', deliveryAddress);
    if (!localStorage.getItem('customer_phone')) {
      sessionStorage.setItem('shanti_cart_sender', senderNumber);
    }
    sessionStorage.setItem('shanti_cart_txid', transactionId);
  }, [distance, deliveryAddress, senderNumber, transactionId]);

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;
    if (cart.some(i => i.quantity <= 0)) {
      alert('ওষুধের পরিমাণ কমপক্ষে ১ হতে হবে।');
      return;
    }
    if (!isEligible) { 
      alert(`দুঃখিত, নূন্যতম ${MIN_ORDER_AMOUNT} টাকার ওষুধ অর্ডার করা বাধ্যতামূলক। আরও ওষুধ যোগ করুন।`); 
      return; 
    }
    if (!deliveryAddress.trim() || !senderNumber.trim() || !transactionId.trim()) {
      setErrors({ 
        address: !deliveryAddress.trim(), 
        number: !senderNumber.trim(), 
        transaction: !transactionId.trim() 
      });
      alert('সবগুলো তথ্য সঠিকভাবে পূরণ করুন।');
      return;
    }

    setIsSubmitting(true);
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: Date.now(),
      type: 'cart',
      items: cart,
      deliveryAddress,
      distance,
      deliveryCharge,
      paymentMethod: 'bkash',
      senderNumber,
      transactionId,
      status: 'pending'
    };

    setTimeout(() => {
      let existingOrders = [];
      try {
        existingOrders = JSON.parse(localStorage.getItem('shanti_orders') || '[]');
      } catch (e) {}
      localStorage.setItem('shanti_orders', JSON.stringify([newOrder, ...existingOrders]));
      onClearCart();
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center animate-in zoom-in-95 duration-500">
        <div className="w-40 h-40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mb-10 shadow-xl border border-emerald-100 dark:border-emerald-800">
          <i className="fa-solid fa-check text-7xl animate-bounce"></i>
        </div>
        <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-8 tracking-tight">অর্ডার সফল!</h2>
        <Button onClick={() => onNavigate(Page.HOME)} variant="success" icon="fa-solid fa-house-chimney" className="h-24 text-2xl">হোমে ফিরে যান</Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-[70vh] animate-in zoom-in duration-500">
        <div className="clay-card w-40 h-40 rounded-[3.5rem] flex items-center justify-center mb-8"><i className="fa-solid fa-basket-shopping text-6xl text-slate-200"></i></div>
        <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-4">কার্ট খালি!</h2>
        <Button onClick={() => onNavigate(Page.SEARCH)} icon="fa-solid fa-plus-circle" variant="primary">ওষুধ যোগ করুন</Button>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-8 py-8 pb-40 animate-in slide-in-from-right-6 duration-500">
      <div className="flex items-center gap-5">
        <button onClick={onBack} className="w-14 h-14 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center active:scale-90 transition-all text-slate-800 dark:text-slate-100"><i className="fa-solid fa-chevron-left text-xl"></i></button>
        <div><h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">অর্ডার রিভিউ</h2><p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">শান্তি মেডিকেয়ার</p></div>
      </div>

      <div className="space-y-4">
        {cart.map((item) => (
          <div key={item.medicine.name} className="clay-card p-6 rounded-[2.5rem] flex items-center gap-5 relative group">
            <button 
              onClick={() => onRemove(item.medicine.name)} 
              className="absolute -top-3 -right-3 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-10 border-4 border-white dark:border-slate-800"
            >
              <i className="fa-solid fa-trash-can text-sm"></i>
            </button>
            <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900 shadow-inner"><i className="fa-solid fa-capsules text-red-600 text-2xl"></i></div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-lg text-slate-800 dark:text-slate-100 truncate leading-tight">{item.medicine.name}</h4>
              <p className="text-red-600 dark:text-red-400 font-black text-sm mt-1">৳{(item.medicine.price || 0) * (item.quantity)}</p>
            </div>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 shadow-inner border border-slate-200 dark:border-slate-800">
              <button onClick={() => onUpdateQty(item.medicine.name, -1)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-800 dark:text-slate-100 font-black active:scale-90">-</button>
              <input 
                type="number" 
                value={item.quantity === 0 ? '' : item.quantity} 
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                  onSetQty(item.medicine.name, isNaN(val) ? 0 : val);
                }}
                className="w-12 text-center font-black text-slate-800 dark:text-slate-100 text-lg bg-transparent border-none focus:ring-0 outline-none"
              />
              <button onClick={() => onUpdateQty(item.medicine.name, 1)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-800 dark:text-slate-100 font-black active:scale-90">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`clay-card p-8 rounded-[3.5rem] space-y-6 border-l-[12px] shadow-xl ${errors.address ? 'border-l-red-600' : 'border-l-orange-500'}`}>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3"><i className="fa-solid fa-location-dot text-orange-500"></i> ডেলিভারি লোকেশন</h3>
        <textarea placeholder="বিস্তারিত ঠিকানা লিখুন..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className={`w-full h-32 p-6 rounded-[2.5rem] border-2 outline-none font-bold text-lg text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 ${errors.address ? 'border-red-500' : 'border-slate-100'}`} />
      </div>

      <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">মোট ওষুধের দাম</span>
            <span className="text-[10px] text-slate-500 uppercase font-black">(পণ্য বুঝে পেয়ে দিবেন)</span>
          </div>
          <span className="text-4xl font-black text-emerald-500 tracking-tighter">৳{totalMedicine}</span>
        </div>
        <Button 
          variant="success" 
          disabled={!isEligible || isSubmitting} 
          onClick={handleConfirmOrder} 
          className="h-24 text-2xl" 
          icon={isSubmitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-check-double"}
        >
          {isSubmitting ? "প্রসেস হচ্ছে..." : isEligible ? "অর্ডার নিশ্চিত করুন" : `আরও ৳${MIN_ORDER_AMOUNT - totalMedicine} প্রয়োজন`}
        </Button>
      </div>
    </div>
  );
};

export default CartPage;