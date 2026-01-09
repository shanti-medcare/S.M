import React, { useState, useEffect } from 'react';
import { Page, Order } from '../types.ts';
import { analyzePrescriptionAI } from '../services/geminiService.ts';
import Button from '../components/Button.tsx';

interface UploadPageProps {
  onBack: () => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onBack }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(() => sessionStorage.getItem('shanti_upload_image'));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [distance, setDistance] = useState<'1-2' | '3' | '4-5'>(() => (sessionStorage.getItem('shanti_upload_dist') as any) || '1-2');
  const [deliveryAddress, setDeliveryAddress] = useState(() => sessionStorage.getItem('shanti_upload_addr') || '');
  const [location, setLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderNumber, setSenderNumber] = useState(() => localStorage.getItem('customer_phone') || sessionStorage.getItem('shanti_upload_sender') || '');
  const [transactionId, setTransactionId] = useState(() => sessionStorage.getItem('shanti_upload_txid') || '');
  const [isCopied, setIsCopied] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [detectedItems, setDetectedItems] = useState<any[]>(() => {
    try {
      const saved = sessionStorage.getItem('shanti_upload_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const officialPaymentPhone = "01745707133";
  const deliveryCharge = distance === '1-2' ? 20 : distance === '3' ? 30 : 40;

  useEffect(() => {
    if (selectedImage) sessionStorage.setItem('shanti_upload_image', selectedImage);
    sessionStorage.setItem('shanti_upload_items', JSON.stringify(detectedItems));
    sessionStorage.setItem('shanti_upload_dist', distance);
    sessionStorage.setItem('shanti_upload_addr', deliveryAddress);
    // Only save senderNumber to sessionStorage if it's not from localStorage (i.e., not logged in)
    if (!localStorage.getItem('customer_phone')) {
      sessionStorage.setItem('shanti_upload_sender', senderNumber);
    }
    sessionStorage.setItem('shanti_upload_txid', transactionId);
  }, [selectedImage, detectedItems, distance, deliveryAddress, senderNumber, transactionId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setIsAnalyzing(true);
        try {
          const data = await analyzePrescriptionAI(base64);
          if (data && data.items) setDetectedItems(data.items);
        } catch (err) { console.error("AI Analysis failed"); }
        finally { setIsAnalyzing(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrder = () => {
    setAttemptedSubmit(true);
    if (!selectedImage || !deliveryAddress.trim() || !senderNumber.trim() || !transactionId.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      let existing = [];
      try { existing = JSON.parse(localStorage.getItem('shanti_orders') || '[]'); } catch (e) {}
      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        timestamp: Date.now(),
        type: 'prescription',
        imageUrl: selectedImage,
        deliveryAddress,
        location,
        distance,
        deliveryCharge,
        paymentMethod,
        senderNumber,
        transactionId,
        status: 'pending'
      };
      localStorage.setItem('shanti_orders', JSON.stringify([newOrder, ...existing]));
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center animate-in zoom-in-95 duration-500">
        <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl"><i className="fa-solid fa-check text-5xl"></i></div>
        <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">অর্ডার সফল!</h2>
        <Button onClick={onBack} variant="success">হোমে ফিরে যান</Button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8 pb-40 animate-in fade-in duration-500">
      <div className="flex items-center gap-5">
        <button onClick={onBack} className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all text-slate-800 dark:text-slate-100"><i className="fa-solid fa-arrow-left"></i></button>
        <div><h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">প্রেসক্রিপশন অর্ডার</h2></div>
      </div>

      {!selectedImage ? (
        <label className="w-full h-80 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] bg-white dark:bg-slate-800 flex flex-col items-center justify-center gap-4 cursor-pointer shadow-xl">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner"><i className="fa-solid fa-camera text-4xl"></i></div>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100">প্রেসক্রিপশন আপলোড</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="space-y-8">
          <div className="relative clay-card p-3 rounded-[3rem] overflow-hidden">
             <img src={selectedImage} alt="Prescription" className={`w-full h-64 object-cover rounded-[2.5rem] ${isAnalyzing ? 'brightness-50' : ''}`} />
             {isAnalyzing && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-[2.5rem] text-white">
                 <div className="w-10 h-10 border-4 border-t-red-600 border-white/20 rounded-full animate-spin mb-4"></div>
                 <p className="font-black text-xs uppercase tracking-widest">AI চেক করছে...</p>
               </div>
             )}
          </div>

          <div className="clay-card p-8 rounded-[3.5rem] space-y-6 border-l-[12px] border-l-orange-500 shadow-xl">
            <h3 className="text-xl font-black flex items-center gap-3"><i className="fa-solid fa-location-dot text-orange-500"></i> ডেলিভারি লোকেশন</h3>
            <textarea placeholder="বিস্তারিত ঠিকানা লিখুন..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full h-32 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none font-bold text-slate-800 dark:text-slate-100 shadow-inner resize-none" />
          </div>

          <div className="clay-card p-8 rounded-[3.5rem] space-y-8 shadow-2xl">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white text-center space-y-4">
              <p className="text-xs font-black uppercase opacity-80">৳{deliveryCharge} সেন্ড মানি করুন</p>
              <div onClick={() => { navigator.clipboard.writeText(officialPaymentPhone); setIsCopied(true); setTimeout(()=>setIsCopied(false), 2000); }} className="bg-white p-5 rounded-2xl flex items-center justify-between text-slate-900 font-black text-2xl tracking-widest cursor-pointer shadow-inner">
                {officialPaymentPhone} <i className={`fa-solid ${isCopied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
              </div>
            </div>
            <div className="space-y-4">
              <input type="tel" placeholder="পেমেন্টকৃত নাম্বার" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} className="w-full p-6 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none font-black text-xl" />
              <input type="text" placeholder="TxID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full p-6 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none font-black text-xl" />
            </div>
            <Button variant="success" onClick={handleOrder} disabled={isSubmitting} className="h-24 text-2xl" icon={isSubmitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"}>
              {isSubmitting ? "অর্ডার হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;