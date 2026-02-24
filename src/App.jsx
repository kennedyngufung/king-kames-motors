import React, { useState, useRef, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  query,
  doc
} from 'firebase/firestore';
import { 
  getAuth, 
   signInAnonymously,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Car, 
  ShoppingCart, 
  CheckCircle2, 
  Mail, 
  Trash2,
  Shield,
  LayoutDashboard,
  Package,
  Instagram,
  Twitter,
  Facebook,
  MessageCircle,
  Database,
  WifiOff,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_PASSKEY = "1234";
const WHATSAPP_NUMBER = "971554910122"; 
const MOCK_CARS = [
  { id: '1', name: 'Revuelto', price: 2600000, brand: 'Lamborghini', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { id: '2', name: 'Purosangue', price: 1850000, brand: 'Ferrari', image: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=800&q=80' },
  { id: '3', name: 'Spectre', price: 1950000, brand: 'Rolls-Royce', image: 'https://cdn.thespaces.com/wp-content/uploads/2022/10/Rolls-Royce-Spectre_HERO.jpeg' },
  { id: '4', name: 'Chiron Super Sport', price: 14500000, brand: 'Bugatti', image: 'https://cdn.motor1.com/images/mgl/QE3q0/s1/2021-bugatti-chiron-super-sport-300.jpg' },
  { id: '5', name: '911 GT3 RS', price: 1150000, brand: 'Porsche', image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80' }
];

let db, auth;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'king-kames-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [view, setView] = useState('home');
  const [cart, setCart] = useState([]);
  const [activeBrand, setActiveBrand] = useState('All');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); 
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  const [adminInquiries, setAdminInquiries] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  
  const identityFormRef = useRef();

  useEffect(() => {
  const initApp = async () => {
    try {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      };

      const app = getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApps()[0];

      auth = getAuth(app);
      db = getFirestore(app);

      await signInAnonymously(auth);

    } catch (err) {
      console.error("Initialization Failed:", err);
      setMockMode(true);
    } finally {
      setIsInitializing(false);
    }
  };

  initApp();
}, []);
  // Auth Listener (only if not in mock mode)
  useEffect(() => {
    if (!auth || mockMode) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsDbConnected(true);
    });
    return () => unsub();
  }, [mockMode]);

  // Data Sync (Private Cart)
  useEffect(() => {
    if (!user || !db || mockMode) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'cart');
    const unsub = onSnapshot(q, (s) => {
      setCart(s.docs.map(d => ({ ...d.data(), docId: d.id })));
    }, () => setIsDbConnected(false));
    return () => unsub();
  }, [user, mockMode]);

  // Data Sync (Public Admin Data)
  useEffect(() => {
    if (!user || !db || !isAdminAuth || mockMode) return;
    const qOrders = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsub = onSnapshot(qOrders, (s) => {
      setAdminOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, isAdminAuth, mockMode]);

  const triggerStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const addToCart = async (car) => {
    if (mockMode) {
      setCart([...cart, { ...car, docId: Math.random().toString() }]);
      triggerStatus(`${car.name} Reserved (Local)`);
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'cart'), {
        ...car,
        addedAt: Date.now()
      });
      triggerStatus(`${car.name} Reserved`);
    } catch (e) {
      triggerStatus("Sync Error");
    }
  };

  const removeFromCart = async (docId) => {
    if (mockMode) {
      setCart(cart.filter(item => item.docId !== docId));
      return;
    }
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cart', docId));
  };

