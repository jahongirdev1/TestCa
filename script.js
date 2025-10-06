const API_BASE_URL = '';

const TELEGRAM_BOT_TOKEN = '8002847512:AAFN6L6xzvdvRLdWUnxII5b0ooUppiLptnA';
const TELEGRAM_CHAT_ID = '758761122';

const DEFAULT_ORDER_STATUS = 'Новый';
const ORDER_STATUS_INFO = {
  Новый: { key: 'new', label: 'Новый', filterLabel: 'Новые', className: 'status-new' },
  Принят: { key: 'accepted', label: 'Принят', filterLabel: 'Принятые', className: 'status-accepted' },
  Отправлен: { key: 'shipped', label: 'Отправлен', filterLabel: 'Отправленные', className: 'status-shipped' },
  Отменён: { key: 'canceled', label: 'Отменён', filterLabel: 'Отменённые', className: 'status-canceled' }
};
const ORDER_STATUS_VALUES = Object.keys(ORDER_STATUS_INFO);

const CART_STORAGE_KEY = 'cart';
const LEGACY_CART_KEYS = ['cozy-cafe-cart'];
const CATEGORY_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="20" fill="%23ffe8d6"/><circle cx="80" cy="70" r="26" fill="%23ff924c"/><path fill="%23ff924c" d="M40 120h80v4H40z"/></svg>';
const PRODUCT_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280"><rect width="400" height="280" rx="32" fill="%23ffe8d6"/><circle cx="200" cy="130" r="70" fill="%23ff924c"/><path fill="%23ff924c" d="M100 210h200v10H100z"/></svg>';
const CART_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="%23ffe8d6"/><circle cx="60" cy="54" r="24" fill="%23ffb347"/><path fill="%23ffb347" d="M30 90h60v6H30z"/></svg>';

let categories = [];
let menuItems = [];
let cartItems = [];

const categoryListeners = new Set();
const productListeners = new Set();

function sanitizeImageValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }
  return '';
}

function getImageWithFallback(image, fallback) {
  const sanitized = sanitizeImageValue(image);
  return sanitized || fallback;
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatPrice(value) {
  return `${Number(value).toLocaleString('ru-RU')} ₸`;
}

function getDishWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'блюдо';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'блюда';
  return 'блюд';
}

function getOrderStatusInfo(status) {
  return ORDER_STATUS_INFO[status] || ORDER_STATUS_INFO[DEFAULT_ORDER_STATUS];
}

function getAlmatyDateMetadata() {
  const now = new Date();
  const offsetMs = 6 * 60 * 60 * 1000;
  const almatyDate = new Date(now.getTime() + offsetMs);
  const iso = almatyDate.toISOString().replace('Z', '+06:00');
  return { iso };
}

function parseOrderDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

function formatOrderDate(value) {
  const date = parseOrderDate(value);
  if (!date) {
    return '';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getOrderTimestamp(value) {
  const date = parseOrderDate(value);
  return date ? date.getTime() : 0;
}

function notifyCategoryListeners() {
  const snapshot = [...categories];
  categoryListeners.forEach(listener => listener(snapshot));
}

function notifyProductListeners() {
  const snapshot = [...menuItems];
  productListeners.forEach(listener => listener(snapshot));
}

function onCategoriesChange(listener) {
  categoryListeners.add(listener);
  listener([...categories]);
  return () => categoryListeners.delete(listener);
}

function onProductsChange(listener) {
  productListeners.add(listener);
  listener([...menuItems]);
  return () => productListeners.delete(listener);
}
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    let message = `Ошибка ${response.status}`;
    try {
      const data = await response.json();
      if (data && typeof data.error === 'string') {
        message = data.error;
      }
    } catch (error) {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function normalizeCategory(data) {
  return {
    id: String(data.id),
    name: data.name,
    image: sanitizeImageValue(data.image)
  };
}

function normalizeProduct(data) {
  return {
    id: String(data.id),
    name: data.name,
    description: data.description || '',
    price: Number(data.price) || 0,
    categoryId: data.categoryId != null ? String(data.categoryId) : '',
    category: data.category || 'Без категории',
    image: sanitizeImageValue(data.image)
  };
}

function normalizeOrder(data) {
  return {
    id: String(data.id),
    name: data.name || 'Без имени',
    phone: data.phone || '',
    address: data.address || '',
    items: Array.isArray(data.items)
      ? data.items.map(item => ({
          id: String(item.id ?? ''),
          name: item.name || 'Без названия',
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0
        }))
      : [],
    totalPrice: Number(data.totalPrice) || 0,
    status: ORDER_STATUS_VALUES.includes(data.status) ? data.status : DEFAULT_ORDER_STATUS,
    createdAt: data.createdAt || null
  };
}

async function refreshCategories() {
  try {
    const data = await apiRequest('/categories');
    if (!Array.isArray(data)) {
      categories = [];
    } else {
      categories = data.map(normalizeCategory).sort((a, b) =>
        a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })
      );
    }
    notifyCategoryListeners();
  } catch (error) {
    console.error('Ошибка при загрузке категорий:', error);
  }
}

async function refreshProducts() {
  try {
    const data = await apiRequest('/products');
    if (!Array.isArray(data)) {
      menuItems = [];
    } else {
      menuItems = data.map(normalizeProduct).sort((a, b) =>
        a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })
      );
    }
    syncCartWithProducts(menuItems);
    notifyProductListeners();
  } catch (error) {
    console.error('Ошибка при загрузке товаров:', error);
  }
}

async function fetchOrdersFromServer() {
  try {
    const data = await apiRequest('/orders');
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeOrder).sort((a, b) => getOrderTimestamp(b.createdAt) - getOrderTimestamp(a.createdAt));
  } catch (error) {
    console.error('Ошибка при загрузке заказов:', error);
    return [];
  }
}

async function createCategoryRequest(name, imageFile) {
  const formData = new FormData();
  formData.append('name', name);
  if (imageFile) {
    formData.append('image', imageFile);
  }
  return apiRequest('/categories', {
    method: 'POST',
    body: formData
  });
}

