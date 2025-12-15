
import { BookingRecord, AddOn, Platform, AddOnState, UnitDefinition, UnitType, RevenueType, AddOnCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- CONSTANTS ---

export const INITIAL_REAL_DATA = `booking_id,guest_name,platform,unit,check_in,check_out,total_amount,paid_amount,guests
26304,Mattias Lindberg,Booking.com,G3,2025-12-15,2025-12-18,26077.5,0,2
26236,Jiří Kubricht,Airbnb,G3,2025-12-18,2025-12-22,26001.92,0,3
26363,Kenny Puyong,Front desk,G1,2025-12-20,2025-12-21,9500,4500,8
26363,Kenny Puyong,Front desk,G2,2025-12-20,2025-12-21,9500,4500,8
26322,Luca Angelucci,Booking.com,G1,2025-12-21,2025-12-25,58560,0,4
26322,Luca Angelucci,Booking.com,G2,2025-12-21,2025-12-25,58560,0,4
26332,Alexa Kieker,Website,G3,2025-12-22,2025-12-29,52500,26250,5
26325,Anaïs Sounack,Airbnb,G2,2025-12-26,2025-12-30,23999.36,0,3
26327,Andreas Jaegerman,Website,G1,2025-12-27,2025-12-29,12000,6000,3`;

// --- Date Helpers ---

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const getDatesInRange = (startDate: Date, endDate: Date) => {
    const dates = [];
    const theDate = new Date(startDate);
    while (theDate < endDate) {
        dates.push(new Date(theDate));
        theDate.setDate(theDate.getDate() + 1);
    }
    return dates;
};

// ============================================================================
// FINANCIAL DEFINITIONS (STRICT)
// ============================================================================
// 1. Cash Received = Paid Accommodation + Paid Profit-Addons (Excl. Transportation)
// 2. Expected Revenue = Booked Accommodation + Pre-sold Profit-Addons (Excl. Transportation)
// 3. Variable Costs = Island Hopping Actuals * (Labor 600 + Fuel 2000)
// 4. Net Cash Position = Cash Received - (Fixed Expenses + Variable Costs)
// ============================================================================

export const ISLAND_HOPPING_COSTS = {
    LABOR: 600,
    FUEL: 2000
};

export const isProfitGenerating = (category: string) => {
    // Transportation is Pass-Through, Excluded from Profit/Revenue
    return category !== AddOnCategory.Transportation;
};

export const calculateFinancials = (bookings: BookingRecord[], monthStr: string, fixedExpenses: number) => {
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(mStr); 

  let baseRevenue = 0; // Booked Room Amount
  let paidBase = 0;    // Paid Room Amount
  
  let addonExpected = 0; // Forecasted + PreSold (Profit Only)
  let addonCash = 0;     // Actual (Profit Only)
  
  let variableCosts = 0; // Derived from Island Hopping Actuals

  let totalPotentialRevenue = 0; // Base + All Profit Addons

  bookings.forEach(b => {
    const bDate = new Date(b.check_in);
    if (bDate.getFullYear() === year && (bDate.getMonth() + 1) === month) {
      // Base Metrics
      baseRevenue += b.amount;
      paidBase += b.paid;

      // Add-on Metrics
      b.add_ons.forEach(addon => {
          if (isProfitGenerating(addon.category)) {
              totalPotentialRevenue += addon.amount;
              
              if (addon.status === AddOnState.Forecasted || addon.status === AddOnState.PreSold) {
                  addonExpected += addon.amount;
              }
              if (addon.status === AddOnState.Actual) {
                  addonCash += addon.amount;
                  
                  // COGS Logic
                  if (addon.category === AddOnCategory.IslandHopping) {
                      variableCosts += (ISLAND_HOPPING_COSTS.LABOR + ISLAND_HOPPING_COSTS.FUEL);
                  }
              }
          }
      });
    }
  });

  const cashReceived = paidBase + addonCash;
  const expectedRevenue = baseRevenue + addonExpected; // Note: This definition might overlap with "Projected". 
  // Refined: Expected = Base (Booked) + PreSold Addons (Committed). Forecasted is separate.
  // Prompt says: Expected Revenue = Booked accommodation + pre-sold add-ons.
  // Let's recalculate addonExpected to ONLY be PreSold for "Expected Revenue" metric if strictly following prompt.
  // However, "Potential" usually implies everything. Let's do distinct sums.
  
  // Reset for strict calculation
  let strictPreSold = 0;
  let strictForecasted = 0;

  bookings.forEach(b => {
      const bDate = new Date(b.check_in);
      if (bDate.getFullYear() === year && (bDate.getMonth() + 1) === month) {
          b.add_ons.forEach(addon => {
              if (isProfitGenerating(addon.category)) {
                  if (addon.status === AddOnState.PreSold) strictPreSold += addon.amount;
                  if (addon.status === AddOnState.Forecasted) strictForecasted += addon.amount;
              }
          });
      }
  });

  const expectedRevStrict = baseRevenue + strictPreSold;
  const potentialRevStrict = baseRevenue + strictPreSold + strictForecasted + addonCash; // All potential
  
  const totalExpenses = fixedExpenses + variableCosts;
  const netCashPosition = cashReceived - totalExpenses;

  return {
    baseRevenue,
    cashReceived,
    expectedRevenue: expectedRevStrict,
    potentialRevenue: potentialRevStrict,
    variableCosts,
    totalExpenses,
    netCashPosition,
    // Legacy mapping for old cards if needed, but we will update UI
    realizedRevenue: cashReceived
  };
};

// --- EXISTING HELPERS ---

export const calculateOccupancy = (
  unitName: string, 
  monthStr: string, 
  bookings: BookingRecord[]
): number => {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); 

  const unitBookings = bookings.filter(b => b.unit === unitName);
  let occupiedDays = new Set<string>();

  unitBookings.forEach(b => {
    const start = new Date(b.check_in);
    const end = new Date(b.check_out);

    // Clamp to current month
    const effectiveStart = start < monthStart ? monthStart : start;
    const effectiveEnd = end > monthEnd ? monthEnd : end;

    if (effectiveStart < effectiveEnd) {
      const dates = getDatesInRange(effectiveStart, effectiveEnd);
      dates.forEach(d => occupiedDays.add(d.toISOString().split('T')[0]));
    }
  });

  return (occupiedDays.size / daysInMonth) * 100;
};

