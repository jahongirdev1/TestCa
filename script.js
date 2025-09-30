import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const CART_STORAGE_KEY = 'cozy-cafe-cart';
const CATEGORY_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="20" fill="%23f5ede3"/><circle cx="80" cy="70" r="26" fill="%23d1b59c"/><path fill="%23d1b59c" d="M40 120h80v4H40z"/></svg>';
const PRODUCT_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280"><rect width="400" height="280" rx="32" fill="%23f5ede3"/><circle cx="200" cy="130" r="70" fill="%23d1b59c"/><path fill="%23d1b59c" d="M100 210h200v10H100z"/></svg>';
const CART_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="%23f5ede3"/><circle cx="60" cy="54" r="24" fill="%23d1b59c"/><path fill="%23d1b59c" d="M30 90h60v6H30z"/></svg>';

let cartItems = loadCart();
let categories = [];
let menuItems = [];

const categoryListeners = new Set();
const productListeners = new Set();

function notifyCategoryListeners() {
  const snapshot = [...categories];
  categoryListeners.forEach(listener => listener(snapshot));
}

function notifyProductListeners() {
  const snapshot = [...menuItems];
  productListeners.forEach(listener => listener(snapshot));
}

onSnapshot(
  collection(db, 'categories'),
  snapshot => {
    categories = snapshot.docs
      .map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          name: data?.name?.trim?.() || 'Без названия',
          image: data?.image || '',
          createdAt: data?.createdAt || null
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }));
    notifyCategoryListeners();
  },
  error => {
    console.error('Ошибка при загрузке категорий:', error);
  }
);

onSnapshot(
  collection(db, 'products'),
  snapshot => {
    menuItems = snapshot.docs
      .map(docSnapshot => {
        const data = docSnapshot.data();
        const priceValue = typeof data?.price === 'number' ? data.price : Number(data?.price) || 0;
        return {
          id: data?.id || docSnapshot.id,
          name: data?.name?.trim?.() || 'Без названия',
          description: data?.description?.trim?.() || '',
          price: priceValue,
          category: data?.category?.trim?.() || 'Без категории',
          image: data?.image || '',
          createdAt: data?.createdAt || null
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }));
    notifyProductListeners();
  },
  error => {
    console.error('Ошибка при загрузке товаров:', error);
  }
);

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

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(item => ({
      id: String(item.id),
      name: item.name,
      description: item.description,
      price: Number(item.price) || 0,
      category: item.category,
      image: item.image,
      quantity: Number(item.quantity) || 1
    }));
  } catch (error) {
    console.warn('Не удалось загрузить корзину', error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
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
  const existing = cartItems.find(cartItem => cartItem.id === item.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cartItems.push({ ...item, quantity });
  }
  saveCart();
}

function updateCartItemQuantity(id, quantity) {
  const item = cartItems.find(cartItem => cartItem.id === id);
  if (!item) return;

  if (quantity <= 0) {
    cartItems = cartItems.filter(cartItem => cartItem.id !== id);
  } else {
    item.quantity = quantity;
  }
  saveCart();
}

function removeCartItem(id) {
  cartItems = cartItems.filter(item => item.id !== id);
  saveCart();
}

function getCartTotal() {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
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

  function getImageSource(src) {
    return src || CATEGORY_PLACEHOLDER;
  }

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
          <img src="${getImageSource(category.image)}" alt="${category.name}">
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
        <img src="${item.image || PRODUCT_PLACEHOLDER}" alt="${item.name}">
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

  function renderCart() {
    updateCartCount();
    const hasItems = cartItems.length > 0;

    if (emptyState) emptyState.hidden = hasItems;
    if (cartContent) cartContent.hidden = !hasItems;

    if (!hasItems || !cartContainer || !summaryList || !totalAmount) {
      return;
    }

    cartContainer.innerHTML = '';
    summaryList.innerHTML = '';

    cartItems.forEach(item => {
      const card = document.createElement('article');
      card.className = 'cart-card';
      card.innerHTML = `
        <img src="${item.image || CART_PLACEHOLDER}" alt="${item.name}">
        <div class="cart-info">
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <span class="cart-price">${formatPrice(item.price)}</span>
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
      if (!cartItems.length) {
        return;
      }
      checkoutButton.disabled = true;
      const originalText = checkoutButton.textContent;
      checkoutButton.textContent = 'Обработка...';
      setTimeout(() => {
        alert('Спасибо! Ваш заказ оформлен.');
        cartItems = [];
        saveCart();
        renderCart();
        checkoutButton.textContent = originalText;
        checkoutButton.disabled = false;
      }, 600);
    });
  }

  renderCart();
}

async function uploadImage(file, folder) {
  const storageReference = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  await uploadBytes(storageReference, file);
  return getDownloadURL(storageReference);
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

  function showNotification(message, type = 'success') {
    if (!notification) return;
    notification.textContent = message;
    notification.dataset.type = type;
    notification.classList.add('is-visible');
    setTimeout(() => {
      notification.classList.remove('is-visible');
    }, 3000);
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
      }
    });
  });

  onCategoriesChange(list => {
    if (!categorySelect) return;
    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="" disabled selected>Выберите категорию</option>';
    list.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
    if (list.some(category => category.name === currentValue)) {
      categorySelect.value = currentValue;
      const placeholder = categorySelect.querySelector('option[value=""]');
      if (placeholder) {
        placeholder.selected = false;
      }
    }
  });

  if (categoryForm) {
    categoryForm.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(categoryForm);
      const name = formData.get('categoryName')?.toString().trim();
      const imageFile = categoryForm.categoryImage?.files?.[0];

      if (!name || !imageFile) {
        showNotification('Заполните все поля', 'error');
        return;
      }

      try {
        setFormLoading(categoryForm, true, 'Загрузка...');
        const imageUrl = await uploadImage(imageFile, 'categories');
        await addDoc(collection(db, 'categories'), {
          name,
          image: imageUrl,
          createdAt: serverTimestamp()
        });
        categoryForm.reset();
        showNotification('Успешно добавлено');
      } catch (error) {
        console.error('Ошибка при добавлении категории:', error);
        showNotification('Не удалось добавить категорию', 'error');
      } finally {
        setFormLoading(categoryForm, false);
      }
    });
  }

  if (productForm) {
    productForm.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(productForm);
      const productId = formData.get('productId')?.toString().trim();
      const name = formData.get('productName')?.toString().trim();
      const description = formData.get('productDescription')?.toString().trim();
      const priceValue = Number(formData.get('productPrice'));
      const category = formData.get('productCategory')?.toString();
      const imageFile = productForm.productImage?.files?.[0];

      if (!productId || !name || !category || !imageFile || Number.isNaN(priceValue)) {
        showNotification('Проверьте правильность заполнения формы', 'error');
        return;
      }

      try {
        setFormLoading(productForm, true, 'Загрузка...');
        const imageUrl = await uploadImage(imageFile, 'products');
        await setDoc(doc(collection(db, 'products'), productId), {
          id: productId,
          name,
          description: description || '',
          price: priceValue,
          category,
          image: imageUrl,
          createdAt: serverTimestamp()
        });
        productForm.reset();
        if (categorySelect) {
          categorySelect.selectedIndex = 0;
        }
        showNotification('Успешно добавлено');
      } catch (error) {
        console.error('Ошибка при добавлении товара:', error);
        showNotification('Не удалось добавить товар', 'error');
      } finally {
        setFormLoading(productForm, false);
      }
    });
  }
}

function initialize() {
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