async function updateCategoryRequest(id, name, imageFile) {
  const formData = new FormData();
  formData.append('name', name);
  if (imageFile) {
    formData.append('image', imageFile);
  }
  return apiRequest(`/categories/${id}`, {
    method: 'PUT',
    body: formData
  });
}

async function deleteCategoryRequest(id) {
  return apiRequest(`/categories/${id}`, { method: 'DELETE' });
}

async function createProductRequest(product) {
  const formData = new FormData();
  if (product.productId) {
    formData.append('productId', product.productId);
  }
  formData.append('name', product.name);
  formData.append('description', product.description || '');
  formData.append('price', product.price);
  if (product.categoryId) {
    formData.append('categoryId', product.categoryId);
  }
  if (product.imageFile) {
    formData.append('image', product.imageFile);
  }
  return apiRequest('/products', {
    method: 'POST',
    body: formData
  });
}

async function updateProductRequest(id, product) {
  const formData = new FormData();
  formData.append('name', product.name);
  formData.append('description', product.description || '');
  formData.append('price', product.price);
  if (product.categoryId) {
    formData.append('categoryId', product.categoryId);
  }
  if (product.imageFile) {
    formData.append('image', product.imageFile);
  }
  return apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: formData
  });
}

async function deleteProductRequest(id) {
  return apiRequest(`/products/${id}`, { method: 'DELETE' });
}

