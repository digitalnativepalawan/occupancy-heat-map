
import React from 'react';
import { BookingRecord, UnitDefinition } from '../types';
import { calculateOccupancy, getDaysInMonth } from '../services/utils';

// --- Shared UI ---

export const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-700 ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, color = 'blue' }: { children?: React.ReactNode, color?: 'green' | 'purple' | 'red' | 'blue' | 'gray' | 'yellow' | 'orange' }) => {
  const colors = {
    green: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800',
    red: 'bg-rose-900/30 text-rose-400 border-rose-800',
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
    gray: 'bg-slate-700 text-slate-300 border-slate-600',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

export const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle z-50">
    <div className="cursor-help flex items-center justify-center w-4 h-4 rounded-full border border-slate-500 text-slate-400 text-[10px] hover:border-indigo-400 hover:text-indigo-400 transition-colors">
      i
    </div>
    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-slate-600 rounded shadow-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600"></div>
    </div>
  </div>
);

export const StatCard = ({ title, value, subtext, colorClass, tooltip }: { title: string, value: string, subtext: string, colorClass: string, tooltip?: string }) => (
  <Card className="flex flex-col gap-1 min-w-[130px] flex-1">
    <div className="flex items-center">
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</span>
        {tooltip && <InfoTooltip text={tooltip} />}
    </div>
    <span className={`text-xl font-bold ${colorClass}`}>{value}</span>
    <span className="text-slate-500 text-xs">{subtext}</span>
  </Card>
);

// --- Documentation Block ---
export const FinancialDocumentation = () => (
    <div className="mt-8 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-slate-200 font-bold mb-4 text-sm uppercase tracking-wider">Accounting Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-slate-400">
            <div>
                <span className="block text-emerald-400 font-medium mb-1">Cash Received</span>
                Paid Room Revenue + Paid Profit-Generating Add-ons. Excludes Transportation.
            </div>
            <div>
                <span className="block text-blue-400 font-medium mb-1">Expected Revenue</span>
                Booked Rooms + Pre-sold Add-ons. Used for forecasting.
            </div>
             <div>
                <span className="block text-indigo-400 font-medium mb-1">Pass-Through</span>
                Transportation revenue is collected but passed to providers. Excluded from Profit.
            </div>
            <div>
                <span className="block text-orange-400 font-medium mb-1">Cost of Goods (COGS)</span>
                Island Hopping includes implicit Labor (₱600) and Fuel (₱2,000) costs per actual trip.
            </div>
        </div>
    </div>
);

// --- Daily Occupancy Grid ---

interface DailyOccupancyGridProps {
  units: UnitDefinition[];
  bookings: BookingRecord[];
  monthStr: string;
}

export const DailyOccupancyGrid = ({ units, bookings, monthStr }: DailyOccupancyGridProps) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const isOccupied = (unitName: string, day: number) => {
        const checkDate = new Date(year, month - 1, day).setHours(0,0,0,0);
        return bookings.some(b => {
             if (b.unit !== unitName) return false;
             const start = new Date(b.check_in).setHours(0,0,0,0);
             const end = new Date(b.check_out).setHours(0,0,0,0);
             return checkDate >= start && checkDate < end;
        });
    };

    return (
        <div className="space-y-6">
            {units.map(u => (
                <div key={u.id}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-200">{u.name}</span>
                        <span className="text-xs text-slate-500">
                             {Math.round(calculateOccupancy(u.name, monthStr, bookings))}% Occupancy
                        </span>
                    </div>
                    <div className="grid grid-cols-7 md:grid-cols-[repeat(auto-fit,minmax(20px,1fr))] gap-1">
                        {daysArray.map(day => {
                            const occupied = isOccupied(u.name, day);
                            return (
                                <div 
                                    key={day} 
                                    className={`
                                        h-6 md:h-8 rounded-sm flex items-center justify-center text-[10px] 
                                        ${occupied ? 'bg-emerald-500 text-emerald-900 font-bold' : 'bg-slate-700 text-slate-500'}
                                    `}
                                    title={`Day ${day}: ${occupied ? 'Occupied' : 'Vacant'}`}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-700 rounded-sm"></div> Vacant
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-sm"></div> Occupied
                </div>
            </div>
        </div>
    );
};

// --- Tables ---

interface BreakEvenTableProps {
  bookings: BookingRecord[];
  units: UnitDefinition[];
  monthStr: string;
  occupancyGoal: number;
  totalMonthlyExpenses: number; // Includes Fixed + Variable
  netCashPosition: number;
}

export const BreakEvenTable = ({ bookings, units, monthStr, occupancyGoal, totalMonthlyExpenses, netCashPosition }: BreakEvenTableProps) => {
  const [y, m] = monthStr.split('-').map(Number);
  
  // Property Level Break Even Status
  const isBreakEvenMet = netCashPosition >= 0;
  
  // Unit Stats (Contribution View)
  const unitStats = units.map(unit => {
      const unitBookings = bookings.filter(b => b.unit === unit.name);
      const bookingsInMonth = unitBookings.filter(b => {
          const d = new Date(b.check_in);
          return d.getFullYear() === y && (d.getMonth() + 1) === m;
      });
      // Revenue Contribution (Base Room Only for stability)
      const projectedRev = bookingsInMonth.reduce((acc, b) => acc + b.amount, 0); 
      const realizedRev = bookingsInMonth.reduce((acc, b) => acc + b.paid, 0);
      const occ = calculateOccupancy(unit.name, monthStr, bookings);

      return { unit, projectedRev, realizedRev, occ };
  });

  return (
    <div className="w-full">
        <div className="mb-4 bg-slate-900/50 p-4 rounded border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <span className="block text-slate-400 text-xs font-bold uppercase">Property Break-Even Target</span>
                <span className="text-rose-400 font-bold font-mono text-xl">₱{totalMonthlyExpenses.toLocaleString()}</span>
            </div>
            <div className="text-center md:text-right">
                <span className="block text-slate-400 text-xs font-bold uppercase mb-1">Status</span>
                <Badge color={isBreakEvenMet ? 'green' : 'red'}>
                    {isBreakEvenMet ? 'Break-even Met (Cash)' : 'Below Break-even (Cash)'}
                </Badge>
            </div>
        </div>

        <div className="hidden md:grid grid-cols-5 gap-4 p-3 bg-slate-900/50 text-xs font-bold text-slate-400 border-b border-slate-700">
            <div>Unit</div>
            <div className="text-right">Projected Contrib.</div>
            <div className="text-right">Realized Contrib.</div>
            <div className="text-right">Occupancy</div>
            <div className="text-center">Status</div>
        </div>

        <div className="flex flex-col gap-4 md:gap-0">
            {unitStats.map(stat => {
                return (
                    <div key={stat.unit.id} className="flex flex-col bg-slate-800/30 rounded border border-slate-700 md:bg-transparent md:border-0 md:border-b md:border-slate-800 md:grid md:grid-cols-5 md:gap-4 p-4 md:p-3 hover:bg-slate-800/50 transition-colors">
                        
                        <div className="flex justify-between items-center mb-3 md:mb-0 pb-2 md:pb-0 border-b border-slate-700 md:border-0 md:block">
                            <span className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-wider">Unit</span>
                            <span className="font-bold text-white md:font-medium md:text-slate-200">{stat.unit.name}</span>
                        </div>
                        
                        <div className="flex justify-between md:block text-right mb-1 md:mb-0">
                            <span className="md:hidden text-slate-500 text-xs">Projected</span>
                            <span className="text-slate-200 text-sm">₱{stat.projectedRev.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between md:block text-right mb-1 md:mb-0">
                            <span className="md:hidden text-slate-500 text-xs">Realized</span>
                            <span className="text-emerald-400 text-sm">₱{stat.realizedRev.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between md:block text-right mb-1 md:mb-0">
                            <span className="md:hidden text-slate-500 text-xs">Occupancy</span>
                            <span className={`text-sm ${stat.occ >= occupancyGoal ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {isNaN(stat.occ) ? '-' : Math.round(stat.occ)}%
                            </span>
                        </div>

                        <div className="flex justify-between md:block text-center mb-1 md:mb-0 items-center">
                            <span className="md:hidden text-slate-500 text-xs">Status</span>
                             <span className={`text-xs ${stat.occ >= occupancyGoal ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {stat.occ >= occupancyGoal ? 'Occupancy Goal Met' : 'Low Occupancy'}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
};