const deleteOrder = async (orderId) => {
  if (!orderId) return;

  if (mockMode) {
    setAdminOrders(prev => prev.filter(o => o.id !== orderId));
    triggerStatus("Order Deleted (Local)");
    return;
  }

  try {
    await deleteDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId)
    );
    triggerStatus("Order Deleted");
  } catch (error) {
    console.error("Delete failed:", error);
    triggerStatus("Delete Failed");
  }
};

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    
    const fd = new FormData(identityFormRef.current);
    const orderData = {
      client: { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), uid: user?.uid || 'local' },
      items: cart,
      total: cart.reduce((s, i) => s + i.price, 0),
      timestamp: Date.now()
    };

    if (mockMode) {
      setAdminOrders([orderData, ...adminOrders]);
      setCart([]);
      setCheckoutStep(3);
      setIsSending(false);
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
      for (const item of cart) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cart', item.docId));
      }
      setCheckoutStep(3);
    } catch (e) {
      triggerStatus("Booking Error");
    } finally {
      setIsSending(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Secure Handshake...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] min-h-screen text-slate-900 font-sans antialiased">
      
      {/* STATUS BADGE */}
      <div className="fixed bottom-4 right-4 z-[150] flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-100 px-4 py-2 rounded-full shadow-lg text-[9px] font-black uppercase tracking-widest pointer-events-none">
        {mockMode ? (
          <><AlertTriangle className="w-3 h-3 text-amber-500" /> Preview Mode</>
        ) : isDbConnected ? (
          <><Database className="w-3 h-3 text-green-500" /> Registry Live</>
        ) : (
          <><WifiOff className="w-3 h-3 text-red-500 animate-pulse" /> Connecting...</>
        )}
      </div>

      {statusMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="text-blue-500 w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">{statusMessage}</span>
        </div>
      )}

      {/* Admin Auth Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-8 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Executive</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Auth Required</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passkeyInput === ADMIN_PASSKEY) {
                setIsAdminAuth(true);
                setShowAdminModal(false);
                setView('admin');
              } else {
                triggerStatus("Access Denied");
              }
            }} className="space-y-4">
              <input type="password" value={passkeyInput} onChange={(e) => setPasskeyInput(e.target.value)} placeholder="0000" className="w-full text-center text-4xl p-6 bg-slate-50 rounded-2xl border-none outline-none font-black" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAdminModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Enter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-[60] px-4 md:px-8 py-4 md:py-6 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
          <div className="bg-slate-900 p-2.5 rounded-xl group-hover:rotate-[15deg] transition-transform duration-500"><Car className="text-white w-5 h-5" /></div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">KING KAMES <span className="text-blue-600">MOTORS</span></span>
        </div>
        
        <div className="hidden lg:flex gap-12 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
          <button onClick={() => setView('home')} className={view === 'home' ? 'text-blue-600' : 'hover:text-slate-900 transition-colors'}>Residence</button>
          <button onClick={() => setView('inventory')} className={view === 'inventory' ? 'text-blue-600' : 'hover:text-slate-900 transition-colors'}>Showroom</button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setView('cart')} className="relative p-3 group bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">
            <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">{cart.length}</span>}
          </button>
          {isAdminAuth && <button onClick={() => setView('admin')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><LayoutDashboard size={20}/></button>}
        </div>
      </nav>

      {/* Hero */}
      {view === 'home' && (
        <section className="relative min-h-[70vh] md:h-[85vh] flex items-center justify-center overflow-hidden px-4">
          <img src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=2000&q=80" className="absolute inset-0 w-full h-full object-cover brightness-[0.4]" />
          <div className="relative z-10 text-center space-y-8 max-w-5xl px-6 animate-in slide-in-from-bottom-10 duration-700">
            <h1 className="text-4xl sm:text-6xl md:text-[9rem] font-black text-white uppercase italic tracking-tighter leading-[0.85]">Elegance <span className="text-blue-500">Dubai.</span></h1>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setView('inventory')} className="bg-blue-600 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">Enter Showroom</button>
            </div>
          </div>
        </section>
      )}

      {/* Inventory */}
      {view === 'inventory' && (
        <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-500">
          <div className="flex justify-between items-end border-b border-slate-100 pb-12">
            <div>
              <p className="text-blue-600 font-black text-[11px] uppercase tracking-widest mb-2">Pinnacle Assets</p>
              <h2 className="text-6xl font-black italic uppercase tracking-tighter">Inventory</h2>
            </div>
            <div className="flex gap-2">
              {['All', 'Lamborghini', 'Ferrari', 'Porsche'].map(b => (
                <button key={b} onClick={() => setActiveBrand(b)} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeBrand === b ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{b}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {MOCK_CARS.filter(c => activeBrand === 'All' || c.brand === activeBrand).map(car => (
              <div key={car.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-slate-100 group hover:shadow-2xl transition-all duration-500">
                <div className="h-72 overflow-hidden bg-slate-100">
                  <img src={car.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                </div>
                <div className="p-10 space-y-6">
                  <div>
                    <p className="text-blue-600 font-black text-[9px] uppercase tracking-widest">{car.brand}</p>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">{car.name}</h3>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                    <p className="text-2xl font-black italic">AED {car.price.toLocaleString()}</p>
                    <button onClick={() => addToCart(car)} className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/10"><ShoppingCart size={20}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cart & Checkout */}
      {view === 'cart' && (
        <section className="py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto">
          <h2 className="text-6xl font-black italic uppercase tracking-tighter text-center mb-16">Stable</h2>
          <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-50">
            {checkoutStep === 1 && (
              <div className="space-y-8">
                {cart.length === 0 ? <p className="text-center py-20 font-black text-slate-300 uppercase tracking-widest text-xs">Registry Empty</p> : (
                  <>
                    {cart.map(item => (
                      <div key={item.docId} className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl group">
                        <div className="flex gap-6 items-center">
                          <img src={item.image} className="w-24 h-16 object-cover rounded-xl" />
                          <div>
                            <p className="text-[10px] font-black text-blue-600 uppercase">{item.brand}</p>
                            <p className="font-black text-lg italic uppercase">{item.name}</p>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.docId)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                      </div>
                    ))}
                    <div className="pt-10 flex justify-between items-center border-t border-slate-100">
                      <p className="text-4xl font-black italic">AED {cart.reduce((s,i)=>s+i.price, 0).toLocaleString()}</p>
                      <button onClick={() => setCheckoutStep(2)} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs">Continue</button>
                    </div>
                  </>
                )}
              </div>
            )}
            {checkoutStep === 2 && (
              <form ref={identityFormRef} onSubmit={handleBookingSubmit} className="space-y-6 animate-in slide-in-from-right-10">
                <input name="name" required placeholder="Full Name" className="w-full p-6 bg-slate-50 rounded-2xl outline-none font-bold" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input name="email" type="email" required placeholder="Email" className="w-full p-6 bg-slate-50 rounded-2xl outline-none font-bold" />
                  <input name="phone" required placeholder="Phone Number" className="w-full p-6 bg-slate-50 rounded-2xl outline-none font-bold" />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setCheckoutStep(1)} className="flex-1 py-6 font-black text-xs uppercase text-slate-400">Back</button>
                  <button type="submit" disabled={isSending} className="flex-[2] bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest">
                    {isSending ? "Processing..." : "Finalize Registry"}
                  </button>
                </div>
              </form>
            )}
            {checkoutStep === 3 && (
              <div className="text-center py-20 space-y-6">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40}/></div>
                <h3 className="text-4xl font-black italic uppercase">Booking Confirmed</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">A concierge will contact you within 60 minutes.</p>
                <button onClick={() => { setView('home'); setCheckoutStep(1); }} className="bg-slate-900 text-white px-10 py-5 rounded-xl font-black uppercase text-[10px] tracking-widest mt-8">Return Home</button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Admin Dashboard */}
      {view === 'admin' && (
        <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto space-y-20 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-12">
            <div>
              <p className="text-blue-600 font-black text-[11px] uppercase tracking-widest">Registry Operations</p>
              <h2 className="text-6xl font-black italic uppercase tracking-tighter">Executive View</h2>
            </div>
            <button onClick={() => { setIsAdminAuth(false); setView('home'); }} className="px-8 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px]">Logout</button>
          </div>

          <div className="grid grid-cols-1 gap-12 max-w-4xl">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Package className="text-blue-600" />
                <h3 className="text-3xl font-black italic uppercase tracking-tight">Active Bookings</h3>
              </div>
              <div className="space-y-6">
                {adminOrders.length === 0 ? <p className="text-slate-300 font-black uppercase text-[10px]">No orders in registry</p> : adminOrders.map((order) => (
                  <div key={order.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-start">
  <div>
    <h4 className="text-2xl font-black italic uppercase">
      {order.client?.name}
    </h4>
    <p className="text-[10px] font-bold text-slate-400 uppercase">
      {order.client?.email} • {order.client?.phone}
    </p>
  </div>

  <div className="flex items-center gap-4">
    <button
      onClick={() => deleteOrder(order.id)}
      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition"
    >
      <Trash2 size={18} />
    </button>

    <span className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">
      Active
    </span>
  </div>
</div>
                    <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-black uppercase">
                          <span>{item.brand} {item.name}</span>
                          <span>AED {item.price.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-slate-200 flex justify-between font-black text-blue-600 text-sm">
                        <span>Total Val.</span>
                        <span>AED {order.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-24 px-10 text-center space-y-12">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">KING KAMES <span className="text-blue-600">MOTORS</span></h2>
        <div className="flex justify-center gap-10 text-slate-300">
          <Instagram size={24} className="hover:text-slate-900 transition-colors" />
          <Twitter size={24} className="hover:text-slate-900 transition-colors" />
          <Facebook size={24} className="hover:text-slate-900 transition-colors" />
        </div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">Dubai Pinnacle Registry © 2024</p>
        <button onClick={() => setShowAdminModal(true)} className="text-[8px] font-black uppercase text-slate-200 tracking-widest hover:text-blue-600 transition-colors">Admin Portal</button>
      </footer>

      {/* WhatsApp Trigger */}
      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener" className="fixed bottom-8 left-8 z-[100] group">
        <div className="bg-[#25D366] text-white p-5 rounded-[2rem] shadow-2xl hover:scale-110 transition-all shadow-green-500/20">
          <MessageCircle className="w-8 h-8" />
        </div>
      </a>
    </div>
  );
}