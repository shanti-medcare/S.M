import React, { useState } from 'react';
import { Page } from '../types.ts';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [showAboutMore, setShowAboutMore] = useState(false);
  const whatsappNumber = "8801717477765";
  const officialPhone = "+8801717477765";
  const facebookUrl = "https://www.facebook.com/ShantiMedicareBD";

  const handleShareSite = () => {
    const shareUrl = window.location.origin + window.location.pathname;
    if (navigator.share) {
      navigator.share({
        title: 'শান্তি মেডিকেয়ার',
        text: 'সরদারপাড়া বাজারের বিশ্বস্ত ডিজিটাল ফার্মেসি। অনলাইনে ওষুধ অর্ডার করতে ক্লিক করুন:',
        url: shareUrl,
      }).catch((err) => {
        console.error("Share failed:", err);
        navigator.clipboard.writeText(shareUrl);
        alert('লিঙ্কটি কপি করা হয়েছে!');
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('লিঙ্কটি কপি করা হয়েছে!');
    }
  };

  const orderProofs = [
    { id: 1, title: "সরদারপাড়া", status: "ডেলিভারি সম্পন্ন", time: "৫ মিনিট আগে", idCode: "#SM-5040", icon: "fa-truck-fast", color: "text-emerald-500", bgColor: "bg-emerald-50" },
    { id: 2, title: "রাধানগর", status: "অর্ডার কনফার্ম", time: "১২ মিনিট আগে", idCode: "#SM-3210", icon: "fa-check-double", color: "text-blue-500", bgColor: "bg-blue-50" },
    { id: 3, title: "আটোয়ারী", status: "ডেলিভারি সম্পন্ন", time: "২৫ মিনিট আগে", idCode: "#SM-8890", icon: "fa-box-open", color: "text-emerald-500", bgColor: "bg-emerald-50" },
    { id: 4, title: "সরদারপাড়া বাজার", status: "নতুন অর্ডার", time: "১ মিনিট আগে", idCode: "#SM-1245", icon: "fa-bolt", color: "text-amber-500", bgColor: "bg-amber-50" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <section className="px-6 pt-8">
        <div className="relative clay-card rounded-[3.5rem] p-10 overflow-hidden group">
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="space-y-1">
               <h2 className="text-8xl font-black text-red-600 leading-none tracking-tighter drop-shadow-md">শান্তি</h2>
               <p className="text-lg font-bold text-slate-400 tracking-[0.4em] uppercase">মেডিকেয়ার</p>
            </div>
            
            <div className="py-3 px-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-full inline-block shadow-inner">
              <p className="text-red-700 dark:text-red-400 font-black italic text-lg leading-none">
                "স্বাস্থ্যের পাশে, শান্তির সাথে"
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 mt-2">
               <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    সরদারপাড়া বাজারের বিশ্বস্ত ডিজিটাল ফার্মেসি
                  </p>
               </div>
               
               <button onClick={handleShareSite} className="flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900 font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
                 <i className="fa-solid fa-share-nodes"></i> অ্যাপটি শেয়ার করুন
               </button>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 grid grid-cols-1 gap-6">
        <button onClick={() => onNavigate(Page.SEARCH)} className="clay-card rounded-[3rem] p-8 flex items-center gap-8 active:scale-95 transition-all text-left border-l-[12px] border-l-red-600">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-[2rem] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-list-check text-3xl"></i>
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">ওষুধের তালিকা</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">নাম লিখে অর্ডার করুন</p>
          </div>
        </button>

        <button onClick={() => onNavigate(Page.UPLOAD)} className="clay-card rounded-[3rem] p-8 flex items-center gap-8 active:scale-95 transition-all text-left border-l-[12px] border-l-emerald-600">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-[2rem] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-camera-retro text-3xl"></i>
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">ছবি তুলে পাঠান</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">প্রেসক্রিপশন আপলোড করুন</p>
          </div>
        </button>

        <button onClick={() => onNavigate(Page.HISTORY)} className="clay-card rounded-[3rem] p-8 flex items-center gap-8 active:scale-95 transition-all text-left border-l-[12px] border-l-blue-600">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-[2rem] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-clock-rotate-left text-3xl"></i>
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">অর্ডার হিস্টরি</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">আপনার সব অর্ডার দেখুন</p>
          </div>
        </button>
      </div>

      <section className="px-6 pb-20">
        <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden text-center space-y-8">
            <div className="w-24 h-24 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xl">
              <i className="fa-solid fa-phone-volume text-4xl"></i>
            </div>
            <h4 className="text-3xl font-black uppercase tracking-tight">সরাসরি কথা বলুন</h4>
            <div className="grid grid-cols-1 gap-4">
              <a href={`tel:${officialPhone}`} className="h-20 bg-white text-slate-900 rounded-[1.5rem] flex items-center justify-center gap-4 font-black text-2xl active:scale-95 transition-all">
                 <i className="fa-solid fa-phone text-red-600"></i> কল দিন
              </a>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" className="h-20 bg-[#25D366] text-white rounded-[1.5rem] flex items-center justify-center gap-4 font-black text-2xl active:scale-95 transition-all">
                 <i className="fa-brands fa-whatsapp text-3xl"></i> হোয়াটসঅ্যাপ
              </a>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;