// --- Import/Export ---

export const extractUnitsFromBookings = (bookings: BookingRecord[]): UnitDefinition[] => {
    const unitNames = Array.from(new Set(bookings.map(b => b.unit))).sort();
    return unitNames.map(name => ({
        id: uuidv4(),
        name,
        type: UnitType.EntireUnit, 
        maxGuests: 4, 
        baseNightlyRate: 5000,
        includeInOccupancy: true
    }));
};

export const parseCSV = (csvText: string): { bookings: BookingRecord[], errors: string[] } => {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  const errors: string[] = [];
  const tempRows: any[] = [];
  
  console.log("Parsing CSV with " + lines.length + " lines.");

  let headerMap: Record<string, number> | null = null;
  let dataStartIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim().toLowerCase().replace(/^"|"$/g, ''));
      const hasKeyFields = ['booking_id', 'guest_name', 'unit'].every(h => parts.includes(h));
      
      if (hasKeyFields) {
          headerMap = {};
          parts.forEach((h, idx) => {
              if (headerMap) headerMap[h] = idx;
          });
          dataStartIndex = i + 1;
          break;
      }
  }

  if (!headerMap) {
      return { bookings: [], errors: ["CSV missing required headers: booking_id, guest_name, unit"] };
  }

  for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      const getValue = (key: string) => {
          const idx = headerMap![key];
          if (idx !== undefined && idx < parts.length) {
              return parts[idx].trim().replace(/^"|"$/g, '');
          }
          return '';
      };

      const booking_ref = getValue('booking_id');
      const guest_name = getValue('guest_name');
      const unit = getValue('unit');
      const check_in = getValue('check_in');
      const check_out = getValue('check_out');
      const amountStr = getValue('total_amount');
      const paidStr = getValue('paid_amount');
      const guestsStr = getValue('guests');
      const platformStr = getValue('platform');

      if (!unit || !check_in || !check_out) { 
        continue; 
      }
      
      const amount = parseFloat(amountStr) || 0;
      const paid = parseFloat(paidStr) || 0;
      const guests = parseInt(guestsStr) || 1;

      let platform = Platform.Direct;
      const pLower = platformStr.toLowerCase();
      if (pLower.includes('airbnb')) platform = Platform.Airbnb;
      else if (pLower.includes('booking')) platform = Platform.BookingCom;
      else if (pLower.includes('front')) platform = Platform.Direct;
      else if (pLower.includes('web')) platform = Platform.Website;
      else if (pLower.includes('agoda')) platform = Platform.Agoda;
      else if (pLower.includes('ical')) platform = Platform.iCal;

      tempRows.push({
          booking_reference: booking_ref || `GEN-${uuidv4().slice(0,6)}`,
          guest_name: guest_name || 'Unknown',
          unit,
          platform,
          check_in,
          check_out,
          amount,
          paid,
          guests
      });
  }

  const groups = new Map<string, any[]>();
  tempRows.forEach(row => {
      const key = row.booking_reference;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
  });

  const finalBookings: BookingRecord[] = [];

  groups.forEach((rows) => {
      const count = rows.length;
      let amountPerUnit = rows[0].amount;
      let paidPerUnit = rows[0].paid;

      if (count > 1) {
          const firstAmt = rows[0].amount;
          const allSameAmt = rows.every((r: any) => Math.abs(r.amount - firstAmt) < 0.01);
          const firstPaid = rows[0].paid;
          const allSamePaid = rows.every((r: any) => Math.abs(r.paid - firstPaid) < 0.01);

          if (allSameAmt && firstAmt > 0) amountPerUnit = Number((firstAmt / count).toFixed(2));
          if (allSamePaid && firstPaid > 0) paidPerUnit = Number((firstPaid / count).toFixed(2));
      }

      rows.forEach((r: any) => {
          finalBookings.push({
              internal_id: uuidv4(),
              booking_reference: r.booking_reference,
              guest_name: r.guest_name,
              unit: r.unit,
              platform: r.platform,
              guests: r.guests,
              check_in: r.check_in,
              check_out: r.check_out,
              amount: amountPerUnit,
              paid: paidPerUnit,
              add_ons: []
          });
      });
  });

  return { bookings: finalBookings, errors };
};

export const downloadTemplate = () => {
  const headers = "booking_id,guest_name,platform,unit,check_in,check_out,total_amount,paid_amount,guests";
  const blob = new Blob([headers], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'palawan_collective_export.csv';
  a.click();
  window.URL.revokeObjectURL(url);
};
