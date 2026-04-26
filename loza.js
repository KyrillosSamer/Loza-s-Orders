// ===== DATA =====
let data = JSON.parse(localStorage.getItem('loza_data') || 'null');

// Migrate old format
if (!data) {
  const old = localStorage.getItem('orders');
  if (old) {
    const oldOrders = JSON.parse(old);
    data = {
      shipments: [{ id: 1, name: 'شحنة 1', orders: oldOrders }],
      activeShipment: 1,
      nextId: 2
    };
  } else {
    data = {
      shipments: [{ id: 1, name: 'شحنة 1', orders: [] }],
      activeShipment: 1,
      nextId: 2
    };
  }
  saveData();
}

// ===== STATE =====
let deliveryType = 'bary';
let activeFilter = 'all';

function saveData() {
  localStorage.setItem('loza_data', JSON.stringify(data));
}

function getActive() {
  return data.shipments.find(s => s.id === data.activeShipment);
}

// ===== SHIPMENT TABS =====
function renderTabs() {
  const bar = document.getElementById('shipmentBar');
  bar.innerHTML = '';

  data.shipments.forEach(s => {
    const tab = document.createElement('button');
    tab.className = 'shipment-tab' + (s.id === data.activeShipment ? ' active' : '');

    const count = s.orders.length;
    tab.innerHTML = `
      📦 ${s.name}
      <span class='tab-count'>${count}</span>
      ${data.shipments.length > 1 ? `<button class='del-tab' onclick='deleteShipment(event, ${s.id})' title='حذف الشحنة'>✕</button>` : ''}
    `;
    tab.onclick = () => switchShipment(s.id);
    bar.appendChild(tab);
  });

  // Add new shipment button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-new-shipment';
  addBtn.innerHTML = '➕ شحنة+';
  addBtn.onclick = newShipment;
  bar.appendChild(addBtn);
}

function switchShipment(id) {
  data.activeShipment = id;
  saveData();
  renderTabs();
  updateListTitle();
  render();
}

function newShipment() {
  const num = data.shipments.length + 1;
  const uid = Date.now();
  const newS = { id: uid, name: `شحنة ${num}`, orders: [] };
  data.shipments.push(newS);
  data.activeShipment = newS.id;
  saveData();
  renderTabs();
  updateListTitle();
  activeFilter = 'all';
  setFilter('all');
  render();
}

function deleteShipment(e, id) {
  e.stopPropagation();
  if (data.shipments.length === 1) return;
  const s = data.shipments.find(x => x.id === id);
  if (s.orders.length > 0) {
    if (!confirm(`هل تريد حذف "${s.name}"؟ تحتوي على ${s.orders.length} أوردر`)) return;
  }
  data.shipments = data.shipments.filter(x => x.id !== id);
  if (data.activeShipment === id) {
    data.activeShipment = data.shipments[data.shipments.length - 1].id;
  }
  saveData();
  renderTabs();
  updateListTitle();
  render();
}

function updateListTitle() {
  const s = getActive();
  document.getElementById('listTitle').textContent = `${s.name} — الطلبات`;
}

// ===== DELIVERY =====
function setDelivery(type) {
  deliveryType = type;
  document.getElementById('btnBary').className = 'delivery-btn' + (type === 'bary' ? ' active-bary' : '');
  document.getElementById('btnGowy').className = 'delivery-btn' + (type === 'gowy' ? ' active-gowy' : '');
}

// ===== FILTER =====
function setFilter(f) {
  activeFilter = f;
  document.getElementById('fAll').className  = 'filter-tab' + (f === 'all'  ? ' active-all'  : '');
  document.getElementById('fBary').className = 'filter-tab' + (f === 'bary' ? ' active-bary' : '');
  document.getElementById('fGowy').className = 'filter-tab' + (f === 'gowy' ? ' active-gowy' : '');
  render();
}

