const VERSION = '1.08';
const KEY = 'layeredCostingData_v1';

const defaultData = {
  settings: {
    companyName: 'Layered Costing',
    currencySymbol: 'R',
    vatRate: 15,
    electricityRate: 3.50,
    gpPercent: 35,
    failurePercent: 10,
    labourRate: 150,
    isVatVendor: true,
    defaultPrinterId: null
  },
  materials: [
    { id: crypto.randomUUID(), name: 'PLA Basic', brand: 'Generic', supplier: 'Default', costPerKg: 350 },
    { id: crypto.randomUUID(), name: 'PETG', brand: 'Generic', supplier: 'Default', costPerKg: 420 },
    { id: crypto.randomUUID(), name: 'ABS', brand: 'Generic', supplier: 'Default', costPerKg: 500 },
    { id: crypto.randomUUID(), name: 'TPU', brand: 'Generic', supplier: 'Default', costPerKg: 650 }
  ],
  printers: [
    { id: crypto.randomUUID(), name: 'Bambu Lab A1 Mini', powerW: 90, purchasePrice: 10000, lifetimeHours: 5000, maintenancePerHour: 2 },
    { id: crypto.randomUUID(), name: 'Bambu Lab A1', powerW: 100, purchasePrice: 13000, lifetimeHours: 5000, maintenancePerHour: 2 },
    { id: crypto.randomUUID(), name: 'Bambu Lab P1P', powerW: 150, purchasePrice: 18000, lifetimeHours: 5000, maintenancePerHour: 2.5 },
    { id: crypto.randomUUID(), name: 'Bambu Lab P1S', powerW: 200, purchasePrice: 22000, lifetimeHours: 5000, maintenancePerHour: 3 },
    { id: crypto.randomUUID(), name: 'Bambu Lab X1 Carbon', powerW: 250, purchasePrice: 33000, lifetimeHours: 5000, maintenancePerHour: 3.5 },
    { id: crypto.randomUUID(), name: 'Creality Ender-3 V3 SE', powerW: 150, purchasePrice: 5000, lifetimeHours: 4000, maintenancePerHour: 2 },
    { id: crypto.randomUUID(), name: 'Creality Ender-3 V3 KE', powerW: 170, purchasePrice: 7000, lifetimeHours: 4000, maintenancePerHour: 2.2 },
    { id: crypto.randomUUID(), name: 'Creality Ender-3 S1', powerW: 160, purchasePrice: 8500, lifetimeHours: 4000, maintenancePerHour: 2.5 },
    { id: crypto.randomUUID(), name: 'Creality K1', powerW: 250, purchasePrice: 12000, lifetimeHours: 5000, maintenancePerHour: 3 },
    { id: crypto.randomUUID(), name: 'Creality K1 Max', powerW: 300, purchasePrice: 18000, lifetimeHours: 5000, maintenancePerHour: 3.5 },
    { id: crypto.randomUUID(), name: 'Creality CR-10 SE', powerW: 220, purchasePrice: 11000, lifetimeHours: 4500, maintenancePerHour: 3 },
    { id: crypto.randomUUID(), name: 'Custom Printer', powerW: 150, purchasePrice: 15000, lifetimeHours: 5000, maintenancePerHour: 2 }
  ],
  history: [],
  maintenanceItems: {}
};


const suggestedMaintenanceItems = [
  { name: 'Hotend Assembly', cost: 750, lifeHours: 1500 },
  { name: 'Nozzle', cost: 250, lifeHours: 1000 },
  { name: 'Textured Build Plate', cost: 1200, lifeHours: 3000 },
  { name: 'PTFE Tubes', cost: 150, lifeHours: 1000 },
  { name: 'Extruder Gears', cost: 600, lifeHours: 3000 },
  { name: 'Lubricants / Cleaning Consumables', cost: 200, lifeHours: 1000 }
];

function cloneSuggestedMaintenanceItems() {
  return suggestedMaintenanceItems.map(item => ({ id: crypto.randomUUID(), ...item }));
}

