// app.js — основной фронтенд код
// Поддерживает Telegram WebApp (если открыт внутри Telegram) и fallback для браузера.

(() => {
  // --- Данные (примеры) ---
  const MASTERS = [
    { id: 'm1', name: 'Ильяс' },
    { id: 'm2', name: 'Рашид' },
    { id: 'm3', name: 'Артур' }
  ];

  const SERVICES = [
    { id: 's1', title: 'Мужская стрижка', desc: 'Классическая или современная', price: '800' },
    { id: 's2', title: 'Стрижка бороды', desc: 'Форма и коррекция', price: '400' },
    { id: 's3', title: 'Стрижка + борода', desc: 'Комплексная', price: '1100' }
  ];

  // Хранилище занятости (для демонстрации) — используем localStorage
  // Формат: bookings = [{id,date, time, masterId, serviceId, name, phone}]
  const STORAGE_KEY = 'barbershop_bookings_v1';

  function getBookings(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }catch(e){ return []; }
  }
  function saveBooking(obj){
    const arr = getBookings();
    arr.push(obj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // Telegram WebApp
  const tg = window.Telegram ? window.Telegram.WebApp : null;
  if (tg){
    try { tg.expand(); } catch(e){}
  }

  // --- Элементы ---
  const btnOpenBooking = document.getElementById('btnOpenBooking');
  const btnOpenPrice = document.getElementById('btnOpenPrice');
  const bookingPanel = document.getElementById('bookingPanel');
  const pricePage = document.getElementById('pricePage');
  const backButtons = document.querySelectorAll('.back');
  const servicesList = document.getElementById('servicesList');
  const masterSelect = document.getElementById('masterSelect');
  const serviceSelect = document.getElementById('serviceSelect');
  const dateInput = document.getElementById('dateInput');
  const timeSlots = document.getElementById('timeSlots');
  const btnSend = document.getElementById('btnSend');
  const btnSaveLocal = document.getElementById('btnSaveLocal');
  const clientName = document.getElementById('clientName');
  const clientPhone = document.getElementById('clientPhone');
  const toast = document.getElementById('toast');
  const chatBtn = document.getElementById('chatBtn');

  // Инициализация списка услуг и мастеров
  function fillLists(){
    masterSelect.innerHTML = MASTERS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    serviceSelect.innerHTML = SERVICES.map(s => `<option value="${s.id}">${s.title} — ${s.price}₽</option>`).join('');

    servicesList.innerHTML = SERVICES.map(s => `
      <div class="service">
        <div class="info">
          <div class="title">${s.title}</div>
          <div class="desc">${s.desc}</div>
        </div>
        <div class="price">${s.price}₽</div>
        <button class="bookNow" data-service="${s.id}">Записаться</button>
      </div>
    `).join('');
  }

  // --- UI show/hide ---
  function showPanel(panel){
    bookingPanel.classList.add('hidden');
    pricePage.classList.add('hidden');

    if (panel === 'booking') bookingPanel.classList.remove('hidden');
    if (panel === 'price') pricePage.classList.remove('hidden');
  }

  backButtons.forEach(b => b.addEventListener('click', () => showPanel('home')));

  // главное — открыть booking
  btnOpenBooking.addEventListener('click', () => {
    showPanel('booking');
  });

  // открыть прайс
  btnOpenPrice.addEventListener('click', () => {
    showPanel('price');
  });

  // кнопка "Записаться" в прайсе
  servicesList.addEventListener('click', (e) => {
    const b = e.target.closest('.bookNow');
    if (!b) return;
    const sid = b.dataset.service;
    serviceSelect.value = sid;
    showPanel('booking');
    scrollTo(dateInput);
  });

  // Телеграм чат кнопка — подставь username бота
  (function initChatLink(){
    const botUsername = 'your_bot_username'; // <-- замените на username вашего бота (без @)
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user){
      // можно использовать tg to open link, но для простоты дадим ссылку на t.me
      chatBtn.href = `https://t.me/${botUsername}`;
    } else {
      chatBtn.href = `https://t.me/${botUsername}`;
    }
  })();

  // --- Календарь и слоты ---
  // Ограничим выбор: от сегодня до +30 дней
  function setDateLimits(){
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    const min = `${yyyy}-${mm}-${dd}`;

    const future = new Date();
    future.setDate(future.getDate() + 30);
    const fyyyy = future.getFullYear();
    const fmm = String(future.getMonth()+1).padStart(2,'0');
    const fdd = String(future.getDate()).padStart(2,'0');
    const max = `${fyyyy}-${fmm}-${fdd}`;

    dateInput.min = min;
    dateInput.max = max;
    dateInput.value = min;
  }

  // Готовим временные слоты (пример: с 9:00 до 19:00 каждые 30 минут)
  function generateSlots(){
    const slots = [];
    for (let h=9; h<19; h++){
      slots.push(`${String(h).padStart(2,'0')}:00`);
      slots.push(`${String(h).padStart(2,'0')}:30`);
    }
    return slots;
  }

  function renderSlotsFor(date){
    const slots = generateSlots();
    const bookings = getBookings();
    const masterId = masterSelect.value;

    timeSlots.innerHTML = slots.map(ts => {
      // пометим слот занятым, если уже есть запись для этого мастера и даты+времени
      const busy = bookings.some(b => b.date === date && b.time === ts && b.masterId === masterId);
      return `<div class="slot ${busy ? 'busy' : ''}" data-time="${ts}">${ts}</div>`;
    }).join('');
  }

  // слот клик
  timeSlots.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot');
    if (!slot || slot.classList.contains('busy')) return;
    // снять выделение со старого
    const prev = timeSlots.querySelector('.slot.selected');
    if (prev) prev.classList.remove('selected');
    slot.classList.add('selected');
  });

  // обновить слоты при смене даты или мастера
  dateInput.addEventListener('change', () => renderSlotsFor(dateInput.value));
  masterSelect.addEventListener('change', () => renderSlotsFor(dateInput.value));

  // сохранение записи
  btnSaveLocal.addEventListener('click', () => {
    const selected = timeSlots.querySelector('.slot.selected');
    if (!selected) return showToast('Выберите время');
    const booking = buildBookingObject(selected.dataset.time);
    saveBooking(booking);
    showToast('Сохранено локально');
    renderSlotsFor(dateInput.value);
  });

  btnSend.addEventListener('click', () => {
    const sel = timeSlots.querySelector('.slot.selected');
    if (!sel) return showToast('Выберите время для записи');

    const booking = buildBookingObject(sel.dataset.time);

    // Валидация
    if (!booking.name || !booking.phone) return showToast('Введите имя и телефон');

    // Отправляем в Telegram (если доступно), иначе сохраняем локально и даём ссылку загрузки
    if (tg && tg.sendData){
      tg.sendData(JSON.stringify(booking)); // бот получит web_app_data
      // можем показать подтверждение
      showToast('Данные отправлены в бота');
      // Сохраняем локально копию
      saveBooking(booking);
      // закрыть приложение (опционально)
      try { tg.close(); } catch(e){}
    } else {
      // fallback — сохраняем и предлагаем скачать JSON
      saveBooking(booking);
      showToast('В браузере данные сохранены локально');
      // скачиваем JSON
      downloadJSON(booking, `booking_${Date.now()}.json`);
    }
    renderSlotsFor(dateInput.value);
  });

  function buildBookingObject(time){
    const id = 'bk_' + Date.now();
    const serviceId = serviceSelect.value;
    const masterId = masterSelect.value;
    const s = SERVICES.find(x => x.id === serviceId);
    const m = MASTERS.find(x => x.id === masterId);

    return {
      id,
      date: dateInput.value,
      time,
      masterId,
      masterName: m ? m.name : '',
      serviceId,
      serviceTitle: s ? s.title : '',
      price: s ? s.price : '',
      name: clientName.value.trim(),
      phone: clientPhone.value.trim(),
      createdAt: new Date().toISOString()
    };
  }

  // Утилиты
  function showToast(text, ms = 2500){
    toast.textContent = text;
    toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add('hidden'), ms);
  }

  function downloadJSON(obj, filename){
    const a = document.createElement('a');
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function scrollTo(el){
    setTimeout(()=> el.scrollIntoView({behavior:'smooth', block:'center'}), 120);
  }

  // Инициализация при загрузке
  function init(){
    fillLists();
    setDateLimits();
    renderSlotsFor(dateInput.value);

    // Делегируем back button => скрыть панели
    document.querySelectorAll('[data-target="home"]').forEach(b => {
      b.addEventListener('click', () => {
        bookingPanel.classList.add('hidden');
        pricePage.classList.add('hidden');
      });
    });

    // Подписка на динамические bookNow кнопки (в servicesList)
    // уже реализовано через делегирование выше.

    // Предзаполнение телефона (если Telegram передал)
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user){
      // иногда есть phone_number в user — редко; оставим попытку
      const user = tg.initDataUnsafe.user;
      if (user.phone) clientPhone.value = user.phone;
    }
  }

  init();
})();
