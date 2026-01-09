import React, { useState, useEffect } from 'react';
import { Order, User, Page } from '../types.ts';
import Button from '../components/Button.tsx';

interface HistoryPageProps {
  onBack: () => void;
  onNavigate?: (page: Page) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, onNavigate }) => {
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem('customer_phone') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('customer_phone'));
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [step, setStep] = useState<'phone' | 'auth'>('phone');
  const [tempPhone, setTempPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      try {
        const allOrders: Order[] = JSON.parse(localStorage.getItem('shanti_orders') || '[]');
        // Filter orders by the logged-in customer's phone number
        const customerOrders = allOrders.filter(o => o.senderNumber === phoneNumber);
        setOrders(customerOrders.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) { setOrders([]); }
    } else if (!isLoggedIn) {
      // Clear orders if not logged in
      setOrders([]);
      setStep('phone'); // Reset to phone input if logged out
      setTempPhone('');
      setPassword('');
      setIsNewUser(false);
    }
  }, [isLoggedIn, phoneNumber]);

  const checkPhone = () => {
    if (tempPhone.length < 11) {
      alert("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।");
      return;
    }
    let users: User[] = [];
    try { users = JSON.parse(localStorage.getItem('shanti_users') || '[]'); } catch (e) {}
    const user = users.find(u => u.phone === tempPhone);
    setIsNewUser(!user);
    setStep('auth');
  };

  const handleAuth = () => {
    if (password.length !== 6) {
      alert("৬ সংখ্যার পাসওয়ার্ড দিন।");
      return;
    }
    let users: User[] = [];
    try { users = JSON.parse(localStorage.getItem('shanti_users') || '[]'); } catch (e) {}
    
    if (isNewUser) {
      const newUser: User = { phone: tempPhone, password, createdAt: Date.now() };
      localStorage.setItem('shanti_users', JSON.stringify([...users, newUser]));
      loginSuccess(tempPhone);
    } else {
      const user = users.find(u => u.phone === tempPhone);
      if (user && user.password === password) {
        loginSuccess(tempPhone);
      } else {
        alert("ভুল পাসওয়ার্ড!");
      }
    }
  };

  const loginSuccess = (phone: string) => {
    localStorage.setItem('customer_phone', phone);
    setPhoneNumber(phone);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_phone');
    setPhoneNumber('');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center min-h-[70vh] space-y-10 animate-in zoom-in-95 duration-500">
        <div className="w-32 h-32 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-slate-800">
          <i className={`fa-solid ${step === 'phone' ? 'fa-user-lock' : 'fa-key'} text-5xl`}></i>
        </div>
        <div className="w-full space-y-4">
          {step === 'phone' ? (
            <>
              <input type="tel" placeholder="মোবাইল নম্বর" value={tempPhone} onChange={(e) => setTempPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} className="w-full h-20 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none font-black text-2xl text-center shadow-inner text-slate-800 dark:text-slate-100" />
              <Button onClick={checkPhone} variant="primary">পরবর্তী ধাপ</Button>
            </>
          ) : (
            <>
              <input type="password" maxLength={6} placeholder="৬ সংখ্যার পিন" value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full h-24 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none font-black text-4xl text-center tracking-[0.5em] shadow-inner text-slate-800 dark:text-slate-100" />
              <Button onClick={handleAuth} variant="success">{isNewUser ? 'অ্যাকাউন্ট তৈরি করুন' : 'প্রবেশ করুন'}</Button>
            </>
          )}
          <button onClick={onBack} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">হোমে ফিরে যান</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8 pb-40 animate-in fade-in duration-500">
      <div className="flex items-center gap-5">
        <button onClick={onBack} className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm text-slate-800 dark:text-slate-100"><i className="fa-solid fa-arrow-left"></i></button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">অর্ডার হিস্টরি</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">লগইন: {phoneNumber}</p>
        </div>
        <button onClick={handleLogout} className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"><i className="fa-solid fa-right-from-bracket"></i></button>
      </div>
      <div className="space-y-6">
        {orders.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <i className="fa-solid fa-box-open text-6xl mb-4"></i>
            <p className="font-black">কোনো অর্ডার পাওয়া যায়নি</p>
          </div>
        )}
        {orders.map(order => (
          <div key={order.id} className="clay-card p-6 rounded-[2.5rem] border-l-[12px] border-l-blue-600 shadow-xl">
            <h4 className="text-xl font-black leading-tight">আইডি: #{order.id.slice(0,6)}</h4>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{new Date(order.timestamp).toLocaleDateString('bn-BD')}</p>
            <div className="flex justify-between items-center mt-4 border-t dark:border-slate-800 pt-2">
              <span className="font-bold text-slate-500">মোট বিল:</span>
              <span className="font-black text-red-600 dark:text-red-400 text-lg">৳{(order.items?.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0) || 0) + order.deliveryCharge}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;