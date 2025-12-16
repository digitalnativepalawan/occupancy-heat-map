
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  BookingRecord, 
  BaseExpense,
  MonthlyExpense,
  UnitDefinition, 
  MONTHS,
  UnitType,
  AddOn,
  AddOnCategory,
  AddOnState,
  ExpenseCategory
} from './types';
import { 
  calculateFinancials, 
  parseCSV, 
  extractUnitsFromBookings, 
  INITIAL_REAL_DATA,
  isProfitGenerating
} from './services/utils';
import { AddBookingForm } from './components/AddBookingForm';
import { StatCard, Card, DailyOccupancyGrid, BreakEvenTable, Badge, InfoTooltip, FinancialDocumentation } from './components/DashboardComponents';

// --- Header Components ---

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const ManilaClock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = date.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex flex-col items-center justify-center bg-slate-800/50 px-6 py-2 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-inner min-w-[200px]">
        <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">Manila Time (PHT)</div>
        <div className="font-mono text-xl text-white font-bold leading-none tracking-tight">{timeStr}</div>
        <div className="text-[10px] text-slate-400 font-medium mt-1">{dateStr}</div>
    </div>
  );
};

const App = () => {
  // --- Data State ---
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [units, setUnits] = useState<UnitDefinition[]>([]);
  
  // --- EXPENSE STATE ---
  const [baseExpenses, setBaseExpenses] = useState<BaseExpense[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  
  // --- UI State ---
  const [showBaseExpenseManager, setShowBaseExpenseManager] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Add-ons Modal State ---
  const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
  const [selectedBookingForAddons, setSelectedBookingForAddons] = useState<string | null>(null);
  const [newAddOn, setNewAddOn] = useState<{ category: AddOnCategory, name: string, amount: string, status: AddOnState }>({
      category: AddOnCategory.IslandHopping,
      name: '',
      amount: '',
      status: AddOnState.Forecasted
  });

  // --- Dashboard State ---
  const [currentMonth, setCurrentMonth] = useState<string>('2025-12'); 
  const [occupancyGoal, setOccupancyGoal] = useState<number>(70);
  const [filterGuest, setFilterGuest] = useState('');
  const [filterUnit, setFilterUnit] = useState('All');

  // --- Expense Form State ---
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    category: ExpenseCategory.Other,
    amount: '',
    isRecurring: false
  });

  // --- Recurring Expense Form State ---
  const [newBaseExpense, setNewBaseExpense] = useState({
    name: '',
    category: ExpenseCategory.Other,
    amount: ''
  });

  // --- Initialization ---
  useEffect(() => {
    const savedBookings = localStorage.getItem('pc_bookings');
    const savedUnits = localStorage.getItem('pc_units');

    if (savedBookings && savedUnits && JSON.parse(savedBookings).length > 0) {
      setBookings(JSON.parse(savedBookings));
      setUnits(JSON.parse(savedUnits));
    } else {
      console.log("Hard Reset: Loading Initial Real Data");
      const { bookings: realBookings } = parseCSV(INITIAL_REAL_DATA);
      const inferredUnits = extractUnitsFromBookings(realBookings);
      setBookings(realBookings);
      setUnits(inferredUnits);
      localStorage.setItem('pc_bookings', JSON.stringify(realBookings));
      localStorage.setItem('pc_units', JSON.stringify(inferredUnits));
    }

    const storedBase = localStorage.getItem('expenses:base');
    const storedMonthly = localStorage.getItem('expenses:monthly');
    
    if (storedBase) setBaseExpenses(JSON.parse(storedBase));
    if (storedMonthly) setMonthlyExpenses(JSON.parse(storedMonthly));
  }, []);

  // --- Persistence ---
  useEffect(() => {
    if (bookings.length > 0) localStorage.setItem('pc_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => { localStorage.setItem('expenses:base', JSON.stringify(baseExpenses)); }, [baseExpenses]);
  useEffect(() => { localStorage.setItem('expenses:monthly', JSON.stringify(monthlyExpenses)); }, [monthlyExpenses]);

  useEffect(() => {
      if (successMsg) {
          const timer = setTimeout(() => setSuccessMsg(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [successMsg]);

  // --- Handlers ---
  const handleAddBookings = (newBookings: BookingRecord[]) => {
    setBookings(prev => {
        const updated = [...prev, ...newBookings];
        return updated;
    });
    setSuccessMsg(`Added ${newBookings.length} new bookings.`);
  };

  const handleImport = (imported: BookingRecord[]) => {
    setBookings(prevBookings => {
       const existingSignatures = new Set(prevBookings.map(b => `${b.booking_reference}|${b.unit}`.toLowerCase()));
       const newUniqueBookings = imported.filter(b => !existingSignatures.has(`${b.booking_reference}|${b.unit}`.toLowerCase()));
       
       if (newUniqueBookings.length === 0) {
           setSuccessMsg("No new bookings found.");
           return prevBookings;
       }
       const updatedBookings = [...prevBookings, ...newUniqueBookings];
       setSuccessMsg(`Appended ${newUniqueBookings.length} new bookings.`);
       return updatedBookings;
    });
  };

  const handleDeleteAll = () => {
    if(window.confirm('Reset to Initial CSV Data? Preserves expenses.')) {
        const { bookings: realBookings } = parseCSV(INITIAL_REAL_DATA);
        const inferredUnits = extractUnitsFromBookings(realBookings);
        setBookings(realBookings);
        setUnits(inferredUnits);
        localStorage.setItem('pc_bookings', JSON.stringify(realBookings));
        localStorage.setItem('pc_units', JSON.stringify(inferredUnits));
        setSuccessMsg('System reset.');
    }
  };

  // --- Add-ons Handlers ---
  const openAddOnModal = (bookingId: string) => {
      setSelectedBookingForAddons(bookingId);
      setIsAddOnModalOpen(true);
      setNewAddOn({ category: AddOnCategory.IslandHopping, name: '', amount: '', status: AddOnState.Forecasted });
  };

  const handleSaveAddOn = () => {
      if (selectedBookingForAddons && newAddOn.name && newAddOn.amount) {
          // Block "Extended Stay"
          if (newAddOn.name.toLowerCase().includes('extended stay')) {
             alert('Extended stays are managed via Sirvoy and cannot be added manually.');
             return;
          }

          const amountVal = parseFloat(newAddOn.amount);
          const addOnItem: AddOn = {
              id: uuidv4(),
              category: newAddOn.category,
              name: newAddOn.name,
              amount: amountVal,
              status: newAddOn.status,
              date: new Date().toISOString()
          };

          setBookings(prev => prev.map(b => {
              if (b.internal_id === selectedBookingForAddons) {
                  return { ...b, add_ons: [...b.add_ons, addOnItem] };
              }
              return b;
          }));
          
          setNewAddOn({ ...newAddOn, name: '', amount: '' }); 
      }
  };

  const handleDeleteAddOn = (bookingId: string, addOnId: string) => {
      setBookings(prev => prev.map(b => {
          if (b.internal_id === bookingId) {
              return { ...b, add_ons: b.add_ons.filter(a => a.id !== addOnId) };
          }
          return b;
      }));
  };

  const handleUpdateAddOnStatus = (bookingId: string, addOnId: string, newStatus: AddOnState) => {
      setBookings(prev => prev.map(b => {
          if (b.internal_id === bookingId) {
              return { ...b, add_ons: b.add_ons.map(a => a.id === addOnId ? { ...a, status: newStatus } : a) };
          }
          return b;
      }));
  };

  // --- Expense Handlers ---
  const handleSaveExpense = () => {
    if (newExpense.name && newExpense.amount) {
        const amt = parseFloat(newExpense.amount);
        if (newExpense.isRecurring) {
            setBaseExpenses(prev => [...prev, { id: uuidv4(), name: newExpense.name, category: newExpense.category, amount: amt, isRecurring: true, active: true }]);
        } else {
            setMonthlyExpenses(prev => [...prev, { id: uuidv4(), name: newExpense.name, category: newExpense.category, amount: amt, month: currentMonth, isRecurring: false }]);
        }
        setShowExpenseForm(false);
        setNewExpense({ name: '', category: ExpenseCategory.Other, amount: '', isRecurring: false });
    }
  };

  const handleAddBaseExpense = () => {
    if (newBaseExpense.name && newBaseExpense.amount) {
        setBaseExpenses(prev => [...prev, { id: uuidv4(), name: newBaseExpense.name, category: newBaseExpense.category, amount: parseFloat(newBaseExpense.amount), isRecurring: true, active: true }]);
        setNewBaseExpense({ name: '', category: ExpenseCategory.Other, amount: '' });
    }
  };

  const handleUpdateBaseExpense = (id: string, field: keyof BaseExpense, value: any) => {
    setBaseExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleDeleteExpense = (id: string, isRecurring: boolean) => {
    if (isRecurring) setBaseExpenses(prev => prev.filter(e => e.id !== id));
    else setMonthlyExpenses(prev => prev.filter(e => e.id !== id));
  };

  // --- Derived Data ---
  const currentBaseTotal = baseExpenses.filter(e => e.active).reduce((sum, e) => sum + e.amount, 0);
  const currentMonthlyTotal = monthlyExpenses.filter(e => e.month === currentMonth).reduce((sum, e) => sum + e.amount, 0);
  const totalFixedExpenses = currentBaseTotal + currentMonthlyTotal;
  
  // Updated Financials with Variable Costs & Net Position
  const financials = calculateFinancials(bookings, currentMonth, totalFixedExpenses);

  const filteredBookings = bookings.filter(b => {
      const matchGuest = b.guest_name.toLowerCase().includes(filterGuest.toLowerCase());
      const matchUnit = filterUnit === 'All' || b.unit === filterUnit;
      return matchGuest && matchUnit;
  }).sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());

  // --- Modals ---
  const activeBooking = bookings.find(b => b.internal_id === selectedBookingForAddons);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 max-w-[1400px] mx-auto pb-20 overflow-x-hidden relative">
      
      {/* SUCCESS BANNER */}
      {successMsg && (
          <div className="fixed top-4 right-4 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl animate-fade-in border border-emerald-500 font-bold">
              ✓ {successMsg}
          </div>
      )}

      {/* RECURRING EXPENSE MANAGER MODAL */}
      {showBaseExpenseManager && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between bg-slate-900/50">
                    <h3 className="font-bold">Recurring Expenses</h3>
                    <button onClick={() => setShowBaseExpenseManager(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="p-4 bg-slate-900/30">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 uppercase">Category</label>
                            <select className="w-full bg-slate-800 border border-slate-600 rounded text-sm px-2 py-1.5"
                                value={newBaseExpense.category} onChange={e => setNewBaseExpense({...newBaseExpense, category: e.target.value as ExpenseCategory})}>
                                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 uppercase">Name</label>
                            <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm"
                                value={newBaseExpense.name} onChange={e => setNewBaseExpense({...newBaseExpense, name: e.target.value})} />
                        </div>
                        <div className="w-24">
                           <label className="text-[10px] text-slate-500 uppercase">Amount</label>
                           <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-right" 
                                value={newBaseExpense.amount} onChange={e => setNewBaseExpense({...newBaseExpense, amount: e.target.value})} />
                        </div>
                        <button onClick={handleAddBaseExpense} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold">Add</button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto space-y-2">
                    {baseExpenses.map(e => (
                        <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded border border-slate-700">
                             <input type="checkbox" checked={e.active} onChange={x => handleUpdateBaseExpense(e.id, 'active', x.target.checked)} />
                             <div className="flex-1">
                                 <div className="text-sm font-medium">{e.name}</div>
                                 <div className="text-xs text-slate-500">{e.category}</div>
                             </div>
                             <div className="font-mono text-rose-400">₱{e.amount}</div>
                             <button onClick={() => handleDeleteExpense(e.id, true)} className="text-rose-500">×</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* ADD-ONS MODAL */}
      {isAddOnModalOpen && activeBooking && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-white">Add-ons Manager</h3>
                          <p className="text-xs text-slate-400">{activeBooking.guest_name} • {activeBooking.unit}</p>
                      </div>
                      <button onClick={() => setIsAddOnModalOpen(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
                  </div>
                  
                  {/* List of Existing Add-ons */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {activeBooking.add_ons.length === 0 && <p className="text-slate-500 text-sm text-center italic py-4">No add-ons for this reservation yet.</p>}
                      {activeBooking.add_ons.map(addon => (
                          <div key={addon.id} className="bg-slate-700/30 p-3 rounded border border-slate-600 flex justify-between items-center">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="text-white font-medium text-sm">{addon.name}</span>
                                      <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400">{addon.category}</span>
                                      {!isProfitGenerating(addon.category) && (
                                          <span className="text-[10px] bg-amber-900/50 text-amber-500 px-1 rounded">Pass-Through</span>
                                      )}
                                  </div>
                                  <div className="mt-1 flex gap-2">
                                     <select 
                                        className={`text-[10px] px-1.5 py-0.5 rounded border border-transparent cursor-pointer 
                                            ${addon.status === AddOnState.Actual ? 'bg-emerald-900 text-emerald-300' : 
                                              addon.status === AddOnState.PreSold ? 'bg-indigo-900 text-indigo-300' : 
                                              'bg-slate-600 text-slate-300'}`}
                                        value={addon.status}
                                        onChange={(e) => handleUpdateAddOnStatus(activeBooking.internal_id, addon.id, e.target.value as AddOnState)}
                                     >
                                         <option value={AddOnState.Forecasted}>Forecasted</option>
                                         <option value={AddOnState.PreSold}>Pre-sold</option>
                                         <option value={AddOnState.Actual}>Actual</option>
                                     </select>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-emerald-400 font-mono text-sm">₱{addon.amount.toLocaleString()}</div>
                                  <button onClick={() => handleDeleteAddOn(activeBooking.internal_id, addon.id)} className="text-rose-400 text-xs mt-1 hover:text-rose-300 underline">Remove</button>
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Add New Form */}
                  <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Add New Item</h4>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                          <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                             value={newAddOn.category} onChange={e => setNewAddOn({...newAddOn, category: e.target.value as AddOnCategory})}>
                              {Object.values(AddOnCategory).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                             value={newAddOn.status} onChange={e => setNewAddOn({...newAddOn, status: e.target.value as AddOnState})}>
                              <option value={AddOnState.Forecasted}>Forecasted</option>
                              <option value={AddOnState.PreSold}>Pre-sold</option>
                              <option value={AddOnState.Actual}>Actual</option>
                          </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          <input placeholder="Item Name" className="col-span-2 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                             value={newAddOn.name} onChange={e => setNewAddOn({...newAddOn, name: e.target.value})} />
                          <input type="number" placeholder="Price" className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                             value={newAddOn.amount} onChange={e => setNewAddOn({...newAddOn, amount: e.target.value})} />
                      </div>
                      <button onClick={handleSaveAddOn} className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded text-sm shadow">
                          + Add Item
                      </button>
                  </div>
              </div>
          </div>
      )}

      <header className="mb-6 border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-center gap-4 md:items-end">
        <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">Palawan Collective</h1>
            <p className="text-slate-400 text-sm">Occupancy & Revenue Dashboard</p>
        </div>
        
        <ManilaClock />

        <div className="flex items-center gap-6">
             <a href="https://github.com/palawancollective" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">
                <GithubIcon />
             </a>
             <div className="text-right">
                 <span className="block text-xs text-slate-500 uppercase tracking-wider">Total Bookings</span>
                 <span className="font-mono text-xl font-bold text-emerald-400">{bookings.length}</span>
            </div>
        </div>
      </header>

      {/* 1. Add Booking / Actions */}
      <AddBookingForm 
        units={units} 
        onAdd={handleAddBookings} 
        onDeleteAll={handleDeleteAll}
        onImport={handleImport}
      />

      {/* 2. Global Occupancy Goal */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Global Occupancy Goal</label>
            <span className="text-lg font-bold text-white">{occupancyGoal}%</span>
        </div>
        <input 
            type="range" 
            min="0" max="100" 
            value={occupancyGoal} 
            onChange={e => setOccupancyGoal(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* 3. Month Selector */}
      <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 w-max">
            {MONTHS.map(m => (
                <button 
                    key={m}
                    onClick={() => setCurrentMonth(m)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                        ${currentMonth === m 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    {m}
                </button>
            ))}
        </div>
      </div>

      {/* 4. Revenue Summary Cards - GROUPED LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* GROUP 1: CASH */}
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 flex flex-col gap-2">
            <div className="text-[10px] uppercase font-bold text-emerald-500/80 px-2 tracking-widest">Cash Position</div>
            <div className="grid grid-cols-2 gap-2 flex-1">
                <StatCard 
                    title="Realized Revenue" 
                    value={`₱${financials.cashReceived.toLocaleString()}`} 
                    subtext="Actual Cash In"
                    colorClass="text-emerald-400" 
                    tooltip="Actual cash received. Includes paid room charges and actual add-ons only."
                />
                <StatCard 
                    title="Net Profit" 
                    value={`₱${financials.netCashPosition.toLocaleString()}`} 
                    subtext="Realized - Exp"
                    colorClass={financials.netCashPosition >= 0 ? "text-emerald-400" : "text-rose-400"} 
                    tooltip="Realized cash minus total expenses. Forecasted revenue is excluded."
                />
            </div>
        </div>

        {/* GROUP 2: EXPECTED */}
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 flex flex-col gap-2">
            <div className="text-[10px] uppercase font-bold text-blue-500/80 px-2 tracking-widest">Expected</div>
            <div className="grid grid-cols-2 gap-2 flex-1">
                <StatCard 
                    title="Base Room Revenue" 
                    value={`₱${financials.baseRevenue.toLocaleString()}`} 
                    subtext="Unpaid Included"
                    colorClass="text-slate-200" 
                    tooltip="Room revenue expected from confirmed reservations, regardless of payment status."
                />
                <StatCard 
                    title="Forecasted Add-ons" 
                    value={`₱${financials.addonExpected.toLocaleString()}`} 
                    subtext="Pre-sold Only"
                    colorClass="text-blue-400" 
                    tooltip="Add-ons marked as 'Pre-Sold'. Does not include 'Forecasted' placeholders."
                />
            </div>
        </div>

        {/* GROUP 3: POTENTIAL */}
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 flex flex-col gap-2">
            <div className="text-[10px] uppercase font-bold text-slate-500/80 px-2 tracking-widest">Potential</div>
            <div className="grid grid-cols-2 gap-2 flex-1">
                <StatCard 
                    title="Total Revenue" 
                    value={`₱${financials.potentialRevenue.toLocaleString()}`} 
                    subtext="Max Possible"
                    colorClass="text-slate-400" 
                    tooltip="Maximum possible revenue including room charges and all add-ons."
                />
                 <StatCard 
                    title="Total Expenses" 
                    value={`₱${financials.totalExpenses.toLocaleString()}`} 
                    subtext="Fixed + Variable"
                    colorClass="text-rose-400" 
                    tooltip="Fixed Monthly Expenses + Variable COGS (Labor/Fuel)."
                />
            </div>
        </div>
      </div>

      {/* 5. Break-even & Occupancy Table */}
      <Card className="mb-6 overflow-hidden p-0">
          <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center">
              <h3 className="font-bold text-white mr-2">Break-even & Occupancy - {currentMonth}</h3>
          </div>
          <div className="p-4">
            <BreakEvenTable 
              bookings={bookings} 
              units={units} 
              monthStr={currentMonth}
              occupancyGoal={occupancyGoal}
              totalMonthlyExpenses={financials.totalExpenses}
              netCashPosition={financials.netCashPosition}
            />
          </div>
      </Card>

      {/* 6. Daily Occupancy Grid */}
      <Card className="mb-6 p-4">
          <h3 className="font-bold text-white mb-4">Daily Occupancy - {currentMonth}</h3>
          <DailyOccupancyGrid units={units} bookings={bookings} monthStr={currentMonth} />
      </Card>

      {/* 7. Bookings Table */}
      <Card className="mb-6 p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 bg-slate-800 z-10">
              <h3 className="font-bold text-white">Bookings ({filteredBookings.length})</h3>
              <div className="flex gap-2 w-full md:w-auto">
                  <input type="text" placeholder="Search..." className="bg-slate-900 border border-slate-600 rounded px-3 py-1 text-xs text-slate-200 outline-none w-full md:w-48"
                    value={filterGuest} onChange={e => setFilterGuest(e.target.value)} />
                  <select className="bg-slate-900 border border-slate-600 rounded px-3 py-1 text-xs text-slate-200 outline-none"
                    value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                      <option value="All">All Units</option>
                      {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
              </div>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto bg-slate-900/30">
             <div className="hidden md:grid grid-cols-8 gap-2 p-3 bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-700">
                <div className="col-span-2">Guest</div>
                <div>Unit/Ref</div>
                <div>Dates</div>
                <div className="text-right">Base</div>
                <div className="text-right">Paid</div>
                <div className="text-center">Add-ons</div>
                <div className="text-center">Action</div>
             </div>

             <div className="flex flex-col gap-2 p-2 md:p-0 md:gap-0">
               {filteredBookings.map(b => {
                   const totalAddOns = b.add_ons.reduce((sum, a) => sum + a.amount, 0);
                   const isFullyPaid = b.paid >= (b.amount - 0.01);
                   return (
                       <div key={b.internal_id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 md:bg-transparent md:border-0 md:border-b md:border-slate-800 md:rounded-none md:p-3 md:grid md:grid-cols-8 md:gap-2 items-center hover:bg-slate-800/50 transition-colors">
                          <div className="col-span-2 mb-2 md:mb-0">
                              <div className="font-bold text-slate-200 text-sm">{b.guest_name}</div>
                              <div className="text-xs text-slate-500">{b.platform}</div>
                          </div>
                          <div className="flex justify-between md:block mb-1 md:mb-0">
                              <span className="md:hidden text-xs text-slate-500">Unit</span>
                              <div className="text-xs">
                                  <span className="text-indigo-300 font-bold">{b.unit}</span>
                                  <span className="block text-slate-500 font-mono text-[10px]">{b.booking_reference}</span>
                              </div>
                          </div>
                          <div className="flex justify-between md:block mb-1 md:mb-0">
                              <span className="md:hidden text-xs text-slate-500">Dates</span>
                              <div className="text-xs text-slate-400">
                                 {b.check_in.slice(5)} <span className="text-slate-600">→</span> {b.check_out.slice(5)}
                              </div>
                          </div>
                          <div className="flex justify-between md:block mb-1 md:mb-0 text-right">
                              <span className="md:hidden text-xs text-slate-500">Base</span>
                              <span className="text-sm text-slate-300">₱{b.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between md:block mb-1 md:mb-0 text-right">
                              <span className="md:hidden text-xs text-slate-500">Paid</span>
                              <span className={`text-sm font-bold ${isFullyPaid ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  ₱{b.paid.toLocaleString()}
                              </span>
                          </div>
                          <div className="flex justify-between md:block mb-1 md:mb-0 text-center">
                              <span className="md:hidden text-xs text-slate-500">Add-ons</span>
                              {totalAddOns > 0 ? (
                                  <span className="text-xs text-emerald-400 font-mono">₱{totalAddOns.toLocaleString()}</span>
                              ) : (
                                  <span className="text-xs text-slate-600">-</span>
                              )}
                          </div>
                          <div className="mt-2 md:mt-0 text-center">
                              <button 
                                onClick={() => openAddOnModal(b.internal_id)}
                                className="w-full md:w-auto px-3 py-1 bg-slate-700 hover:bg-slate-600 text-[10px] uppercase font-bold rounded text-slate-300 border border-slate-600"
                              >
                                {b.add_ons.length > 0 ? `Manage (${b.add_ons.length})` : '+ Add-on'}
                              </button>
                          </div>
                       </div>
                   );
               })}
             </div>
          </div>
      </Card>

      {/* 8. Expenses */}
      <Card className="p-4 border-t-4 border-t-rose-500">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                  <h3 className="font-bold text-white">Monthly Expenses - {currentMonth}</h3>
                  <button onClick={() => setShowBaseExpenseManager(true)} className="text-xs bg-slate-800 px-2 py-1 rounded text-indigo-400 hover:text-white">Manage Recurring</button>
              </div>
              {!showExpenseForm && <button onClick={() => setShowExpenseForm(true)} className="bg-rose-600 text-white px-3 py-1 rounded text-xs hover:bg-rose-500">+ Expense</button>}
          </div>
          {/* Expense Form */}
          {showExpenseForm && (
            <div className="bg-slate-900/50 p-4 rounded border border-slate-700 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                   value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}>
                    {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Name" className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" value={newExpense.name} onChange={e => setNewExpense({...newExpense, name: e.target.value})} />
                <input type="number" placeholder="Amount" className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                
                <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 px-2 py-1.5 rounded border border-slate-700 hover:bg-slate-800 transition-colors">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-indigo-500 focus:ring-offset-0 bg-slate-900 border-slate-600 accent-indigo-500"
                        checked={newExpense.isRecurring}
                        onChange={e => setNewExpense({...newExpense, isRecurring: e.target.checked})}
                    />
                    <span className="text-xs text-slate-300 select-none leading-tight">Apply to all future months</span>
                </label>

                <div className="flex gap-2">
                    <button onClick={handleSaveExpense} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded text-sm font-bold shadow-lg transition-all">Save</button>
                    <button onClick={() => setShowExpenseForm(false)} className="px-3 text-slate-400 text-xs hover:text-white">Cancel</button>
                </div>
            </div>
          )}
          <div className="space-y-2 mb-4">
              {/* FIXED EXPENSES */}
              {[...baseExpenses.filter(e => e.active), ...monthlyExpenses.filter(e => e.month === currentMonth)].map(e => (
                  <div key={e.id} className="flex justify-between text-sm p-2 bg-slate-900 rounded border border-slate-800">
                      <div>
                          <span className="text-slate-300 font-medium">{e.name}</span>
                          <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-1.5 rounded">{e.category}</span>
                          {e.isRecurring && <span className="ml-1 text-[10px] text-indigo-400">(Recurring)</span>}
                      </div>
                      <div className="flex gap-3">
                          <span className="text-rose-400 font-mono">-₱{e.amount.toLocaleString()}</span>
                          <button onClick={() => handleDeleteExpense(e.id, e.isRecurring)} className="text-slate-600 hover:text-rose-500">×</button>
                      </div>
                  </div>
              ))}
              
              {/* DYNAMIC VARIABLE COSTS (Island Hopping COGS) */}
              {financials.variableCosts > 0 && (
                   <div className="flex justify-between text-sm p-2 bg-slate-900/50 rounded border border-orange-900/30">
                      <div>
                          <span className="text-orange-300 font-medium">Variable Costs (COGS)</span>
                          <span className="ml-2 text-[10px] text-orange-500/70">Labor & Fuel (Auto-calc)</span>
                      </div>
                      <div className="flex gap-3">
                          <span className="text-rose-400 font-mono">-₱{financials.variableCosts.toLocaleString()}</span>
                          <span className="w-4"></span>
                      </div>
                  </div>
              )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <span className="font-bold text-white">Total Expenses</span>
              <span className="font-bold text-rose-400 text-xl">₱{financials.totalExpenses.toLocaleString()}</span>
          </div>
      </Card>
      
      <FinancialDocumentation />
    </div>
  );
};

export default App;