function ensureSuggestedMaintenanceItemsForPrinters(targetData) {
  targetData.maintenanceItems = targetData.maintenanceItems || {};
  (targetData.printers || []).forEach(printer => {
    if (!Array.isArray(targetData.maintenanceItems[printer.id]) || targetData.maintenanceItems[printer.id].length === 0) {
      targetData.maintenanceItems[printer.id] = cloneSuggestedMaintenanceItems();
    }
  });
}

let data = loadData();
let lastCalc = null;

function loadData() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return upgradeData(JSON.parse(saved));
  } catch (e) { console.warn(e); }
  const fresh = structuredClone(defaultData);
  ensureSuggestedMaintenanceItemsForPrinters(fresh);
  return fresh;
}

function upgradeData(saved) {
  saved.settings = { ...structuredClone(defaultData.settings), ...(saved.settings || {}) };
  saved.materials = (saved.materials || []).map(m => ({ brand: '', ...m }));
  saved.printers = saved.printers || [];
  saved.history = saved.history || [];
  saved.maintenanceItems = saved.maintenanceItems || {};
  const existingNames = new Set(saved.printers.map(p => String(p.name || '').toLowerCase()));
  defaultData.printers.forEach(preset => {
    if (!existingNames.has(preset.name.toLowerCase())) saved.printers.push(structuredClone(preset));
  });
  if (!saved.settings.defaultPrinterId || !saved.printers.some(p => p.id === saved.settings.defaultPrinterId)) {
    saved.settings.defaultPrinterId = saved.printers[0]?.id || null;
  }
  ensureSuggestedMaintenanceItemsForPrinters(saved);
  return saved;
}
function saveData() { localStorage.setItem(KEY, JSON.stringify(data)); }
const $ = id => document.getElementById(id);
const num = id => Number($(id).value || 0);
const money = value => `${data.settings.currencySymbol}${Number(value || 0).toFixed(2)}`;

function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  }));
}

function fillSettings() {
  for (const [k, v] of Object.entries(data.settings)) if ($(k)) $(k).value = k === 'isVatVendor' ? (v ? 'yes' : 'no') : v;
}

function renderSelects() {
  $('printerSelect').innerHTML = data.printers.map(p => `<option value="${p.id}">${escapeHtml(p.name)}${p.id === data.settings.defaultPrinterId ? ' (Default)' : ''}</option>`).join('');
  if (data.settings.defaultPrinterId && data.printers.some(p => p.id === data.settings.defaultPrinterId)) $('printerSelect').value = data.settings.defaultPrinterId;
  $('materialSelect').innerHTML = data.materials.map(m => {
    const brand = m.brand ? `${m.brand} ` : '';
    return `<option value="${m.id}">${escapeHtml(brand + m.name)} - ${money(m.costPerKg)}/kg</option>`;
  }).join('');
  if ($('maintenancePrinterSelect')) {
    $('maintenancePrinterSelect').innerHTML = data.printers.map(p => `<option value="${p.id}">${escapeHtml(p.name)}${p.id === data.settings.defaultPrinterId ? ' (Default)' : ''}</option>`).join('');
    if (data.settings.defaultPrinterId && data.printers.some(p => p.id === data.settings.defaultPrinterId)) $('maintenancePrinterSelect').value = data.settings.defaultPrinterId;
  }
}

function renderMaterials() {
  $('materialsList').innerHTML = data.materials.map(m => `
    <div class="item">
      <h3>${escapeHtml(m.brand ? `${m.brand} ${m.name}` : m.name)}</h3>
      <div>Brand: ${escapeHtml(m.brand || 'N/A')}</div>
      <div>Supplier: ${escapeHtml(m.supplier || 'N/A')}</div>
      <div>Cost: <strong>${money(m.costPerKg)}/kg</strong></div>
      <div class="mini-actions"><button onclick="deleteMaterial('${m.id}')" class="danger">Delete</button></div>
    </div>`).join('') || '<p>No materials yet.</p>';
}

