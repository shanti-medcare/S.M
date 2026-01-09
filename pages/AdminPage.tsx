import React, { useState, useEffect, useMemo } from 'react';
import { Order, User } from '../types.ts';
import { fetchFromGitHub, uploadToGitHub } from '../services/githubService.ts';
import Button from '../components/Button.tsx';

interface AdminPageProps {
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pending' | 'confirmed' | 'delivered' | 'users' | 'sync'>('dashboard');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Cloud Sync States
  const [githubToken, setGithubToken] = useState(localStorage.getItem('shanti_gh_token') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    try {
      const savedOrders = JSON.parse(localStorage.getItem('shanti_orders') || '[]');
      const savedUsers = JSON.parse(localStorage.getItem('shanti_users') || '[]');
      setOrders(savedOrders);
      setUsers(savedUsers);
    } catch (e) {
      setOrders([]);
      setUsers([]);
    }
  }, []);

  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const delivered = orders.filter(o => o.status === 'delivered');
    const totalSales = delivered.reduce((sum, o) => {
        const itemTotal = o.items?.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0) || 0;
        return sum + itemTotal;
    }, 0);
    return { pending, confirmed, delivered: delivered.length, totalSales };
  }, [orders]);

  const updateOrderStatus = (id: string, status: Order['status']) => {
    const statusLabels: Record<string, string> = {
      pending: 'নতুন',
      confirmed: 'কনফার্ম',
      delivered: 'ডেলিভারড',
      cancelled: 'বাতিল'
    };
    
    if (!window.confirm(`আপনি কি অর্ডারটি "${statusLabels[status]}" করতে চান?`)) return;

    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    localStorage.setItem('shanti_orders', JSON.stringify(updated));
    if (viewingOrder?.id === id) setViewingOrder({ ...viewingOrder, status });
  };

  const deleteOrder = (id: string) => {
    if (window.confirm('অর্ডারটি চিরতরে মুছে ফেলতে চান?')) {
      const updated = orders.filter(o => o.id !== id);
      setOrders(updated);
      localStorage.setItem('shanti_orders', JSON.stringify(updated));
      setViewingOrder(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesTab = activeTab === 'dashboard' ? false : o.status === activeTab;
    const matchesSearch = o.senderNumber.includes(searchQuery) || o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return (activeTab === 'dashboard' ? true : matchesTab) && matchesSearch;
  });

  const handleCloudBackup = async () => {
    if (!githubToken) {
      setSyncMessage({ text: 'টোকেন প্রদান করুন।', type: 'error' });
      return;
    }
    setIsSyncing(true);
    setSyncMessage({ text: 'ব্যাকআপ হচ্ছে...', type: '' });
    try {
      const current = await fetchFromGitHub(githubToken);
      const res = await uploadToGitHub(githubToken, { orders, users }, current.sha);
      if (res.success) {
        setSyncMessage({ text: 'ব্যাকআপ সফল হয়েছে!', type: 'success' });
        localStorage.setItem('shanti_gh_token', githubToken);
      } else {
        setSyncMessage({ text: res.message, type: 'error' });
      }
    } catch (e) {
      setSyncMessage({ text: 'ব্যাকআপ ব্যর্থ হয়েছে।', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!githubToken) {
      setSyncMessage({ text: 'টোকেন প্রদান করুন।', type: 'error' });
      return;
    }
    setIsSyncing(true);
    setSyncMessage({ text: 'রিস্টোর হচ্ছে...', type: '' });
    try {
      const res = await fetchFromGitHub(githubToken);
      if (res.success && res.data) {
        const { orders: cloudOrders, users: cloudUsers } = res.data;
        if (cloudOrders) {
          setOrders(cloudOrders);
          localStorage.setItem('shanti_orders', JSON.stringify(cloudOrders));
        }
        if (cloudUsers) {
          setUsers(cloudUsers);
          localStorage.setItem('shanti_users', JSON.stringify(cloudUsers));
        }
        setSyncMessage({ text: 'রিস্টোর সফল হয়েছে!', type: 'success' });
        localStorage.setItem('shanti_gh_token', githubToken);
      } else {
        setSyncMessage({ text: res.message, type: 'error' });
      }
    } catch (e) {
      setSyncMessage({ text: 'রিস্টোর ব্যর্থ হয়েছে।', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 500);
  };

  return (
    <div className="px-6 py-6 space-y-8 animate-in fade-in duration-500 pb-40 relative max-w-md mx-auto min-h-screen bg-[var(--bg-app)]">
      {/* Thermal Receipt Template */}
      {printingOrder && (
        <div className="hidden print-only" style={{ width: '72mm', margin: '0 auto', padding: '4mm 0', color: 'black' }}>
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            <h1 style={{ fontSize: '18pt', fontWeight: '900', margin: '0 0 1mm 0' }}>শান্তি মেডিকেয়ার</h1>
            <p style={{ fontSize: '8pt', margin: '0' }}>সরদারপাড়া বাজার, আটোয়ারী, পঞ্চগড়</p>
            <p style={{ fontSize: '8pt', margin: '0' }}>মোবাইল: ০১৭৪৫৭০৭১৩৩</p>
            <div style={{ borderBottom: '1px dashed black', margin: '3mm 0' }}></div>
          </div>
          <div style={{ fontSize: '8pt', marginBottom: '4mm' }}>
            <p style={{ margin: '1mm 0' }}><strong>অর্ডার আইডি:</strong> #{printingOrder.id}</p>
            <p style={{ margin: '1mm 0' }}><strong>তারিখ:</strong> {new Date(printingOrder.timestamp).toLocaleString('bn-BD')}</p>
            <p style={{ margin: '1mm 0' }}><strong>মোবাইল:</strong> {printingOrder.senderNumber}</p>
          </div>
          <div style={{ borderBottom: '1px solid black', margin: '2mm 0' }}></div>
          <table style={{ width: '100%', fontSize: '8pt', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid black' }}>
                <th style={{ textAlign: 'left', padding: '1mm 0' }}>ওষুধ</th>
                <th style={{ textAlign: 'center' }}>QTY</th>
                <th style={{ textAlign: 'right' }}>মূল্য</th>
              </tr>
            </thead>
            <tbody>
              {printingOrder.items?.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '1.5mm 0' }}>{item.medicine.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>৳{(item.medicine.price || 0) * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderBottom: '1px solid black', margin: '2mm 0' }}></div>
          <div style={{ textAlign: 'right', fontSize: '9pt' }}>
            <p style={{ margin: '1mm 0' }}>ডেলিভারি চার্জ: ৳{printingOrder.deliveryCharge}</p>
            <p style={{ fontSize: '12pt', fontWeight: '900', margin: '2mm 0' }}>মোট: ৳{(printingOrder.items?.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0) || 0) + printingOrder.deliveryCharge}</p>
          </div>
        </div>
      )}

      <div className="no-print space-y-8">
        <div className="flex items-center justify-between gap-4">
           <button onClick={onBack} className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm text-slate-800 dark:text-slate-100"><i className="fa-solid fa-chevron-left"></i></button>
           <div className="flex-1">
             <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">ম্যানেজমেন্ট</h2>
           </div>
           <button onClick={() => setActiveTab('sync')} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${activeTab === 'sync' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-blue-600'}`}><i className="fa-solid fa-cloud"></i></button>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-x-auto no-scrollbar">
          {(['dashboard', 'pending', 'confirmed', 'delivered', 'users'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-md' : 'text-slate-500'}`}>
              {tab === 'dashboard' ? 'ড্যাশবোর্ড' : tab === 'pending' ? 'নতুন' : tab === 'confirmed' ? 'প্রসেসিং' : tab === 'delivered' ? 'সম্পন্ন' : 'ইউজার'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="clay-card p-6 rounded-3xl bg-emerald-500/10 border-l-[12px] border-l-emerald-500">
              <p className="text-[10px] font-black uppercase text-emerald-600 opacity-60">মোট বিক্রি</p>
              <h4 className="text-3xl font-black text-emerald-700">৳{stats.totalSales}</h4>
            </div>
            <div className="clay-card p-6 rounded-3xl bg-amber-500/10 border-l-[12px] border-l-amber-500">
              <p className="text-[10px] font-black uppercase text-amber-600 opacity-60">নতুন অর্ডার</p>
              <h4 className="text-3xl font-black text-amber-700">{stats.pending}টি</h4>
            </div>
          </div>
        )}

        {activeTab !== 'dashboard' && activeTab !== 'users' && activeTab !== 'sync' && (
          <div className="space-y-4">
            <input type="tel" placeholder="ফোন বা আইডি দিয়ে খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none font-bold shadow-inner" />
            <div className="space-y-4">
              {filteredOrders.length === 0 && <div className="text-center py-20 opacity-20 font-black text-slate-400">কোনো তথ্য নেই</div>}
              {filteredOrders.map(order => (
                <div key={order.id} onClick={() => setViewingOrder(order)} className={`clay-card p-6 rounded-3xl flex items-center gap-4 border-l-[12px] cursor-pointer active:scale-95 transition-all ${order.status === 'pending' ? 'border-l-amber-500' : order.status === 'confirmed' ? 'border-l-blue-500' : 'border-l-emerald-500'}`}>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 truncate text-lg tracking-tight">#{order.id.slice(0,6)} • {order.senderNumber}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(order.timestamp).toLocaleString('bn-BD')}</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300"></i>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.phone} className="clay-card p-5 rounded-2xl flex justify-between items-center border-l-[12px] border-l-purple-500">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg">{u.phone}</h4>
                  <p className="text-[10px] text-purple-600 uppercase font-black tracking-widest">পিন: {u.password}</p>
                </div>
                <button onClick={() => { setEditingUser(u); setNewPassword(u.password); }} className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400"><i className="fa-solid fa-key"></i></button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="clay-card p-8 rounded-[2.5rem] space-y-6">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><i className="fa-solid fa-cloud-arrow-up text-3xl"></i></div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">ক্লাউড ব্যাকআপ</h3>
            </div>
            <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="GitHub Token" className="w-full h-14 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 outline-none font-black text-center text-sm shadow-inner" />
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleCloudBackup} disabled={isSyncing} variant="primary" className="h-16 text-lg">{isSyncing ? '...' : 'ব্যাকআপ'}</Button>
              <Button onClick={handleCloudRestore} disabled={isSyncing} variant="outline" className="h-16 text-lg">{isSyncing ? '...' : 'রিস্টোর'}</Button>
            </div>
            {syncMessage.text && <p className={`text-center text-[10px] font-black uppercase tracking-widest ${syncMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{syncMessage.text}</p>}
          </div>
        )}
      </div>

      {/* Details Modal Refactored with Distinct Cards */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end no-print animate-in slide-in-from-bottom duration-300">
          <div className="w-full bg-[var(--bg-app)] rounded-t-[3.5rem] p-8 space-y-6 max-h-[92vh] overflow-y-auto pb-20 shadow-2xl border-t-4 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">অর্ডার বিবরণ</h3>
                <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">আইডি: #{viewingOrder.id}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 active:scale-90 transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-6">
              {/* Card 1: Customer Information */}
              <div className="clay-card p-6 rounded-[2.5rem] space-y-4 border-l-[12px] border-l-blue-600 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><i className="fa-solid fa-user"></i></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কাস্টমার ফোন</p>
                    <a href={`tel:${viewingOrder.senderNumber}`} className="text-xl font-black text-slate-800 dark:text-slate-100">{viewingOrder.senderNumber}</a>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ডেলিভারি ঠিকানা</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">{viewingOrder.deliveryAddress}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">বর্তমান স্ট্যাটাস</span>
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      viewingOrder.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      viewingOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                      'bg-emerald-100 text-emerald-600'
                   }`}>{viewingOrder.status}</span>
                </div>
              </div>

              {/* Card 2: Order Items */}
              {viewingOrder.items && viewingOrder.items.length > 0 && (
                <div className="clay-card p-6 rounded-[2.5rem] space-y-4 border-l-[12px] border-l-emerald-500 shadow-lg">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><i className="fa-solid fa-list-ul"></i></div>
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">ওষুধের তালিকা</h4>
                  </div>
                  <div className="space-y-2">
                    {viewingOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{item.medicine.name}</span>
                          <span className="text-[10px] font-bold text-slate-400">৳{item.medicine.price} x {item.quantity}</span>
                        </div>
                        <span className="font-black text-slate-800 dark:text-slate-100">৳{(item.medicine.price || 0) * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 p-5 rounded-2xl text-white flex justify-between items-center shadow-xl">
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">সর্বমোট বিল</span>
                    <span className="text-2xl font-black text-emerald-400 tracking-tighter">৳{(viewingOrder.items.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0)) + viewingOrder.deliveryCharge}</span>
                  </div>
                </div>
              )}

              {/* Card 3: Prescription Image */}
              {viewingOrder.imageUrl && (
                <div className="clay-card p-6 rounded-[2.5rem] space-y-4 border-l-[12px] border-l-orange-500 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner"><i className="fa-solid fa-camera-retro"></i></div>
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">প্রেসক্রিপশন কপি</h4>
                  </div>
                  <div className="rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-inner group relative">
                    <img src={viewingOrder.imageUrl} alt="Prescription" className="w-full h-auto cursor-zoom-in active:scale-[1.02] transition-transform" onClick={() => window.open(viewingOrder.imageUrl, '_blank')} />
                  </div>
                </div>
              )}

              {/* Card 4: Payment Details */}
              <div className="clay-card p-6 rounded-[2.5rem] space-y-3 border-l-[12px] border-l-rose-500 shadow-lg bg-rose-50/10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner"><i className="fa-solid fa-receipt"></i></div>
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">পেমেন্ট তথ্য</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ট্রানজেকশন আইডি</p>
                       <p className="font-black text-slate-800 dark:text-slate-100 truncate">{viewingOrder.transactionId || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">পেমেন্ট মেথড</p>
                       <p className="font-black text-rose-600 uppercase">{viewingOrder.paymentMethod || 'COD'}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-6">
              <div className="grid grid-cols-2 gap-3">
                {viewingOrder.status === 'pending' && (
                  <Button onClick={() => updateOrderStatus(viewingOrder.id, 'confirmed')} variant="success" icon="fa-solid fa-check" className="h-16 text-lg">কনফার্ম</Button>
                )}
                {viewingOrder.status === 'confirmed' && (
                  <Button onClick={() => updateOrderStatus(viewingOrder.id, 'delivered')} variant="primary" icon="fa-solid fa-truck" className="h-16 text-lg">ডেলিভারড</Button>
                )}
                {(viewingOrder.status === 'pending' || viewingOrder.status === 'confirmed') && (
                  <Button onClick={() => updateOrderStatus(viewingOrder.id, 'cancelled')} variant="danger" icon="fa-solid fa-ban" className="h-16 text-lg">বাতিল</Button>
                )}
              </div>
              
              <Button onClick={() => handlePrint(viewingOrder)} variant="secondary" icon="fa-solid fa-print" className="h-16 text-lg">রিসিট প্রিন্ট</Button>
              
              <button 
                onClick={() => deleteOrder(viewingOrder.id)} 
                className="text-rose-500 font-black uppercase text-[10px] tracking-[0.3em] py-5 border-2 border-rose-100 dark:border-rose-900/30 rounded-3xl active:bg-rose-50 transition-all mt-2"
              >
                অর্ডার চিরতরে মুছুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;