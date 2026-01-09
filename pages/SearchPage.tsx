import React, { useState, useMemo, useEffect } from 'react';
import { interpretNoteAI } from '../services/geminiService.ts';
import { Medicine, MIN_ORDER_AMOUNT } from '../types.ts';

interface SearchPageProps {
  onBack: () => void;
  onAddMultipleToCart: (items: { medicine: Medicine; quantity: number }[]) => void;
}

const getSessionData = (key: string, defaultVal: any) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const SearchPage: React.FC<SearchPageProps> = ({ onBack, onAddMultipleToCart }) => {
  const [note, setNote] = useState(() => sessionStorage.getItem('shanti_search_note') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  const [interpretedItems, setInterpretedItems] = useState<any[]>(() => getSessionData('shanti_search_results', []));
  const [sources, setSources] = useState<any[]>(() => getSessionData('shanti_search_sources', []));
  const [quantities, setQuantities] = useState<Record<string, number>>(() => getSessionData('shanti_search_qtys', {}));
  const [units, setUnits] = useState<Record<string, 'piece' | 'strip'>>(() => getSessionData('shanti_search_units', {}));
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => getSessionData('shanti_search_selected', {}));

  useEffect(() => {
    sessionStorage.setItem('shanti_search_note', note);
    sessionStorage.setItem('shanti_search_results', JSON.stringify(interpretedItems));
    sessionStorage.setItem('shanti_search_sources', JSON.stringify(sources));
    sessionStorage.setItem('shanti_search_qtys', JSON.stringify(quantities));
    sessionStorage.setItem('shanti_search_units', JSON.stringify(units));
    sessionStorage.setItem('shanti_search_selected', JSON.stringify(selectedItems));
  }, [note, interpretedItems, sources, quantities, units, selectedItems]);

  const handleProcessOrder = async () => {
    if (!note.trim()) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    setLoading(true);
    const data = await interpretNoteAI(note);
    if (data && data.items) {
      setInterpretedItems(data.items);
      setSources(data.sources || []);
      const initialQty: Record<string, number> = {};
      const initialUnits: Record<string, 'piece' | 'strip'> = {};
      const initialSelected: Record<string, boolean> = {};
      data.items.forEach((item: any) => {
        if (!item || !item.name) return;
        initialQty[item.name] = item.quantity || 1;
        initialUnits[item.name] = item.unit || 'piece';
        initialSelected[item.name] = true;
      });
      setQuantities(initialQty);
      setUnits(initialUnits);
      setSelectedItems(initialSelected);
    }
    setLoading(false);
  };

  const calculateItemTotal = (item: any) => {
    if (!item) return 0;
    const qty = quantities[item.name] || 0;
    const unit = units[item.name] || 'piece';
    const multiplier = unit === 'strip' ? 10 : 1; 
    return (item.price || 0) * qty * multiplier;
  };

  const subtotal = useMemo(() => {
    return interpretedItems
      .filter(item => item && selectedItems[item.name])
      .reduce((sum, item) => sum + calculateItemTotal(item), 0);
  }, [interpretedItems, selectedItems, quantities, units]);

  const handleAddAllToCart = () => {
    if (subtotal < MIN_ORDER_AMOUNT) {
      alert(`দুঃখিত, নূন্যতম ${MIN_ORDER_AMOUNT} টাকার ওষুধ অর্ডার করা বাধ্যতামূলক।`);
      return;
    }

    const toAdd = interpretedItems
      .filter(item => item && selectedItems[item.name])
      .map(item => ({
        medicine: {
          id: Math.random().toString(36).substr(2, 9),
          name: `${item.name}${units[item.name] === 'strip' ? ' (পাতা)' : ' (পিস)'}`,
          price: (item.price || 0) * (units[item.name] === 'strip' ? 10 : 1),
          category: item.category || 'General',
          description: 'AI interpreted order'
        },
        quantity: quantities[item.name] || 1
      }));
    if (toAdd.length > 0) onAddMultipleToCart(toAdd);
  };

  return (
    <div className="px-6 py-8 space-y-8 pb-40 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-5">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-800 dark:text-slate-100 active:scale-90 transition-all">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">ওষুধের তালিকা দিন</h2>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Google Search ব্যবহার করে যাচাই করা হবে</p>
        </div>
      </div>

      <div className={`relative clay-card rounded-[3rem] p-8 space-y-6 transition-all ${error ? 'animate-shake border-red-500' : ''}`}>
        <textarea 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={"যেমন: নাপা ১০টা, সেকলো ১ পাতা..."}
          className="w-full h-48 p-0 text-xl font-bold bg-transparent border-none focus:ring-0 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-200 resize-none leading-relaxed"
        />
        <button onClick={handleProcessOrder} disabled={loading} className="w-full h-20 bg-red-600 text-white rounded-[1.8rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl disabled:opacity-50">
          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
          {loading ? "Google Search যাচাই করছে..." : "লিস্ট প্রসেস করুন"}
        </button>
      </div>

      {interpretedItems.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">সনাক্তকৃত ওষুধ:</h3>
            <div className={`px-5 py-2 rounded-2xl font-black text-lg ${subtotal < MIN_ORDER_AMOUNT ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              মোট: ৳{subtotal}
            </div>
          </div>
          
          <div className="space-y-4">
            {interpretedItems.map((item, idx) => (
              <div key={idx} className={`clay-card p-6 rounded-[2.5rem] flex flex-col gap-4 border-l-[12px] ${selectedItems[item.name] ? 'border-l-blue-600' : 'opacity-60'}`}>
                <div className="flex items-start gap-4">
                  <button onClick={() => setSelectedItems(p => ({...p, [item.name]: !p[item.name]}))} className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center ${selectedItems[item.name] ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'}`}>
                    <i className="fa-solid fa-check"></i>
                  </button>
                  <div className="flex-1">
                    <h4 className="font-black text-lg">{item.name}</h4>
                    <p className="text-blue-600 font-black">৳{calculateItemTotal(item)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">
                  <div className="flex gap-2">
                    <button onClick={() => setUnits(p => ({...p, [item.name]: 'piece'}))} className={`px-4 py-2 rounded-xl text-xs font-black ${units[item.name] === 'piece' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>পিস</button>
                    <button onClick={() => setUnits(p => ({...p, [item.name]: 'strip'}))} className={`px-4 py-2 rounded-xl text-xs font-black ${units[item.name] === 'strip' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>পাতা</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantities(p => ({...p, [item.name]: Math.max(1, (p[item.name] || 1) - 1)}))} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl font-black shadow-sm">-</button>
                    <span className="font-black text-lg">{quantities[item.name] || 1}</span>
                    <button onClick={() => setQuantities(p => ({...p, [item.name]: (p[item.name] || 1) + 1}))} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl font-black shadow-sm">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sources.length > 0 && (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] space-y-3">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-brands fa-google"></i> তথ্যসূত্র (Google Search):
              </p>
              <div className="flex flex-wrap gap-2">
                {sources.slice(0, 3).map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-blue-500 font-bold border border-blue-100 dark:border-blue-900 truncate max-w-[150px]">
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleAddAllToCart} className={`w-full h-24 rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 ${subtotal < MIN_ORDER_AMOUNT ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white'}`}>
            <i className="fa-solid fa-cart-plus"></i> 
            {subtotal < MIN_ORDER_AMOUNT ? `আরও ৳${MIN_ORDER_AMOUNT - subtotal} প্রয়োজন` : "কার্টে যোগ করুন"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchPage;