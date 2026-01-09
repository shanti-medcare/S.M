
import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { fetchFromGitHub, uploadToGitHub } from '../services/githubService';
import Button from '../components/Button';

interface AdminPageProps {
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'delivered' | 'sync'>('pending');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // Cloud Sync States
  const [githubToken, setGithubToken] = useState(localStorage.getItem('shanti_gh_token') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem('shanti_orders') || '[]');
    setOrders(savedOrders);
  }, []);

  useEffect(() => {
    if (printingOrder) {
      const timer = setTimeout(() => {
        window.print();
        setPrintingOrder(null);
        setIsPreparingPrint(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [printingOrder]);

  const updateOrderStatus = (id: string, status: Order['status']) => {
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    localStorage.setItem('shanti_orders', JSON.stringify(updated));
    if (viewingOrder?.id === id) {
      setViewingOrder({ ...viewingOrder, status });
    }
  };

  const deleteOrder = (id: string) => {
    if (window.confirm('অর্ডারটি চিরতরে মুছে ফেলতে চান?')) {
      const updated = orders.filter(o => o.id !== id);
      setOrders(updated);
      localStorage.setItem('shanti_orders', JSON.stringify(updated));
      setViewingOrder(null);
    }
  };

  const handleCloudBackup = async () => {
    if (!githubToken) {
      setSyncMessage({ text: 'গিটহাব টোকেন প্রয়োজন!', type: 'error' });
      return;
    }
    setIsSyncing(true);
    setSyncMessage({ text: 'ক্লাউডে আপলোড হচ্ছে...', type: 'info' });
    
    const checkFile = await fetchFromGitHub(githubToken);
    const sha = checkFile.success ? checkFile.sha : undefined;

    const result = await uploadToGitHub(githubToken, orders, sha);
    if (result.success) {
      setSyncMessage({ text: 'সফলভাবে ব্যাকআপ নেওয়া হয়েছে!', type: 'success' });
      localStorage.setItem('shanti_gh_token', githubToken);
    } else {
      setSyncMessage({ text: result.message, type: 'error' });
    }
    setIsSyncing(false);
  };

  const handleCloudRestore = async () => {
    if (!githubToken) {
      setSyncMessage({ text: 'গিটহাব টোকেন প্রয়োজন!', type: 'error' });
      return;
    }
    if (!window.confirm('ক্লাউড থেকে ডেটা আনলে লোকাল ডেটা মুছে যাবে। আপনি কি নিশ্চিত?')) return;

    setIsSyncing(true);
    setSyncMessage({ text: 'ক্লাউড থেকে ডেটা আনা হচ্ছে...', type: 'info' });
    const result = await fetchFromGitHub(githubToken);
    
    if (result.success && result.data) {
      setOrders(result.data);
      localStorage.setItem('shanti_orders', JSON.stringify(result.data));
      setSyncMessage({ text: 'ডেটা সফলভাবে রিস্টোর করা হয়েছে!', type: 'success' });
      localStorage.setItem('shanti_gh_token', githubToken);
    } else {
      setSyncMessage({ text: result.message, type: 'error' });
    }
    setIsSyncing(false);
  };

  const filteredOrders = orders.filter(o => o.status === (activeTab === 'sync' ? 'pending' : activeTab));

  return (
    <div className="px-6 py-6 space-y-6 animate-in fade-in duration-500 pb-32 relative">
      
      {/* ক্যাশ মেমো প্রিন্ট টেমপ্লেট */}
      {printingOrder && (
        <div className="print-only memo-container">
          <div className="memo-header">
            <h1 className="memo-title">শান্তি মেডিকেয়ার</h1>
            <p className="memo-info font-bold uppercase tracking-tight">ডিজিটাল ফার্মেসি ও জেনারেল স্টোর</p>
            <p className="memo-info">সরদারপাড়া বাজার, রাধানগর ইউনিয়ন, আটোয়ারী</p>
            <p className="memo-info font-bold">মোবাইল: ০১৭১৭৪৭৭৭৬৫, ০১৭৪৫৭০৭১৩৩</p>
            <p className="memo-info">ইমেইল: info.shantimedcare@gmail.com</p>
          </div>

          <div className="flex justify-between items-center bg-black text-white px-2 py-1 my-3 text-[9pt] font-black uppercase">
            <span>ক্যাশ মেমো / ইনভয়েস</span>
            <span>#{printingOrder.id}</span>
          </div>

          <div className="text-[8.5pt] space-y-1 mb-4 border-b-2 border-black border-dotted pb-3">
            <p className="flex justify-between"><strong>তারিখ:</strong> <span>{new Date(printingOrder.timestamp).toLocaleString('bn-BD')}</span></p>
            <p className="flex justify-between"><strong>মোবাইল:</strong> <span>{printingOrder.senderNumber}</span></p>
            <p className="flex justify-between"><strong>ঠিকানা:</strong> <span className="text-right ml-4">{printingOrder.deliveryAddress}</span></p>
          </div>

          <table className="memo-table">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1">বিবরণ</th>
                <th className="text-center py-1">পরিমাণ</th>
                <th className="text-right py-1">মূল্য</th>
              </tr>
            </thead>
            <tbody>
              {printingOrder.items && printingOrder.items.length > 0 ? (
                printingOrder.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2">{item.medicine.name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">৳{(item.medicine.price || 0) * item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-12 text-center italic opacity-60">
                    প্রেসক্রিপশন ভিত্তিক অর্ডার
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-1 mt-6 pt-3 border-t-2 border-black">
            <div className="flex justify-between text-[9pt]">
              <span>ওষুধের মূল্য:</span>
              <span>৳{printingOrder.items?.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0) || 0}</span>
            </div>
            <div className="flex justify-between text-[9pt]">
              <span>ডেলিভারি চার্জ:</span>
              <span>৳{printingOrder.deliveryCharge}</span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-black font-black text-[13pt]">
              <span className="uppercase tracking-tighter">সর্বমোট বিল:</span>
              <span className="bg-black text-white px-2">৳{(printingOrder.items?.reduce((acc, i) => acc + (i.medicine.price || 0) * i.quantity, 0) || 0) + printingOrder.deliveryCharge}</span>
            </div>
          </div>

          <div className="mt-16 pt-10 flex justify-between text-[8.5pt]">
            <div className="w-32 border-t border-black pt-1 text-center font-bold">ক্রেতার স্বাক্ষর</div>
            <div className="w-32 border-t border-black pt-1 text-center font-bold">বিক্রেতার স্বাক্ষর</div>
          </div>
        </div>
      )}

      {/* মেইন ড্যাশবোর্ড UI */}
      <div className="no-print space-y-6">
        <div className="flex justify-between items-center">
           <button onClick={onBack} className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
             <i className="fa-solid fa-arrow-left text-slate-800"></i>
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">অ্যাডমিন প্যানেল</h2>
           <button 
             onClick={() => setActiveTab('sync')} 
             className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all ${activeTab === 'sync' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-slate-100'}`}
           >
             <i className="fa-solid fa-cloud-arrow-up"></i>
           </button>
        </div>

        {activeTab !== 'sync' ? (
          <>
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] shadow-inner">
              {['pending', 'confirmed', 'delivered'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setActiveTab(t as any)} 
                  className={`flex-1 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}
                >
                  {t === 'pending' ? 'নতুন' : t === 'confirmed' ? 'প্রসেসিং' : 'সম্পন্ন'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="py-24 text-center text-slate-400 font-bold bg-white rounded-[3rem] border border-dashed border-slate-200">কোনো অর্ডার পাওয়া যায়নি</div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} onClick={() => setViewingOrder(order)} className="clay-card p-6 rounded-[2.5rem] flex flex-col gap-4 border-l-8 border-l-red-600 cursor-pointer">
                    <div className="flex justify-between items-start">
                       <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400">#{order.id}</span>
                          <h4 className="font-black text-lg text-slate-800">{order.senderNumber}</h4>
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); setIsPreparingPrint(true); setPrintingOrder(order); }} className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100"><i className="fa-solid fa-print"></i></button>
                    </div>
                    <p className="text-sm font-bold text-slate-500 line-clamp-1 italic"><i className="fa-solid fa-location-dot mr-1 text-red-400"></i> {order.deliveryAddress}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="clay-card p-10 rounded-[3.5rem] bg-slate-900 text-white relative overflow-hidden">
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-cloud text-3xl"></i></div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">গিটহাব ক্লাউড সিঙ্ক</h3>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">shanti-medcare/Sm</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">GitHub Access Token</label>
                    <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-mono text-sm outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleCloudBackup} disabled={isSyncing} className="h-16 bg-blue-600 rounded-2xl font-black text-sm flex items-center justify-center gap-3 disabled:opacity-50">{isSyncing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>} ব্যাকআপ</button>
                    <button onClick={handleCloudRestore} disabled={isSyncing} className="h-16 bg-white/5 border border-white/10 rounded-2xl font-black text-sm flex items-center justify-center gap-3 disabled:opacity-50">{isSyncing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-down"></i>} রিস্টোর</button>
                  </div>
                  {syncMessage.text && <div className={`p-4 rounded-xl text-center font-black text-xs uppercase ${syncMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{syncMessage.text}</div>}
               </div>
            </div>
          </div>
        )}
      </div>

      {/* অর্ডার ডিটেইল মোডাল */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col p-4 no-print">
          <div className="flex-1 bg-white rounded-[3rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between shrink-0">
               <button onClick={() => setViewingOrder(null)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-xmark text-xl"></i></button>
               <h3 className="font-black text-xl">অর্ডারের বিবরণ</h3>
               <button onClick={(e) => { e.stopPropagation(); setIsPreparingPrint(true); setPrintingOrder(viewingOrder); }} className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-print text-xl"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              {viewingOrder.imageUrl && <div className="rounded-[2.5rem] overflow-hidden border-4 border-slate-100 shadow-xl"><img src={viewingOrder.imageUrl} alt="Prescription" className="w-full h-auto" /></div>}
              <div className="p-6 bg-slate-50 rounded-[2rem] space-y-4 border border-slate-100">
                <div className="flex justify-between items-center border-b pb-3"><span className="text-slate-500 font-bold">ফোন</span><a href={`tel:${viewingOrder.senderNumber}`} className="font-black text-red-600 text-lg">{viewingOrder.senderNumber}</a></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">পেমেন্ট</span><span className="font-black uppercase text-blue-600">{viewingOrder.paymentMethod}</span></div>
              </div>
              <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100"><h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">ডেলিভারি ঠিকানা</h4><p className="font-black text-slate-800 text-lg italic">{viewingOrder.deliveryAddress}</p></div>
            </div>
            <div className="p-6 border-t bg-white flex gap-4">
              {viewingOrder.status === 'pending' && <Button variant="success" onClick={() => updateOrderStatus(viewingOrder.id, 'confirmed')} icon="fa-solid fa-check">কনফার্ম</Button>}
              {viewingOrder.status === 'confirmed' && <Button variant="primary" onClick={() => updateOrderStatus(viewingOrder.id, 'delivered')} icon="fa-solid fa-truck">ডেলিভারি সম্পন্ন</Button>}
              <button onClick={() => deleteOrder(viewingOrder.id)} className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[1.8rem] flex items-center justify-center border-2 border-rose-100"><i className="fa-solid fa-trash-can text-2xl"></i></button>
            </div>
          </div>
        </div>
      )}

      {isPreparingPrint && <div className="fixed inset-0 z-[200] bg-white/95 flex flex-col items-center justify-center no-print"><i className="fa-solid fa-file-invoice-dollar text-7xl text-red-600 animate-bounce"></i><p className="font-black text-2xl text-slate-800 mt-6 tracking-tight">ইনভয়েস প্রস্তুত হচ্ছে...</p></div>}
    </div>
  );
};

export default AdminPage;