function renderPrinters() {
  $('printersList').innerHTML = data.printers.map(p => {
    const depreciation = p.purchasePrice / Math.max(1, p.lifetimeHours);
    return `<div class="item">
      <h3>${escapeHtml(p.name)} ${p.id === data.settings.defaultPrinterId ? '<span class="badge">Default</span>' : ''}</h3>
      <div>Average Power: <strong>${p.powerW}W</strong></div>
      <div>Depreciation: <strong>${money(depreciation)}/hr</strong></div>
      <div>Maintenance: <strong>${money(p.maintenancePerHour)}/hr</strong></div>
      <div class="mini-actions"><button onclick="setDefaultPrinter('${p.id}')">Make Default</button><button onclick="loadPrinterForEdit('${p.id}')">Edit</button><button onclick="deletePrinter('${p.id}')" class="danger">Delete</button></div>
    </div>`;
  }).join('') || '<p>No printers yet.</p>';
}


function getSelectedMaintenancePrinter() {
  return data.printers.find(p => p.id === $('maintenancePrinterSelect')?.value) || data.printers[0];
}

function selectedMaintenanceItems() {
  const printer = getSelectedMaintenancePrinter();
  if (!printer) return [];
  data.maintenanceItems[printer.id] = data.maintenanceItems[printer.id] || [];
  return data.maintenanceItems[printer.id];
}

function calculateMaintenanceRate(items) {
  return (items || []).reduce((sum, item) => {
    const life = Math.max(1, Number(item.lifeHours || 1));
    return sum + (Number(item.cost || 0) / life);
  }, 0);
}

