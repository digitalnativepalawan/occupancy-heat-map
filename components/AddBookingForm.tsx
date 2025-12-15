import React, { useState, useRef, useEffect } from 'react';
import { UnitDefinition, Platform, BookingRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Card } from './DashboardComponents';
import { downloadTemplate, parseCSV } from '../services/utils';

interface AddBookingFormProps {
  units: UnitDefinition[];
  onAdd: (bookings: BookingRecord[]) => void;
  onDeleteAll: () => void;
  onImport: (bookings: BookingRecord[]) => void;
}

export const AddBookingForm = ({ units, onAdd, onDeleteAll, onImport }: AddBookingFormProps) => {
  const [formData, setFormData] = useState({
    guestName: '',
    bookingRef: '',
    guests: 2,
    selectedUnits: [] as string[],
    checkIn: '',
    checkOut: '',
    amount: 0,
    paid: 0,
    platform: Platform.Direct,
  });

  const [importStatus, setImportStatus] = useState<{
      msg: string;
      errors: string[];
      success: boolean;
      preview: BookingRecord[];
  } | null>(null);

  // --- Multi-select Logic ---
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleUnitSelection = (unitName: string) => {
      setFormData(prev => {
          const exists = prev.selectedUnits.includes(unitName);
          const newSelection = exists 
              ? prev.selectedUnits.filter(u => u !== unitName)
              : [...prev.selectedUnits, unitName];
          return { ...prev, selectedUnits: newSelection };
      });
  };

  const removeUnit = (unitName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData(prev => ({
          ...prev,
          selectedUnits: prev.selectedUnits.filter(u => u !== unitName)
      }));
  };
  // ---------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedUnits.length === 0) return;

    const amountPerUnit = formData.amount / formData.selectedUnits.length;
    const paidPerUnit = formData.paid / formData.selectedUnits.length;
    // Keep raw Booking ID logic: if user enters one, use it, else generate random for demo
    const commonRef = formData.bookingRef || `REF-${Math.floor(Math.random() * 10000)}`;

    const newBookings: BookingRecord[] = formData.selectedUnits.map((unitName) => ({
      internal_id: uuidv4(),
      booking_reference: commonRef,
      guest_name: formData.guestName,
      unit: unitName,
      platform: formData.platform,
      guests: formData.guests, 
      check_in: formData.checkIn,
      check_out: formData.checkOut,
      amount: Number(amountPerUnit.toFixed(2)),
      paid: Number(paidPerUnit.toFixed(2)),
      add_ons: []
    }));

    onAdd(newBookings);
    
    setFormData({
        guestName: '',
        bookingRef: '',
        guests: 2,
        selectedUnits: [],
        checkIn: '',
        checkOut: '',
        amount: 0,
        paid: 0,
        platform: Platform.Direct,
    });
    setImportStatus(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportStatus(null); 

    if (file) {
      // 1. FILE CONFIRMATION
      console.log('File selected:', file.name, `(${file.size} bytes)`);
      
      const text = await file.text();
      const firstLines = text.split('\n').slice(0, 3);
      console.log('First 3 lines of raw CSV:', firstLines);

      if (!text.trim()) {
        setImportStatus({ msg: "File is empty or unreadable.", errors: [], success: false, preview: [] });
        return;
      }

      // 2. PARSING
      const { bookings: records, errors } = parseCSV(text);
      console.log('Parsed rows:', records.length);
      console.log('Errors found:', errors.length);

      // 3. FAIL LOUDLY
      if (records.length === 0 && errors.length > 0) {
          setImportStatus({ 
              msg: "Failed to parse any valid rows. See errors below.", 
              errors: errors, 
              success: false,
              preview: []
          });
          e.target.value = ''; 
          return;
      }

      if (records.length === 0 && errors.length === 0) {
           setImportStatus({ 
              msg: "File parsed but contained no data rows.", 
              errors: ["Check if file is empty or only contains headers.", "Ensure line endings are standard."], 
              success: false,
              preview: []
          });
          e.target.value = ''; 
          return;
      }
      
      // Success path (show preview first)
      setImportStatus({
          msg: `Ready to Append ${records.length} Bookings`,
          errors: errors,
          success: true,
          preview: records
      });
      // Do not clear input yet, allow retry
    }
  };

  const confirmImport = () => {
      if (importStatus?.preview) {
          onImport(importStatus.preview);
          setImportStatus(null);
          // Reset file input by ID or generic reset logic if needed, but component state clears status
      }
  };

  return (
    <Card className="mb-6 border-t-4 border-t-indigo-500">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-white">Add Booking</h2>
        <div className="flex gap-2">
            <button type="button" onClick={downloadTemplate} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded text-slate-200 border border-slate-600">
                ⬇ Export CSV
            </button>
            <label className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded text-slate-200 border border-slate-600 cursor-pointer">
                ⬆ Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
            <button onClick={onDeleteAll} className="px-3 py-1 bg-rose-900/50 hover:bg-rose-900 text-xs rounded text-rose-300 border border-rose-800">
                ⚠ Hard Reset
            </button>
        </div>
      </div>

      {/* DEBUG VISIBILITY: Status & Preview */}
      {importStatus && (
          <div className={`mb-4 p-4 rounded border text-sm ${importStatus.success ? 'bg-slate-800 border-indigo-500' : 'bg-rose-900/30 border-rose-800'}`}>
              <div className="flex justify-between items-center mb-2">
                  <p className={`font-bold text-lg ${importStatus.success ? 'text-indigo-400' : 'text-rose-400'}`}>
                      {importStatus.msg}
                  </p>
                  {importStatus.success && (
                      <div className="flex gap-2">
                          <button onClick={() => setImportStatus(null)} className="px-3 py-1 text-slate-400 hover:text-white">Cancel</button>
                          <button onClick={confirmImport} className="px-4 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-lg animate-pulse">
                              CONFIRM IMPORT
                          </button>
                      </div>
                  )}
              </div>

              {/* Error List */}
              {importStatus.errors.length > 0 && (
                  <div className="mt-2 mb-4">
                      <p className="text-rose-400 text-xs font-bold mb-1">Errors / Warnings:</p>
                      <div className="max-h-24 overflow-y-auto bg-black/30 p-2 rounded border border-rose-900/50">
                          {importStatus.errors.map((err, idx) => (
                              <div key={idx} className="text-rose-300 text-xs font-mono">{err}</div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Data Preview Table */}
              {importStatus.preview.length > 0 && (
                  <div>
                      <p className="text-slate-400 text-xs font-bold mb-1">Preview (First 3 rows):</p>
                      <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left text-slate-300">
                              <thead className="text-slate-500 font-mono uppercase bg-black/20">
                                  <tr>
                                      <th className="p-1">ID</th>
                                      <th className="p-1">Name</th>
                                      <th className="p-1">Unit</th>
                                      <th className="p-1">Check In</th>
                                      <th className="p-1">Paid</th>
                                  </tr>
                              </thead>
                              <tbody className="font-mono">
                                  {importStatus.preview.slice(0, 3).map((r, i) => (
                                      <tr key={i} className="border-b border-slate-700/50">
                                          <td className="p-1">{r.booking_reference}</td>
                                          <td className="p-1">{r.guest_name}</td>
                                          <td className="p-1 text-emerald-400">{r.unit}</td>
                                          <td className="p-1">{r.check_in}</td>
                                          <td className="p-1">{r.paid}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                          {importStatus.preview.length > 3 && (
                             <p className="text-center text-[10px] text-slate-500 mt-1 italic">...and {importStatus.preview.length - 3} more</p>
                          )}
                      </div>
                  </div>
              )}
          </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* ROW 1: Guest & Unit Selection */}
        <div className="md:col-span-4">
          <label className="block text-xs text-slate-400 mb-1">Guest Name</label>
          <input 
            type="text" 
            required
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
            value={formData.guestName}
            onChange={e => setFormData({...formData, guestName: e.target.value})}
            placeholder="John Doe"
          />
        </div>

        {/* CUSTOM MULTI-SELECT UNIT DROPDOWN */}
        <div className="md:col-span-4 relative" ref={dropdownRef}>
            <label className="block text-xs text-slate-400 mb-1">Units (Multi-select)</label>
            <div 
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm min-h-[42px] flex flex-wrap gap-2 cursor-pointer focus-within:border-indigo-500 items-center relative"
                onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
            >
                {formData.selectedUnits.length === 0 && (
                    <span className="text-slate-500 italic">Select units...</span>
                )}
                {formData.selectedUnits.map(unitName => (
                    <span key={unitName} className="bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 z-10">
                        {unitName}
                        <button 
                            type="button"
                            className="hover:text-white bg-indigo-800/50 rounded-full w-4 h-4 flex items-center justify-center leading-none"
                            onClick={(e) => removeUnit(unitName, e)}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg className={`w-4 h-4 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            {isUnitDropdownOpen && (
                <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {units.map(u => {
                        const isSelected = formData.selectedUnits.includes(u.name);
                        return (
                            <div 
                                key={u.id}
                                className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-700 transition-colors ${isSelected ? 'bg-slate-700/50' : ''}`}
                                onClick={() => toggleUnitSelection(u.name)}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500 bg-slate-900'}`}>
                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>{u.name}</span>
                            </div>
                        );
                    })}
                    {units.length === 0 && (
                        <div className="p-4 text-center text-slate-500 text-xs">No units available</div>
                    )}
                </div>
            )}
        </div>
        
        <div className="md:col-span-2">
           <label className="block text-xs text-slate-400 mb-1">Guests</label>
           <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" value={formData.guests} onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})} />
        </div>

        <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Platform</label>
            <select
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                value={formData.platform}
                onChange={e => setFormData({...formData, platform: e.target.value as Platform})}
            >
                {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
        </div>

        {/* ROW 2: Dates & Money */}
        <div className="md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">Check In</label>
            <input 
                type="date" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-400 focus:border-indigo-500 outline-none"
                value={formData.checkIn}
                onChange={e => setFormData({...formData, checkIn: e.target.value})}
            />
        </div>
        <div className="md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">Check Out</label>
            <input 
                type="date" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-400 focus:border-indigo-500 outline-none"
                value={formData.checkOut}
                onChange={e => setFormData({...formData, checkOut: e.target.value})}
            />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs text-slate-400 mb-1">Total Amount (Projected)</label>
          <input 
            type="number" 
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            placeholder="0.00"
            value={formData.amount || ''}
            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs text-slate-400 mb-1">Paid So Far (Realized)</label>
          <input 
            type="number" 
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            placeholder="0.00"
            value={formData.paid || ''}
            onChange={e => setFormData({...formData, paid: parseFloat(e.target.value)})}
          />
        </div>

        <div className="md:col-span-12">
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded shadow transition-colors text-sm uppercase tracking-wide">
                Save Booking
            </button>
        </div>
      </form>
    </Card>
  );
};
