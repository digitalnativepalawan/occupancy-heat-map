import React, { useState } from 'react';
import { 
  AccommodationSettings, 
  UnitDefinition, 
  AddOnCatalogItem, 
  AccommodationType, 
  UnitType, 
  AddOnCategory 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Card } from './DashboardComponents';

interface OnboardingWizardProps {
  onComplete: (settings: AccommodationSettings, units: UnitDefinition[], catalog: AddOnCatalogItem[]) => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1);
  
  // Step 1: Accommodation
  const [settings, setSettings] = useState<AccommodationSettings>({
    name: '',
    location: '',
    type: AccommodationType.Resort,
    timezone: 'Asia/Manila',
    currency: 'PHP',
    amenities: {
      hasAC: false,
      hasHotShower: false,
      hasWorkspace: false,
      hasGenerator: false,
      breakfastIncluded: false
    }
  });

  // Step 2: Units
  const [units, setUnits] = useState<UnitDefinition[]>([]);
  const [newUnit, setNewUnit] = useState<Partial<UnitDefinition>>({
    name: '',
    type: UnitType.PrivateRoom,
    maxGuests: 2,
    baseNightlyRate: 1500,
    includeInOccupancy: true
  });

  // Step 4: Catalog
  const [catalog, setCatalog] = useState<AddOnCatalogItem[]>([
    { id: '1', category: AddOnCategory.FoodBeverage, subCategory: 'Breakfast', defaultPrice: 300 },
    { id: '2', category: AddOnCategory.Transportation, subCategory: 'Airport Pickup', defaultPrice: 500 },
    { id: '3', category: AddOnCategory.IslandHopping, subCategory: 'Tour A', defaultPrice: 1200 },
  ]);
  const [newCatalogItem, setNewCatalogItem] = useState<Partial<AddOnCatalogItem>>({
    category: AddOnCategory.Other,
    subCategory: '',
    defaultPrice: 0
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  
  const handleAddUnit = () => {
    if (newUnit.name) {
      setUnits([...units, { ...newUnit, id: uuidv4() } as UnitDefinition]);
      setNewUnit({ 
        name: '', 
        type: UnitType.PrivateRoom, 
        maxGuests: 2, 
        baseNightlyRate: 1500, 
        includeInOccupancy: true
      });
    }
  };

  const handleRemoveUnit = (id: string) => {
    setUnits(units.filter(u => u.id !== id));
  };

  const handleAddCatalogItem = () => {
    if (newCatalogItem.subCategory) {
      setCatalog([...catalog, { ...newCatalogItem, id: uuidv4() } as AddOnCatalogItem]);
      setNewCatalogItem({ category: AddOnCategory.Other, subCategory: '', defaultPrice: 0 });
    }
  };

  const handleFinish = () => {
    onComplete(settings, units, catalog);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-t-4 border-t-emerald-500">
        <div className="mb-6 border-b border-slate-700 pb-4">
          <h1 className="text-2xl font-bold text-white">Palawan Collective Setup</h1>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-2">Step {step} of 4</p>
        </div>

        {/* STEP 1: ACCOMMODATION DETAILS */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Accommodation Details</h2>
            <div>
              <label className="block text-xs text-slate-400">Property Name</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" 
                value={settings.name} 
                onChange={e => setSettings({...settings, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Location (Country, City)</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" 
                value={settings.location} 
                onChange={e => setSettings({...settings, location: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400">Type</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                  value={settings.type}
                  onChange={e => setSettings({...settings, type: e.target.value})}
                >
                  {Object.values(AccommodationType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">Currency</label>
                <select 
                   className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                   value={settings.currency}
                   onChange={e => setSettings({...settings, currency: e.target.value})}
                >
                  <option value="PHP">PHP (₱)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: UNITS */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Unit Setup</h2>
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                 <div className="col-span-2">
                    <label className="block text-xs text-slate-500">Unit Name</label>
                    <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white" 
                      placeholder="e.g. Villa 101"
                      value={newUnit.name}
                      onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                    />
                 </div>
                 <div className="col-span-2">
                    <label className="block text-xs text-slate-500">Type</label>
                    <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                      value={newUnit.type}
                      onChange={e => setNewUnit({...newUnit, type: e.target.value})}
                    >
                      {Object.values(UnitType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs text-slate-500">Max Guests</label>
                    <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white" 
                      value={newUnit.maxGuests}
                      onChange={e => setNewUnit({...newUnit, maxGuests: parseInt(e.target.value)})}
                    />
                 </div>
               </div>
               <button onClick={handleAddUnit} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-medium">
                 + Add Unit
               </button>
            </div>

            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {units.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700">
                  <div className="text-sm text-white">
                    <span className="font-bold">{u.name}</span> <span className="text-slate-400">({u.type})</span>
                  </div>
                  <button onClick={() => handleRemoveUnit(u.id)} className="text-rose-400 text-xs px-2">Remove</button>
                </div>
              ))}
              {units.length === 0 && <p className="text-center text-slate-500 text-sm">No units added yet.</p>}
            </div>
          </div>
        )}

        {/* STEP 3: AMENITIES */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Amenities (Metadata)</h2>
            <div className="space-y-3">
               {[
                 { label: 'Air Conditioning', key: 'hasAC' },
                 { label: 'Hot Shower', key: 'hasHotShower' },
                 { label: 'Dedicated Workspace', key: 'hasWorkspace' },
                 { label: 'Generator / Solar', key: 'hasGenerator' },
                 { label: 'Breakfast Included', key: 'breakfastIncluded' }
               ].map((item) => (
                 <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                      checked={(settings.amenities as any)[item.key]}
                      onChange={(e) => setSettings({
                        ...settings,
                        amenities: { ...settings.amenities, [item.key]: e.target.checked }
                      })}
                    />
                    <span className="text-slate-300">{item.label}</span>
                 </label>
               ))}
               <div>
                  <label className="block text-xs text-slate-400 mb-1">Wi-Fi Speed (Mbps)</label>
                  <input 
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" 
                    value={settings.amenities.wifiMbps || ''} 
                    onChange={e => setSettings({...settings, amenities: {...settings.amenities, wifiMbps: e.target.value}})}
                  />
               </div>
            </div>
          </div>
        )}

        {/* STEP 4: CATALOG */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Default Add-on Catalog</h2>
            <p className="text-xs text-slate-400">These are templates for items you sell frequently.</p>
            
            <div className="bg-slate-900 p-4 rounded border border-slate-700 grid grid-cols-3 gap-2">
               <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newCatalogItem.category}
                  onChange={e => setNewCatalogItem({...newCatalogItem, category: e.target.value})}
               >
                 {Object.values(AddOnCategory).map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <input className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  placeholder="Item Name"
                  value={newCatalogItem.subCategory}
                  onChange={e => setNewCatalogItem({...newCatalogItem, subCategory: e.target.value})}
               />
               <div className="flex gap-2">
                 <input className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white w-20"
                    type="number"
                    placeholder="Price"
                    value={newCatalogItem.defaultPrice}
                    onChange={e => setNewCatalogItem({...newCatalogItem, defaultPrice: parseFloat(e.target.value)})}
                 />
                 <button onClick={handleAddCatalogItem} className="bg-emerald-600 text-white rounded px-3 text-xs flex-1">+</button>
               </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {catalog.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700 text-sm">
                   <div className="flex gap-2 text-white">
                      <span className="text-slate-400">[{item.category}]</span>
                      <span>{item.subCategory}</span>
                   </div>
                   <div className="flex gap-4">
                      <span className="text-emerald-400">₱{item.defaultPrice}</span>
                      <button onClick={() => setCatalog(catalog.filter(c => c.id !== item.id))} className="text-rose-400 text-xs">x</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER NAV */}
        <div className="mt-8 flex justify-between">
          <button 
            onClick={handleBack} 
            disabled={step === 1}
            className={`px-4 py-2 rounded text-sm ${step === 1 ? 'opacity-0' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Back
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium"
            >
              Next Step
            </button>
          ) : (
            <button 
              onClick={handleFinish}
              disabled={units.length === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold shadow-lg shadow-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Setup
            </button>
          )}
        </div>

      </Card>
    </div>
  );
};