function renderMaintenance() {
  if (!$('maintenanceSummary') || !$('maintenanceItemsList')) return;
  const printer = getSelectedMaintenancePrinter();
  if (!printer) {
    $('maintenanceSummary').innerHTML = '<p>No printer selected.</p>';
    $('maintenanceItemsList').innerHTML = '';
    return;
  }
  const items = selectedMaintenanceItems();
  const rate = calculateMaintenanceRate(items);
  $('maintenanceSummary').innerHTML = [
    ['Selected Printer', escapeHtml(printer.name), 'plain'],
    ['Current Saved Printer Maintenance', money(printer.maintenancePerHour) + '/hr', 'plain'],
    ['Calculated Maintenance Rate', money(rate) + '/hr', 'plain']
  ].map(([label, value]) => `<div class="line"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('maintenanceItemsList').innerHTML = items.map(item => {
    const hourly = Number(item.cost || 0) / Math.max(1, Number(item.lifeHours || 1));
    return `<div class="item maintenance-edit">
      <h3>${escapeHtml(item.name)}</h3>
      <label>Item Name<input value="${escapeHtml(item.name)}" onchange="updateMaintenanceItem('${printer.id}','${item.id}','name',this.value)" /></label>
      <div class="grid two compact">
        <label>Replacement Cost<input type="number" min="0" step="0.01" value="${Number(item.cost || 0)}" onchange="updateMaintenanceItem('${printer.id}','${item.id}','cost',this.value)" /></label>
        <label>Expected Life Hours<input type="number" min="1" step="1" value="${Number(item.lifeHours || 1)}" onchange="updateMaintenanceItem('${printer.id}','${item.id}','lifeHours',this.value)" /></label>
      </div>
      <div>Hourly Cost: <strong>${money(hourly)}/hr</strong></div>
      <div class="mini-actions"><button onclick="deleteMaintenanceItem('${printer.id}','${item.id}')" class="danger">Delete</button></div>
    </div>`;
  }).join('') || '<p>No maintenance items saved for this printer yet.</p>';
}

function addMaintenanceItem(e) {
  e.preventDefault();
  const printer = getSelectedMaintenancePrinter();
  if (!printer) return alert('Select a printer first.');
  const name = $('maintPartName').value.trim();
  if (!name) return alert('Enter a part or consumable name.');
  const item = { id: crypto.randomUUID(), name, cost: num('maintPartCost'), lifeHours: Math.max(1, num('maintPartLife')) };
  data.maintenanceItems[printer.id] = data.maintenanceItems[printer.id] || [];
  data.maintenanceItems[printer.id].push(item);
  saveData();
  $('maintenanceForm').reset();
  $('maintenancePrinterSelect').value = printer.id;
  refreshAll();
}


window.updateMaintenanceItem = (printerId, itemId, field, value) => {
  const item = (data.maintenanceItems[printerId] || []).find(x => x.id === itemId);
  if (!item) return;
  if (field === 'name') item.name = value;
  if (field === 'cost') item.cost = Math.max(0, Number(value || 0));
  if (field === 'lifeHours') item.lifeHours = Math.max(1, Number(value || 1));
  saveData();
  renderMaintenance();
};

window.deleteMaintenanceItem = (printerId, itemId) => {
  if (!confirm('Delete this maintenance item?')) return;
  data.maintenanceItems[printerId] = (data.maintenanceItems[printerId] || []).filter(item => item.id !== itemId);
  saveData();
  refreshAll();
};

function saveMaintenanceToPrinter() {
  const printer = getSelectedMaintenancePrinter();
  if (!printer) return alert('Select a printer first.');
  const rate = calculateMaintenanceRate(selectedMaintenanceItems());
  printer.maintenancePerHour = Number(rate.toFixed(2));
  saveData();
  refreshAll();
  alert(`Saved ${money(printer.maintenancePerHour)}/hr maintenance to ${printer.name}.`);
}


function resetSuggestedMaintenanceItems() {
  const printer = getSelectedMaintenancePrinter();
  if (!printer) return alert('Select a printer first.');
  if (!confirm('Replace this printer\'s maintenance items with the recommended default list?')) return;
  data.maintenanceItems[printer.id] = cloneSuggestedMaintenanceItems();
  saveData();
  refreshAll();
}

function calculate() {
  const settings = data.settings;
  const printer = data.printers.find(p => p.id === $('printerSelect').value) || data.printers[0];
  const material = data.materials.find(m => m.id === $('materialSelect').value) || data.materials[0];
  const quantity = Math.max(1, Math.round(num('quantityPrinted') || 1));
  const totalGrams = num('modelGrams') + num('supportGrams') + num('purgeGrams');
  const printTimeHours = num('printHours') + (num('printMinutes') / 60);
  const labourHours = num('labourMinutes') / 60;

  const materialCost = (totalGrams / 1000) * material.costPerKg;
  const electricityCost = (printer.powerW / 1000) * printTimeHours * settings.electricityRate;
  const depreciationCost = (printer.purchasePrice / Math.max(1, printer.lifetimeHours)) * printTimeHours;
  const maintenanceCost = printer.maintenancePerHour * printTimeHours;
  const labourCost = labourHours * settings.labourRate;
  const packagingCost = num('packagingCost');
  const baseCost = materialCost + electricityCost + depreciationCost + maintenanceCost + labourCost + packagingCost;
  const failureAllowance = baseCost * (settings.failurePercent / 100);
  const productionCost = baseCost + failureAllowance;
  const gp = Math.min(95, Math.max(0, settings.gpPercent)) / 100;
  const sellingExVat = gp >= 0.95 ? productionCost : productionCost / (1 - gp);
  const grossProfit = sellingExVat - productionCost;
  const vat = settings.isVatVendor ? sellingExVat * (settings.vatRate / 100) : 0;
  const sellingInclVat = sellingExVat + vat;
  const unitProductionCost = productionCost / quantity;
  const unitSellingExVat = sellingExVat / quantity;
  const unitVat = vat / quantity;
  const unitSellingInclVat = sellingInclVat / quantity;

  lastCalc = { printer, material, quantity, totalGrams, printTimeHours, materialCost, electricityCost, depreciationCost, maintenanceCost, labourCost, packagingCost, failureAllowance, productionCost, sellingExVat, grossProfit, vat, sellingInclVat, unitProductionCost, unitSellingExVat, unitVat, unitSellingInclVat, isVatVendor: settings.isVatVendor };
  renderBreakdown(lastCalc);
}

function renderBreakdown(c) {
  const lines = [
    ['Quantity Printed', c.quantity, 'plain'], ['Total Material', c.materialCost], ['Electricity', c.electricityCost], ['Depreciation', c.depreciationCost],
    ['Maintenance', c.maintenanceCost], ['Labour', c.labourCost], ['Packaging', c.packagingCost],
    [`Failure Allowance (${data.settings.failurePercent}%)`, c.failureAllowance], ['Production Cost', c.productionCost],
    [`Selling Price Ex VAT (${data.settings.gpPercent}% GP)`, c.sellingExVat], ['Gross Profit', c.grossProfit],
    [c.isVatVendor ? `VAT (${data.settings.vatRate}%)` : 'VAT (Not VAT Vendor)', c.vat]
  ];
  $('breakdown').innerHTML = lines.map(([label, value, type]) => `<div class="line"><span>${label}</span><strong>${type === 'plain' ? escapeHtml(value) : money(value)}</strong></div>`).join('');
  $('sellingInclVat').textContent = money(c.sellingInclVat);
  if ($('unitCost')) $('unitCost').textContent = money(c.unitProductionCost);
  if ($('unitPriceInclVat')) $('unitPriceInclVat').textContent = money(c.unitSellingInclVat);
}

function saveQuote() {
  calculate();
  const quote = {
    id: crypto.randomUUID(), date: new Date().toISOString(), customerName: $('customerName').value.trim(), jobName: $('jobName').value.trim() || 'Untitled Print', notes: $('quoteNotes').value.trim(),
    settings: structuredClone(data.settings), result: structuredClone(lastCalc)
  };
  data.history.unshift(quote); saveData(); renderHistory(); alert('Quote saved.');
}

function renderHistory() {
  $('historyList').innerHTML = data.history.map(q => `<div class="item">
    <h3>${escapeHtml(q.jobName)}</h3>
    <div>${new Date(q.date).toLocaleString()}</div>
    <div>Customer: ${escapeHtml(q.customerName || 'N/A')}</div>
    <div>Qty: <strong>${q.result.quantity || 1}</strong> • Unit Price: <strong>${money(q.result.unitSellingInclVat || q.result.sellingInclVat)}</strong></div>
    <div>Total Cost: <strong>${money(q.result.productionCost)}</strong> • Total Sell ${q.result.isVatVendor === false ? 'Price' : 'Incl. VAT'}: <strong>${money(q.result.sellingInclVat)}</strong></div>
    <div class="mini-actions"><button onclick="deleteQuote('${q.id}')" class="danger">Delete</button></div>
  </div>`).join('') || '<p>No saved quotes yet.</p>';
}

function clearQuote() {
  if (data.settings.defaultPrinterId && $('printerSelect')) $('printerSelect').value = data.settings.defaultPrinterId;
  ['customerName','jobName','quantityPrinted','modelGrams','supportGrams','purgeGrams','printHours','printMinutes','labourMinutes','packagingCost','quoteNotes'].forEach(id => $(id).value = id === 'quantityPrinted' ? 1 : (['modelGrams','supportGrams','purgeGrams','printHours','printMinutes','labourMinutes','packagingCost'].includes(id) ? 0 : ''));
  calculate();
}

function printQuote() { calculate(); window.print(); }

function addMaterial(e) {
  e.preventDefault();
  const name = $('materialName').value.trim(); if (!name) return alert('Enter a material name.');
  data.materials.push({ id: crypto.randomUUID(), name, brand: $('materialBrand').value.trim(), supplier: $('materialSupplier').value.trim(), costPerKg: num('materialCost') });
  saveData(); e.target.reset(); refreshAll();
}
window.deleteMaterial = id => { if(confirm('Delete this material?')) { data.materials = data.materials.filter(m => m.id !== id); saveData(); refreshAll(); } };

function savePrinter(e) {
  e.preventDefault();
  const name = $('printerName').value.trim(); if (!name) return alert('Enter a printer name.');
  const existing = data.printers.find(p => p.name.toLowerCase() === name.toLowerCase());
  const printer = { id: existing?.id || crypto.randomUUID(), name, powerW: num('printerPower'), purchasePrice: num('printerPrice'), lifetimeHours: Math.max(1, num('printerLife')), maintenancePerHour: num('printerMaint') };
  if (existing) Object.assign(existing, printer); else data.printers.push(printer);
  saveData(); e.target.reset(); refreshAll();
}
window.loadPrinterForEdit = id => {
  const p = data.printers.find(x => x.id === id); if (!p) return;
  $('printerName').value = p.name; $('printerPower').value = p.powerW; $('printerPrice').value = p.purchasePrice; $('printerLife').value = p.lifetimeHours; $('printerMaint').value = p.maintenancePerHour;
};
window.setDefaultPrinter = id => {
  if (!data.printers.some(p => p.id === id)) return;
  data.settings.defaultPrinterId = id;
  saveData(); refreshAll();
};
window.deletePrinter = id => { if(confirm('Delete this printer?')) { data.printers = data.printers.filter(p => p.id !== id); delete data.maintenanceItems[id]; if (data.settings.defaultPrinterId === id) data.settings.defaultPrinterId = data.printers[0]?.id || null; saveData(); refreshAll(); } };
window.deleteQuote = id => { if(confirm('Delete this quote?')) { data.history = data.history.filter(q => q.id !== id); saveData(); renderHistory(); } };

function saveSettings(e) {
  e.preventDefault();
  data.settings = {
    companyName: $('companyName').value.trim() || 'Layered Costing', currencySymbol: $('currencySymbol').value.trim() || 'R', vatRate: num('vatRate'), electricityRate: num('electricityRate'), gpPercent: num('gpPercent'), failurePercent: num('failurePercent'), labourRate: num('labourRate'), isVatVendor: $('isVatVendor').value === 'yes', defaultPrinterId: data.settings.defaultPrinterId || data.printers[0]?.id || null
  };
  saveData(); refreshAll(); alert('Settings saved.');
}


function exportFullBackup() {
  const backup = {
    app: 'Layered Costing',
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data: structuredClone(data)
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `layered-costing-full-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  if ($('backupStatus')) $('backupStatus').textContent = 'Full backup exported successfully.';
}

function restoreFullBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const restored = parsed.data || parsed;
      if (!restored || typeof restored !== 'object' || !restored.settings || !Array.isArray(restored.printers) || !Array.isArray(restored.materials)) {
        throw new Error('This does not look like a valid Layered Costing backup.');
      }
      if (!confirm('Restore this backup? This will replace the current data saved on this device.')) return;
      data = upgradeData(restored);
      saveData();
      refreshAll();
      if ($('backupStatus')) $('backupStatus').textContent = `Backup restored: ${file.name}`;
      alert('Backup restored successfully.');
    } catch (err) {
      alert('Could not restore backup: ' + err.message);
      if ($('backupStatus')) $('backupStatus').textContent = 'Restore failed. Please check the backup file.';
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(data.history, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `layered-costing-history-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function clearHistory() { if(confirm('Clear all quote history?')) { data.history = []; saveData(); renderHistory(); } }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function refreshAll() { fillSettings(); renderSelects(); renderMaterials(); renderPrinters(); renderMaintenance(); renderHistory(); calculate(); }

function bindEvents() {
  setupTabs();
  document.querySelectorAll('#quoteForm input,#quoteForm select,#quoteForm textarea').forEach(el => el.addEventListener('input', calculate));
  $('settingsForm').addEventListener('submit', saveSettings);
  $('materialForm').addEventListener('submit', addMaterial);
  $('printerForm').addEventListener('submit', savePrinter);
  $('maintenanceForm').addEventListener('submit', addMaintenanceItem);
  $('maintenancePrinterSelect').addEventListener('change', renderMaintenance);
  $('saveMaintToPrinterBtn').addEventListener('click', saveMaintenanceToPrinter);
  if ($('resetSuggestedMaintBtn')) $('resetSuggestedMaintBtn').addEventListener('click', resetSuggestedMaintenanceItems);
  $('saveQuoteBtn').addEventListener('click', saveQuote);
  $('clearQuoteBtn').addEventListener('click', clearQuote);
  $('printQuoteBtn').addEventListener('click', printQuote);
  $('exportHistoryBtn').addEventListener('click', exportHistory);
  $('clearHistoryBtn').addEventListener('click', clearHistory);
  if ($('exportBackupBtn')) $('exportBackupBtn').addEventListener('click', exportFullBackup);
  if ($('restoreBackupInput')) $('restoreBackupInput').addEventListener('change', restoreFullBackup);
}

bindEvents();
refreshAll();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