async function submitOrderRequest(order) {
  return apiRequest('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
}

async function updateOrderStatusRequest(id, status) {
  return apiRequest(`/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}
function loadCart() {
  try {
    let stored = localStorage.getItem(CART_STORAGE_KEY);
    let sourceKey = CART_STORAGE_KEY;

    if (!stored) {
      for (const key of LEGACY_CART_KEYS) {
        const legacyValue = localStorage.getItem(key);
        if (legacyValue) {
          stored = legacyValue;
          sourceKey = key;
          break;
        }
      }
    }

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const normalized = parsed.map(item => ({
      id: String(item.id),
      name: item.name,
      description: item.description,
      price: Number(item.price) || 0,
      category: item.category,
      image: sanitizeImageValue(item.image),
      quantity: Number(item.quantity) || 1
    }));

    if (sourceKey !== CART_STORAGE_KEY) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
      localStorage.removeItem(sourceKey);
    }

    return normalized;
  } catch (error) {
    console.warn('Не удалось загрузить корзину', error);
    return [];
  }
}

function saveCart() {
  if (cartItems.length > 0) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } else {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
  updateCartCount();
}

function updateCartCount() {
  const total = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const counter = document.getElementById('cart-count');
  if (counter) {
    counter.textContent = total;
    counter.classList.toggle('is-visible', total > 0);
  }
}

function addToCart(item, quantity) {
  if (!item || typeof item !== 'object') {
    return;
  }

  cartItems = loadCart();

  const normalizedQuantity = Number.isFinite(Number(quantity))
    ? Math.max(1, Math.floor(Number(quantity)))
    : 1;

  const itemId = String(item.id);
  const existing = cartItems.find(cartItem => cartItem.id === itemId);

  if (existing) {
    existing.quantity += normalizedQuantity;
  } else {
    cartItems.push({
      id: itemId,
      name: item.name,
      description: item.description,
      price: Number(item.price) || 0,
      category: item.category,
      image: sanitizeImageValue(item.image),
      quantity: normalizedQuantity
    });
  }

  saveCart();
  updateCartCount();
}

function updateCartItemQuantity(id, quantity) {
  const targetId = String(id);
  const item = cartItems.find(cartItem => cartItem.id === targetId);
  if (!item) return;

  const nextQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

  if (nextQuantity <= 0) {
    cartItems = cartItems.filter(cartItem => cartItem.id !== targetId);
  } else {
    item.quantity = nextQuantity;
  }
  saveCart();
}

function removeCartItem(id) {
  const targetId = String(id);
  cartItems = cartItems.filter(item => item.id !== targetId);
  saveCart();
}

function getCartTotal() {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
}

function syncCartWithProducts(productList) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return false;
  }

  if (!Array.isArray(productList) || productList.length === 0) {
    return false;
  }

  const productMap = new Map(productList.map(product => [String(product.id), product]));
  const nextCartItems = [];
  let hasChanges = false;

  cartItems.forEach(cartItem => {
    const product = productMap.get(String(cartItem.id));
    if (!product) {
      hasChanges = true;
      return;
    }

    const syncedItem = {
      ...cartItem,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: sanitizeImageValue(product.image) || cartItem.image
    };

    if (
      cartItem.name !== syncedItem.name ||
      cartItem.description !== syncedItem.description ||
      cartItem.price !== syncedItem.price ||
      cartItem.category !== syncedItem.category ||
      cartItem.image !== syncedItem.image
    ) {
      hasChanges = true;
    }

    nextCartItems.push(syncedItem);
  });

  if (nextCartItems.length !== cartItems.length) {
    hasChanges = true;
  }

  if (hasChanges) {
    cartItems = nextCartItems;
    saveCart();
    return true;
  }

  return false;
}

async function sendOrderToTelegram(order) {
  if (
    !TELEGRAM_BOT_TOKEN ||
    TELEGRAM_BOT_TOKEN === '8002847512:AAFN6L6xzvdvRLdWUnxII5b0ooUppiLptnA' ||
    !TELEGRAM_CHAT_ID ||
    TELEGRAM_CHAT_ID === '758761122'
  ) {
    return;
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const itemsText = items.length
    ? items
        .map(item => {
          const quantity = Number(item?.quantity) || 0;
          const priceValue = Number(item?.price) || 0;
          return `• ${escapeHtml(item?.name || 'Без названия')} × ${quantity} — ${escapeHtml(
            formatPrice(priceValue * quantity)
          )}`;
        })
        .join('\n')
    : '—';

  const totalFormatted = formatPrice(order?.totalPrice ?? 0);
  const timeFormatted = formatOrderDate(order?.createdAt);

  const messageLines = [
    '🍽 <b>Новый заказ</b>',
    `👤 <b>Имя:</b> ${escapeHtml(order?.name || '—')}`,
    `📞 <b>Телефон:</b> ${escapeHtml(order?.phone || '—')}`,
    `📍 <b>Адрес:</b> ${escapeHtml(order?.address || '—')}`,
    '',
    '<b>Товары:</b>',
    itemsText,
    '',
    `💰 <b>Итого:</b> ${escapeHtml(totalFormatted)}`,
    timeFormatted ? `🕒 <b>Время:</b> ${escapeHtml(timeFormatted)}` : '',
    order?.id ? `🆔 <b>ID:</b> ${escapeHtml(order.id)}` : ''
  ].filter(Boolean);

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: messageLines.join('\n'),
      parse_mode: 'HTML'
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }
}

function setFormLoading(form, isLoading, loadingText = 'Сохранение...') {
  if (!form) return;
  const elements = Array.from(form.elements);
  const submitButton = form.querySelector('[type="submit"]');
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      element.toggleAttribute('disabled', isLoading);
    }
  });
  if (submitButton) {
    if (isLoading) {
      submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
      submitButton.textContent = loadingText;
    } else {
      submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
    }
  }
}
function initHomePage() {
  let selectedCategory = 'Всё';
  let currentCategories = [];
  let currentMenuItems = [];

  const carousel = document.getElementById('categoryCarousel');
  const track = document.getElementById('categoryTrack');
  const leftArrow = document.getElementById('carouselLeft');
  const rightArrow = document.getElementById('carouselRight');
  const menuGrid = document.getElementById('menuGrid');
  const menuTitle = document.getElementById('menuTitle');
  const menuCount = document.getElementById('menuCount');
  const emptyCategory = document.getElementById('emptyCategory');

  function renderCategories(list = currentCategories) {
    currentCategories = list;
    if (!track) return;

    if (selectedCategory !== 'Всё' && !currentCategories.some(category => category.name === selectedCategory)) {
      selectedCategory = 'Всё';
    }

    track.innerHTML = '';

    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = `category-button${selectedCategory === 'Всё' ? ' selected' : ''}`;
    allButton.innerHTML = `
      <span class="category-all">Всё</span>
      <span class="category-label">Всё меню</span>
    `;
    allButton.addEventListener('click', () => {
      selectedCategory = 'Всё';
      renderCategories();
      renderMenu();
    });
    track.appendChild(allButton);

    currentCategories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `category-button${selectedCategory === category.name ? ' selected' : ''}`;
      button.innerHTML = `
        <span class="category-image">
          <img src="${getImageWithFallback(category.image, CATEGORY_PLACEHOLDER)}" alt="${category.name}">
        </span>
        <span class="category-label">${category.name}</span>
      `;
      button.addEventListener('click', () => {
        selectedCategory = category.name;
        renderCategories();
        renderMenu();
      });
      track.appendChild(button);
    });

    requestAnimationFrame(updateArrowState);
  }

  function renderMenu(list = currentMenuItems) {
    currentMenuItems = list;
    if (!menuGrid || !menuTitle || !menuCount || !emptyCategory) return;

    const filteredItems = selectedCategory === 'Всё'
      ? currentMenuItems
      : currentMenuItems.filter(item => item.category === selectedCategory);

    menuTitle.textContent = selectedCategory === 'Всё' ? 'Все блюда' : selectedCategory;
    menuCount.textContent = `${filteredItems.length} ${getDishWord(filteredItems.length)}`;

    menuGrid.innerHTML = '';

    if (filteredItems.length === 0) {
      emptyCategory.hidden = false;
      return;
    }

    emptyCategory.hidden = true;

    filteredItems.forEach(item => {
      const card = createMenuCard(item);
      menuGrid.appendChild(card);
    });
  }

  function createMenuCard(item) {
    let quantity = 1;

    const card = document.createElement('article');
    card.className = 'menu-card';

    const top = document.createElement('div');
    top.className = 'card-top';
    top.innerHTML = `
      <div class="menu-image">
        <img src="${getImageWithFallback(item.image, PRODUCT_PLACEHOLDER)}" alt="${item.name}">
      </div>
      <div class="menu-body">
        <h3>${item.name}</h3>
        <p class="menu-description">${item.description || 'Описание скоро появится'}</p>
        <div class="menu-meta">
          <span class="menu-price">${formatPrice(item.price)}</span>
          <span class="menu-chip">${item.category}</span>
        </div>
      </div>
    `;
    card.appendChild(top);

    const panel = document.createElement('div');
    panel.className = 'quantity-panel';
    panel.innerHTML = `
      <div class="quantity-row">
        <span class="quantity-label">Кол:</span>
        <div class="quantity-controls">
          <button type="button" class="control-button" aria-label="Уменьшить количество">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <span class="quantity-value">1</span>
          <button type="button" class="control-button" aria-label="Увеличить количество">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      <button type="button" class="button button-primary add-to-cart">Добавить в корзину</button>
    `;
    card.appendChild(panel);

    const [decreaseButton, increaseButton] = panel.querySelectorAll('.control-button');
    const quantityValue = panel.querySelector('.quantity-value');
    const addButton = panel.querySelector('.add-to-cart');

    function updateQuantityDisplay() {
      quantityValue.textContent = quantity;
      decreaseButton.disabled = quantity <= 1;
    }

    function toggleCard() {
      const isOpen = card.classList.toggle('is-open');
      if (isOpen) {
        document.querySelectorAll('.menu-card.is-open').forEach(openCard => {
          if (openCard !== card) {
            openCard.classList.remove('is-open');
          }
        });
      }
    }

    top.addEventListener('click', toggleCard);

    decreaseButton.addEventListener('click', event => {
      event.stopPropagation();
      if (quantity > 1) {
        quantity -= 1;
        updateQuantityDisplay();
      }
    });

    increaseButton.addEventListener('click', event => {
      event.stopPropagation();
      quantity += 1;
      updateQuantityDisplay();
    });

    addButton.addEventListener('click', event => {
      event.stopPropagation();
      addToCart(item, quantity);
      card.classList.remove('is-open');
      quantity = 1;
      updateQuantityDisplay();
      addButton.blur();
    });

    updateQuantityDisplay();
    return card;
  }

  function updateArrowState() {
    if (!carousel) return;
    const { scrollLeft, scrollWidth, clientWidth } = carousel;
    if (leftArrow) {
      leftArrow.disabled = scrollLeft <= 0;
    }
    if (rightArrow) {
      rightArrow.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
    }
  }

  if (leftArrow) {
    leftArrow.addEventListener('click', () => {
      carousel.scrollBy({ left: -220, behavior: 'smooth' });
    });
  }

  if (rightArrow) {
    rightArrow.addEventListener('click', () => {
      carousel.scrollBy({ left: 220, behavior: 'smooth' });
    });
  }

  if (carousel) {
    carousel.addEventListener('scroll', () => requestAnimationFrame(updateArrowState));
  }

  window.addEventListener('resize', () => requestAnimationFrame(updateArrowState));

  onCategoriesChange(list => {
    renderCategories(list);
    renderMenu();
  });

  onProductsChange(list => {
    renderMenu(list);
  });

  renderCategories();
  renderMenu();
  updateArrowState();
}
function initCartPage() {
  const emptyState = document.getElementById('emptyCart');
  const cartContent = document.getElementById('cartContent');
  const cartContainer = document.getElementById('cartItems');
  const summaryList = document.getElementById('summaryList');
  const totalAmount = document.getElementById('totalAmount');
  const checkoutButton = document.getElementById('checkoutButton');
  const orderForm = document.getElementById('orderForm');
  const orderFeedback = document.getElementById('orderFeedback');
  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const addressInput = document.getElementById('customerAddress');

  cartItems = loadCart();

  let isFormVisible = false;
  let isSubmittingOrder = false;

  function showOrderFeedback(message = '', type) {
    if (!orderFeedback) return;
    orderFeedback.textContent = message;
    if (type) {
      orderFeedback.dataset.type = type;
    } else {
      delete orderFeedback.dataset.type;
    }
  }

  function toggleOrderForm(forceState) {
    const shouldShow = typeof forceState === 'boolean' ? forceState : !isFormVisible;
    isFormVisible = shouldShow;
    if (orderForm) {
      orderForm.hidden = !shouldShow;
    }
    if (checkoutButton) {
      checkoutButton.textContent = shouldShow ? 'Скрыть форму' : 'Оформить заказ';
    }
    if (shouldShow && nameInput) {
      nameInput.focus();
    }
  }

  function setOrderFormLoading(isLoading) {
    if (orderForm) {
      const elements = Array.from(orderForm.elements);
      elements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.toggleAttribute('disabled', isLoading);
        }
      });
      const submitButton = orderForm.querySelector('.checkout-submit');
      if (submitButton) {
        if (isLoading) {
          submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
          submitButton.textContent = 'Отправка...';
        } else {
          submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
        }
      }
    }
    isSubmittingOrder = isLoading;
    if (checkoutButton) {
      checkoutButton.disabled = isLoading || cartItems.length === 0;
    }
  }

  function updateCheckoutAvailability(hasItems) {
    if (checkoutButton) {
      checkoutButton.disabled = !hasItems || isSubmittingOrder;
    }
    if (!hasItems) {
      toggleOrderForm(false);
      showOrderFeedback();
      if (orderForm) {
        orderForm.reset();
      }
    }
  }

  function renderCart() {
    cartItems = loadCart();
    updateCartCount();
    const hasItems = cartItems.length > 0;

    if (emptyState) emptyState.hidden = hasItems;
    if (cartContent) cartContent.hidden = !hasItems;

    updateCheckoutAvailability(hasItems);

    if (!cartContainer || !summaryList || !totalAmount) {
      return;
    }

    cartContainer.innerHTML = '';
    summaryList.innerHTML = '';

    if (!hasItems) {
      totalAmount.textContent = formatPrice(0);
      return;
    }

    cartItems.forEach(item => {
      const card = document.createElement('article');
      card.className = 'cart-card';
      card.innerHTML = `
        <img src="${getImageWithFallback(item.image, CART_PLACEHOLDER)}" alt="${item.name}">
        <div class="cart-info">
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <span class="cart-price">${formatPrice(item.price)}</span>
          <span class="cart-price cart-line-total">Итого: ${formatPrice(item.price * item.quantity)}</span>
        </div>
      `;

      const controls = document.createElement('div');
      controls.className = 'cart-row';
      controls.innerHTML = `
        <div class="quantity-column">
          <button type="button" class="control-button" aria-label="Увеличить количество">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <span class="quantity-value">${item.quantity}</span>
          <button type="button" class="control-button" aria-label="Уменьшить количество">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <button type="button" class="remove-button" aria-label="Удалить блюдо">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2"></path>
          </svg>
        </button>
      `;

      const controlButtons = controls.querySelectorAll('.control-button');
      const increaseButton = controlButtons[0];
      const decreaseButton = controlButtons[1];
      const removeButton = controls.querySelector('.remove-button');

      if (decreaseButton) {
        decreaseButton.disabled = item.quantity <= 1;
      }

      if (increaseButton) {
        increaseButton.addEventListener('click', () => {
          updateCartItemQuantity(item.id, item.quantity + 1);
          renderCart();
        });
      }

      if (decreaseButton) {
        decreaseButton.addEventListener('click', () => {
          updateCartItemQuantity(item.id, item.quantity - 1);
          renderCart();
        });
      }

      if (removeButton) {
        removeButton.addEventListener('click', () => {
          removeCartItem(item.id);
          renderCart();
        });
      }

      card.appendChild(controls);
      cartContainer.appendChild(card);

      const summaryRow = document.createElement('div');
      summaryRow.className = 'summary-item';
      summaryRow.innerHTML = `
        <span>${item.name} × ${item.quantity}</span>
        <span>${formatPrice(item.price * item.quantity)}</span>
      `;
      summaryList.appendChild(summaryRow);
    });

    totalAmount.textContent = formatPrice(getCartTotal());
  }

  if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
      if (!cartItems.length || isSubmittingOrder) {
        return;
      }
      toggleOrderForm();
    });
  }

  if (orderForm) {
    orderForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!cartItems.length || isSubmittingOrder) {
        return;
      }

      const name = nameInput?.value?.toString().trim() || '';
      const phone = phoneInput?.value?.toString().trim() || '';
      const address = addressInput?.value?.toString().trim() || '';

      if (!name || !phone || !address) {
        showOrderFeedback('Пожалуйста, заполните все поля.', 'error');
        return;
      }

      const orderItems = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const orderPayload = {
        name,
        phone,
        address,
        items: orderItems,
        totalPrice: getCartTotal()
      };

      try {
        showOrderFeedback();
        setOrderFormLoading(true);
        const savedOrder = await submitOrderRequest(orderPayload);
        try {
          await sendOrderToTelegram({ ...orderPayload, ...savedOrder, createdAt: savedOrder?.createdAt || getAlmatyDateMetadata().iso });
        } catch (telegramError) {
          console.warn('Не удалось отправить заказ в Telegram:', telegramError);
        }
        showOrderFeedback('✅ Заказ оформлен!', 'success');
        toggleOrderForm(false);
        cartItems = [];
        saveCart();
        renderCart();
        if (orderForm) {
          orderForm.reset();
        }
      } catch (error) {
        console.error('Ошибка при оформлении заказа:', error);
        showOrderFeedback(error.message || 'Не удалось отправить заказ. Попробуйте ещё раз.', 'error');
      } finally {
        setOrderFormLoading(false);
      }
    });
  }

  onProductsChange(list => {
    syncCartWithProducts(list);
    renderCart();
  });

  renderCart();
}
function initAdminPage() {
  const authSection = document.getElementById('adminAuth');
  const adminPanel = document.getElementById('adminPanel');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const categoryForm = document.getElementById('categoryForm');
  const productForm = document.getElementById('productForm');
  const categorySelect = document.getElementById('productCategory');
  const notification = document.getElementById('adminNotification');
  const navButtons = adminPanel ? Array.from(adminPanel.querySelectorAll('[data-section]')) : [];
  const sectionBlocks = adminPanel ? Array.from(adminPanel.querySelectorAll('[data-section-content]')) : [];
  const sidebar = document.getElementById('adminSidebar');
  const menuToggle = document.getElementById('adminMenuToggle');
  const menuToggleLabel = menuToggle?.querySelector('.sr-only');
  const sidebarOverlay = document.getElementById('adminSidebarOverlay');
  const mobileBreakpoint = window.matchMedia('(max-width: 1140px)');
  const orderFilters = document.getElementById('orderFilters');
  const ordersListContainer = document.getElementById('ordersList');
  const ordersEmptyState = document.getElementById('ordersEmpty');
  const categoryListContainer = document.getElementById('categoryList');
  const categoryEmptyState = document.getElementById('categoryEmpty');
  const productListContainer = document.getElementById('productList');
  const productEmptyState = document.getElementById('productEmpty');

  let ordersData = [];
  let currentOrderFilter = DEFAULT_ORDER_STATUS;
  let ordersInitialized = false;
  let editingCategory = null;
  let editingProduct = null;

  function resetCategoryFormState() {
    editingCategory = null;
    if (!categoryForm) return;
    const imageInput = categoryForm.categoryImage;
    if (imageInput) {
      imageInput.value = '';
      imageInput.setAttribute('required', 'true');
    }
  }

  function resetProductFormState() {
    editingProduct = null;
    if (!productForm) return;
    const imageInput = productForm.productImage;
    if (imageInput) {
      imageInput.value = '';
      imageInput.setAttribute('required', 'true');
    }
    const idInput = productForm.productId;
    if (idInput) {
      idInput.readOnly = false;
    }
    if (categorySelect) {
      const placeholder = categorySelect.querySelector('option[value=""]');
      if (placeholder) {
        placeholder.selected = true;
      }
    }
  }

  function showNotification(message, type = 'success') {
    if (!notification) return;
    notification.textContent = message;
    notification.dataset.type = type;
    notification.classList.add('is-visible');
    setTimeout(() => {
      notification.classList.remove('is-visible');
    }, 3000);
  }

  function renderCategoryList(list = []) {
    if (!categoryListContainer) return;
    categoryListContainer.innerHTML = '';
    const hasItems = Array.isArray(list) && list.length > 0;
    categoryListContainer.hidden = !hasItems;
    if (categoryEmptyState) {
      categoryEmptyState.hidden = hasItems;
    }
    if (!hasItems) {
      return;
    }

    list.forEach(category => {
      const card = document.createElement('article');
      card.className = 'admin-entity-card admin-entity-card--category';
      card.innerHTML = `
        <div class="admin-entity-media">
          <img src="${getImageWithFallback(category.image, CATEGORY_PLACEHOLDER)}" alt="${escapeHtml(category.name)}">
        </div>
        <div class="admin-entity-body">
          <div class="admin-entity-title">
            <h3>${escapeHtml(category.name)}</h3>
          </div>
          <div class="admin-entity-actions">
            <button type="button" class="button button-outline" data-action="edit">Изменить</button>
            <button type="button" class="button button-danger" data-action="delete">Удалить</button>
          </div>
        </div>
      `;

      const editButton = card.querySelector('[data-action="edit"]');
      const deleteButton = card.querySelector('[data-action="delete"]');

      if (editButton) {
        editButton.addEventListener('click', () => startCategoryEditing(category));
      }
      if (deleteButton) {
        deleteButton.addEventListener('click', () => handleCategoryDelete(category));
      }

      categoryListContainer.appendChild(card);
    });
  }

  function renderProductList(list = []) {
    if (!productListContainer) return;
    productListContainer.innerHTML = '';
    const hasItems = Array.isArray(list) && list.length > 0;
    productListContainer.hidden = !hasItems;
    if (productEmptyState) {
      productEmptyState.hidden = hasItems;
    }
    if (!hasItems) {
      return;
    }

    list.forEach(product => {
      const card = document.createElement('article');
      card.className = 'admin-entity-card';
      card.innerHTML = `
        <div class="admin-entity-media">
          <img src="${getImageWithFallback(product.image, PRODUCT_PLACEHOLDER)}" alt="${escapeHtml(product.name)}">
        </div>
        <div class="admin-entity-body">
          <div class="admin-entity-title">
            <h3>${escapeHtml(product.name)}</h3>
            <span class="admin-entity-price">${formatPrice(product.price)}</span>
          </div>
          <p class="admin-entity-category">${escapeHtml(product.category)}</p>
          <div class="admin-entity-actions">
            <button type="button" class="button button-outline" data-action="edit">Изменить</button>
            <button type="button" class="button button-danger" data-action="delete">Удалить</button>
          </div>
        </div>
      `;

      const editButton = card.querySelector('[data-action="edit"]');
      const deleteButton = card.querySelector('[data-action="delete"]');

      if (editButton) {
        editButton.addEventListener('click', () => startProductEditing(product));
      }
      if (deleteButton) {
        deleteButton.addEventListener('click', () => handleProductDelete(product));
      }

      productListContainer.appendChild(card);
    });
  }

  function startCategoryEditing(category) {
    if (!categoryForm || !category) return;
    if (editingCategory?.id === category.id) {
      categoryForm.reset();
      showNotification('Редактирование отменено');
      return;
    }

    editingCategory = { ...category };

    const nameInput = categoryForm.categoryName;
    if (nameInput) {
      nameInput.value = category.name;
      if (nameInput.focus) {
        nameInput.focus();
      }
      if (nameInput.setSelectionRange) {
        const length = nameInput.value.length;
        nameInput.setSelectionRange(length, length);
      }
    }

    const imageInput = categoryForm.categoryImage;
    if (imageInput) {
      imageInput.removeAttribute('required');
      imageInput.value = '';
    }

    if (categoryForm.scrollIntoView) {
      categoryForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showNotification(`Категория «${category.name}» загружена для редактирования`);
  }

  function startProductEditing(product) {
    if (!productForm || !product) return;
    if (editingProduct?.id === product.id) {
      productForm.reset();
      showNotification('Редактирование отменено');
      return;
    }

    editingProduct = { ...product };

    const idInput = productForm.productId;
    if (idInput) {
      idInput.value = product.id;
      idInput.readOnly = true;
    }

    const nameInput = productForm.productName;
    if (nameInput) {
      nameInput.value = product.name;
    }

    const priceInput = productForm.productPrice;
    if (priceInput) {
      priceInput.value = product.price;
    }

    const descriptionInput = productForm.productDescription;
    if (descriptionInput) {
      descriptionInput.value = product.description || '';
    }

    if (categorySelect) {
      const optionExists = Array.from(categorySelect.options).some(option => option.value === product.categoryId);
      if (!optionExists && product.category && product.categoryId) {
        const option = document.createElement('option');
        option.value = product.categoryId;
        option.textContent = product.category;
        categorySelect.appendChild(option);
      }
      if (product.categoryId) {
        categorySelect.value = product.categoryId;
      }
    }

    const imageInput = productForm.productImage;
    if (imageInput) {
      imageInput.removeAttribute('required');
      imageInput.value = '';
    }

    if (productForm.scrollIntoView) {
      productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showNotification(`Товар «${product.name}» загружен для редактирования`);
  }
  async function handleCategoryDelete(category) {
    if (!category?.id) return;
    const shouldDelete = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`Удалить категорию «${category.name}»?`)
      : true;
    if (!shouldDelete) return;

    try {
      await deleteCategoryRequest(category.id);
      if (editingCategory?.id === category.id) {
        categoryForm?.reset();
      }
      showNotification('Категория удалена');
      await refreshCategories();
      await refreshProducts();
    } catch (error) {
      console.error('Ошибка при удалении категории:', error);
      showNotification(error.message || 'Не удалось удалить категорию', 'error');
    }
  }

  async function handleProductDelete(product) {
    if (!product?.id) return;
    const shouldDelete = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`Удалить товар «${product.name}»?`)
      : true;
    if (!shouldDelete) return;

    try {
      await deleteProductRequest(product.id);
      if (editingProduct?.id === product.id) {
        productForm?.reset();
      }
      showNotification('Товар удалён');
      await refreshProducts();
    } catch (error) {
      console.error('Ошибка при удалении товара:', error);
      showNotification(error.message || 'Не удалось удалить товар', 'error');
    }
  }

  function setSidebarState(isOpen) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', Boolean(isOpen));
    menuToggle?.classList.toggle('is-open', Boolean(isOpen));
    sidebarOverlay?.classList.toggle('is-visible', Boolean(isOpen));
    document.body.classList.toggle('admin-sidebar-open', Boolean(isOpen));
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
    }
    if (menuToggleLabel) {
      menuToggleLabel.textContent = Boolean(isOpen) ? 'Закрыть меню' : 'Открыть меню';
    }
  }

  function closeSidebar() {
    setSidebarState(false);
  }

  function toggleSidebar() {
    if (!sidebar) return;
    const willOpen = !sidebar.classList.contains('is-open');
    setSidebarState(willOpen);
  }

  function handleBreakpointChange(event) {
    if (!event.matches) {
      closeSidebar();
    }
  }

  if (mobileBreakpoint?.addEventListener) {
    mobileBreakpoint.addEventListener('change', handleBreakpointChange);
  } else if (mobileBreakpoint?.addListener) {
    mobileBreakpoint.addListener(handleBreakpointChange);
  }

  menuToggle?.addEventListener('click', toggleSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  closeSidebar();

  function applyStatusStyles(card, badge, indicator, status) {
    const info = getOrderStatusInfo(status);
    if (card) {
      card.dataset.status = info.key;
    }
    if (badge) {
      badge.textContent = info.label;
      badge.className = `order-status-badge ${info.className}`;
    }
    if (indicator) {
      indicator.className = `order-status-indicator ${info.className}`;
    }
  }

  function updateFilterButtons() {
    if (!orderFilters) return;
    const buttons = Array.from(orderFilters.querySelectorAll('[data-status]'));
    buttons.forEach(button => {
      const statusValue = button.dataset.status;
      button.classList.toggle('is-active', statusValue === currentOrderFilter);
    });
  }

  function renderOrders() {
    if (!ordersListContainer) return;
    updateFilterButtons();

    const filtered = ordersData.filter(order => order.status === currentOrderFilter);
    ordersListContainer.innerHTML = '';

    if (ordersEmptyState) {
      ordersEmptyState.hidden = !ordersInitialized || filtered.length > 0;
    }

    filtered.forEach(order => {
      const statusInfo = getOrderStatusInfo(order.status);
      const card = document.createElement('article');
      card.className = 'order-card';
      card.dataset.status = statusInfo.key;

      const header = document.createElement('header');
      header.className = 'order-card-header';

      const title = document.createElement('div');
      title.className = 'order-card-title';

      const indicator = document.createElement('span');
      indicator.className = `order-status-indicator ${statusInfo.className}`;
      title.appendChild(indicator);

      const titleText = document.createElement('div');
      const nameHeading = document.createElement('h3');
      nameHeading.textContent = order.name || 'Без имени';
      titleText.appendChild(nameHeading);

      const phoneLine = document.createElement('p');
      phoneLine.textContent = order.phone || '—';
      titleText.appendChild(phoneLine);

      title.appendChild(titleText);
      header.appendChild(title);

      const statusBlock = document.createElement('div');
      statusBlock.className = 'order-card-status';

      const badge = document.createElement('span');
      badge.className = `order-status-badge ${statusInfo.className}`;
      badge.textContent = statusInfo.label;
      statusBlock.appendChild(badge);

      const statusSelect = document.createElement('select');
      statusSelect.className = 'order-status-select';
      ORDER_STATUS_VALUES.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = ORDER_STATUS_INFO[value].label;
        statusSelect.appendChild(option);
      });
      statusSelect.value = order.status;
      statusBlock.appendChild(statusSelect);

      header.appendChild(statusBlock);
      card.appendChild(header);

      const body = document.createElement('div');
      body.className = 'order-card-body';

      const addressParagraph = document.createElement('p');
      addressParagraph.className = 'order-address';
      const addressLabel = document.createElement('strong');
      addressLabel.textContent = 'Адрес:';
      addressParagraph.append(addressLabel, ` ${order.address || '—'}`);
      body.appendChild(addressParagraph);

      const itemsList = document.createElement('ul');
      itemsList.className = 'order-items';
      const items = Array.isArray(order.items) ? order.items : [];
      if (items.length === 0) {
        const itemRow = document.createElement('li');
        const itemName = document.createElement('span');
        itemName.textContent = 'Позиции отсутствуют';
        const itemPrice = document.createElement('span');
        itemPrice.textContent = '—';
        itemRow.append(itemName, itemPrice);
        itemsList.appendChild(itemRow);
      } else {
        items.forEach(item => {
          const itemRow = document.createElement('li');
          const itemName = document.createElement('span');
          const quantity = Number(item?.quantity) || 0;
          itemName.textContent = `${item?.name || 'Без названия'} × ${quantity}`;
          const itemPrice = document.createElement('span');
          const priceValue = Number(item?.price) || 0;
          itemPrice.textContent = formatPrice(priceValue * quantity);
          itemRow.append(itemName, itemPrice);
          itemsList.appendChild(itemRow);
        });
      }
      body.appendChild(itemsList);

      card.appendChild(body);

      const footer = document.createElement('div');
      footer.className = 'order-card-footer';

      const totalSpan = document.createElement('span');
      totalSpan.className = 'order-total';
      totalSpan.textContent = `Итого: ${formatPrice(Number(order.totalPrice) || 0)}`;
      footer.appendChild(totalSpan);

      const dateSpan = document.createElement('span');
      const formattedDate = formatOrderDate(order.createdAt) || '—';
      dateSpan.textContent = `Оформлен: ${formattedDate}`;
      footer.appendChild(dateSpan);

      card.appendChild(footer);

      const controls = {
        select: statusSelect,
        card,
        badge,
        indicator,
        currentStatus: order.status,
        orderId: order.id
      };

      statusSelect.addEventListener('change', () => {
        const nextStatus = statusSelect.value;
        if (!ORDER_STATUS_VALUES.includes(nextStatus)) {
          statusSelect.value = controls.currentStatus;
          return;
        }
        handleStatusChange(controls.orderId, nextStatus, controls);
      });

      applyStatusStyles(card, badge, indicator, order.status);
      ordersListContainer.appendChild(card);
    });
  }

  async function handleStatusChange(orderId, nextStatus, controls) {
    if (!orderId) return;
    const previousStatus = controls.currentStatus;
    if (previousStatus === nextStatus) {
      return;
    }

    controls.select.disabled = true;
    try {
      await updateOrderStatusRequest(orderId, nextStatus);
      controls.currentStatus = nextStatus;
      applyStatusStyles(controls.card, controls.badge, controls.indicator, nextStatus);
      showNotification(`Статус заказа обновлён на «${nextStatus}»`);
      const orderIndex = ordersData.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        ordersData[orderIndex].status = nextStatus;
        renderOrders();
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса заказа:', error);
      showNotification(error.message || 'Не удалось обновить статус заказа', 'error');
      controls.select.value = previousStatus;
      applyStatusStyles(controls.card, controls.badge, controls.indicator, previousStatus);
    } finally {
      controls.select.disabled = false;
    }
  }

  function switchSection(target) {
    navButtons.forEach(button => {
      if (button.dataset.section === target) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
    });

    sectionBlocks.forEach(section => {
      if (section.dataset.sectionContent === target) {
        section.classList.remove('is-hidden');
      } else {
        section.classList.add('is-hidden');
      }
    });

    if (mobileBreakpoint.matches) {
      closeSidebar();
    }
  }

  async function loadAdminData() {
    setFormLoading(categoryForm, true, 'Загрузка...');
    setFormLoading(productForm, true, 'Загрузка...');
    try {
      await Promise.all([refreshCategories(), refreshProducts()]);
      ordersData = await fetchOrdersFromServer();
      ordersInitialized = true;
      if (!ORDER_STATUS_VALUES.includes(currentOrderFilter)) {
        currentOrderFilter = DEFAULT_ORDER_STATUS;
      }
      renderOrders();
    } finally {
      setFormLoading(categoryForm, false);
      setFormLoading(productForm, false);
    }
  }
  if (loginForm) {
    loginForm.addEventListener('submit', event => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const login = formData.get('login')?.toString().trim();
      const password = formData.get('password')?.toString().trim();

      if (login === 'admin' && password === '1234') {
        loginForm.reset();
        if (loginError) {
          loginError.textContent = '';
        }
        authSection?.classList.add('is-hidden');
        adminPanel?.classList.remove('is-hidden');
        switchSection('categories');
        loadAdminData().catch(error => {
          console.error('Не удалось загрузить данные админки:', error);
          showNotification('Не удалось загрузить данные', 'error');
        });
      } else if (loginError) {
        loginError.textContent = 'Неверный логин или пароль';
      }
    });
  }

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSection = button.dataset.section;
      if (targetSection) {
        switchSection(targetSection);
        if (targetSection === 'orders' && !ordersInitialized) {
          loadAdminData().catch(error => {
            console.error('Не удалось загрузить данные админки:', error);
            showNotification('Не удалось загрузить данные', 'error');
          });
        }
      }
    });
  });

  if (orderFilters) {
    orderFilters.addEventListener('click', event => {
      const targetButton = event.target.closest('[data-status]');
      if (!targetButton) return;
      const statusValue = targetButton.dataset.status;
      if (!ORDER_STATUS_VALUES.includes(statusValue)) {
        return;
      }
      currentOrderFilter = statusValue;
      renderOrders();
    });
  }

  updateFilterButtons();

  onCategoriesChange(list => {
    if (categorySelect) {
      const currentValue = categorySelect.value;
      categorySelect.innerHTML = '<option value="" disabled selected>Выберите категорию</option>';
      list.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
      if (list.some(category => category.id === currentValue)) {
        categorySelect.value = currentValue;
        const placeholder = categorySelect.querySelector('option[value=""]');
        if (placeholder) {
          placeholder.selected = false;
        }
      }
    }

    renderCategoryList(list);

    if (editingCategory && !list.some(category => category.id === editingCategory.id)) {
      if (categoryForm) {
        categoryForm.reset();
      } else {
        editingCategory = null;
      }
    }
  });

  onProductsChange(list => {
    renderProductList(list);

    if (editingProduct && !list.some(product => product.id === editingProduct.id)) {
      if (productForm) {
        productForm.reset();
      } else {
        editingProduct = null;
      }
    }
  });

  if (categoryForm) {
    categoryForm.addEventListener('reset', resetCategoryFormState);
    categoryForm.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(categoryForm);
      const name = formData.get('categoryName')?.toString().trim();
      const imageFile = categoryForm.categoryImage?.files?.[0];
      const isEditingCategory = Boolean(editingCategory);

      if (!name) {
        showNotification('Заполните все поля', 'error');
        return;
      }
      if (!isEditingCategory && !imageFile) {
        showNotification('Загрузите изображение категории', 'error');
        return;
      }

      setFormLoading(categoryForm, true, isEditingCategory ? 'Сохранение...' : 'Загрузка...');

      try {
        if (isEditingCategory) {
          await updateCategoryRequest(editingCategory.id, name, imageFile);
          showNotification('Категория обновлена');
        } else {
          await createCategoryRequest(name, imageFile);
          showNotification('Успешно добавлено');
        }

        categoryForm.reset();
        await refreshCategories();
      } catch (error) {
        console.error('Ошибка при сохранении категории:', error);
        showNotification(error.message || 'Не удалось сохранить категорию', 'error');
      } finally {
        setFormLoading(categoryForm, false);
      }
    });
  }

  if (productForm) {
    productForm.addEventListener('reset', resetProductFormState);
    productForm.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(productForm);
      const productIdValue = formData.get('productId')?.toString().trim();
      const name = formData.get('productName')?.toString().trim();
      const description = formData.get('productDescription')?.toString().trim();
      const priceValue = Number(formData.get('productPrice'));
      const categoryIdValue = formData.get('productCategory')?.toString();
      const imageFile = productForm.productImage?.files?.[0];
      const isEditingProduct = Boolean(editingProduct);

      if (!name || Number.isNaN(priceValue)) {
        showNotification('Проверьте правильность заполнения формы', 'error');
        return;
      }
      if (!isEditingProduct && !imageFile) {
        showNotification('Загрузите изображение товара', 'error');
        return;
      }
      if (!isEditingProduct && (!productIdValue || !Number.isInteger(Number(productIdValue)))) {
        showNotification('Укажите числовой ID товара', 'error');
        return;
      }
      if (isEditingProduct && editingProduct.id !== productIdValue) {
        showNotification('ID товара нельзя изменять при редактировании', 'error');
        return;
      }

      setFormLoading(productForm, true, isEditingProduct ? 'Сохранение...' : 'Загрузка...');

      try {
        const payload = {
          productId: productIdValue,
          name,
          description: description || '',
          price: priceValue,
          categoryId: categoryIdValue || '',
          imageFile
        };

        if (isEditingProduct) {
          await updateProductRequest(editingProduct.id, payload);
          showNotification('Товар обновлён');
        } else {
          await createProductRequest(payload);
          showNotification('Успешно добавлено');
        }

        productForm.reset();
        await refreshProducts();
      } catch (error) {
        console.error('Ошибка при сохранении товара:', error);
        showNotification(error.message || 'Не удалось сохранить товар', 'error');
      } finally {
        setFormLoading(productForm, false);
      }
    });
  }
}
function initialize() {
  cartItems = loadCart();
  updateCartCount();

  const page = document.body?.dataset?.page;
  if (page === 'home') {
    initHomePage();
  }
  if (page === 'cart') {
    initCartPage();
  }
  if (page === 'admin') {
    initAdminPage();
  }

  refreshCategories();
  refreshProducts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