// ===== ADD ORDER =====
function addOrder() {
  const rate = +document.getElementById('rate').value;
  const name = document.getElementById('name').value.trim();
  const item = document.getElementById('item').value.trim();
  const qty  = +document.getElementById('qty').value || 1;
  const sar  = +document.getElementById('sar').value;
  const profitVal = +document.getElementById('profit').value || 0;
  const extra = document.getElementById('extra').checked;

  if (!name || !item || !sar) {
    shakeMissing(name, item, sar);
    return;
  }

  let unit = sar * rate + profitVal;
  if (extra) unit *= 1.25;
  const total = unit * qty;

  const s = getActive();
  s.orders.unshift({ id: Date.now(), name, item, qty, unit, total, delivery: deliveryType });
  saveData();
  renderTabs();

  document.getElementById('name').value   = '';
  document.getElementById('item').value   = '';
  document.getElementById('sar').value    = '';
  document.getElementById('profit').value = '';
  document.getElementById('extra').checked = false;

  const card = document.getElementById('listCard');
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 500);
  render();
}

function shakeMissing(name, item, sar) {
  if (!name) document.getElementById('name').style.borderColor = '#ef4444';
  if (!item) document.getElementById('item').style.borderColor = '#ef4444';
  if (!sar)  document.getElementById('sar').style.borderColor  = '#ef4444';
  setTimeout(() => {
    ['name','item','sar'].forEach(id => document.getElementById(id).style.borderColor = '');
  }, 1500);
}

// ===== DELETE ORDER =====
function del(id) {
  const s = getActive();
  s.orders = s.orders.filter(x => x.id !== id);
  saveData();
  renderTabs();
  render();
}

// ===== RENDER ORDERS =====
function render() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  const s = getActive();
  const orders = s.orders;
  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.delivery === activeFilter);

  if (filtered.length === 0) {
    const msg = orders.length === 0
      ? 'لا توجد أوردرات بعد<br>ابدأ بإضافة أول أوردر'
      : 'لا توجد أوردرات في هذه الفئة';
    list.innerHTML = `<div class='empty'><div class='icon'>📭</div><p>${msg}</p></div>`;
    document.getElementById('totalAmt').textContent = '0 جنيه';
    document.getElementById('orderCount').textContent = '0 أوردر';
    return;
  }

  let grand = 0;
  filtered.forEach((o, i) => {
    grand += o.total;
    const div = document.createElement('div');
    div.className = 'item' + (o.delivery === 'gowy' ? ' is-gowy' : ' is-bary');
    div.style.animationDelay = (i * 0.05) + 's';
    const deliveryBadge = o.delivery === 'gowy'
      ? `<span class='badge-gowy'>✈️ جوي</span>`
      : `<span class='badge-bary'>🚢 بري</span>`;
    div.innerHTML = `
      <div class='item-info'>
        <div class='item-name' style='display:flex;align-items:center;gap:8px'>${o.name} ${deliveryBadge}</div>
        <div class='item-details'>
          <span>📦 ${o.item}</span>
          <span>× ${o.qty}</span>
        </div>
        <div class='item-prices'>
          <span class='price-badge price-unit'>الوحدة: ${o.unit.toFixed(2)} ج</span>
          <span class='price-badge price-total'>الإجمالي: ${o.total.toFixed(2)} ج</span>
        </div>
      </div>
      <button class='del' onclick='del(${o.id})' title='حذف'>✕</button>
    `;
    list.appendChild(div);
  });

  document.getElementById('totalAmt').textContent = grand.toFixed(2) + ' جنيه';
  document.getElementById('orderCount').textContent = filtered.length + ' أوردر';
}

// ===== PDF PRINT =====
function printPDF() {
  const s = getActive();
  const now = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('printTitle').textContent = `✦ Loza's Orders — ${s.name}`;
  document.getElementById('printDate').textContent = `تاريخ الطباعة: ${now}`;
  window.print();
}

// ===== INIT =====
renderTabs();
updateListTitle();
render();
