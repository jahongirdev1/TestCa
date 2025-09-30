const CATEGORY_DATA = [
  { name: 'Хлебные изделия', image: 'src/assets/categories/bread.jpg' },
  { name: 'Завтраки', image: 'src/assets/categories/breakfast.jpg' },
  { name: 'Детское меню', image: 'src/assets/categories/kids.jpg' },
  { name: 'Салаты', image: 'src/assets/categories/salads.jpg' },
  { name: 'Первые блюда', image: 'src/assets/categories/soup.jpg' },
  { name: 'Вторые блюда', image: 'src/assets/categories/main-course.jpg' },
  { name: 'Паста', image: 'src/assets/categories/pasta.jpg' },
  { name: 'Суши', image: 'src/assets/categories/sushi.jpg' },
  { name: 'Пицца', image: 'src/assets/categories/pizza.jpg' },
  { name: 'Шашлык', image: 'src/assets/categories/grill.jpg' },
  { name: 'Гарнир и соусы', image: 'src/assets/categories/sides.jpg' },
  { name: 'Ассорти', image: 'src/assets/categories/appetizers.jpg' },
  { name: 'Банкетные блюда', image: 'src/assets/categories/banquet.jpg' },
  { name: 'Бар', image: 'src/assets/categories/bar.jpg' },
  { name: 'Десерты', image: 'src/assets/categories/desserts.jpg' }
];

const MENU_ITEMS = [
  {
    id: '1',
    name: 'Капучино классический',
    description: 'Идеальное сочетание эспрессо и молочной пены',
    price: 1200,
    category: 'Бар',
    image: 'src/assets/cappuccino.jpg'
  },
  {
    id: '2',
    name: 'Авокадо тост',
    description: 'Свежий авокадо на хрустящем хлебе с помидорами черри',
    price: 2100,
    category: 'Завтраки',
    image: 'src/assets/avocado-toast.jpg'
  },
  {
    id: '3',
    name: 'Цезарь с курицей',
    description: 'Классический салат с курицей гриль, пармезаном и соусом цезарь',
    price: 2900,
    category: 'Салаты',
    image: 'src/assets/caesar-salad.jpg'
  },
  {
    id: '4',
    name: 'Маргарита',
    description: 'Традиционная пицца с томатами, моцареллой и базиликом',
    price: 3400,
    category: 'Пицца',
    image: 'src/assets/margherita-pizza.jpg'
  },
  {
    id: '5',
    name: 'Тирамису',
    description: 'Нежный итальянский десерт с маскарпоне и кофе',
    price: 1800,
    category: 'Десерты',
    image: 'src/assets/tiramisu.jpg'
  },
  {
    id: '6',
    name: 'Круассан с шоколадом',
    description: 'Французский круассан с тающим шоколадом внутри',
    price: 980,
    category: 'Хлебные изделия',
    image: 'src/assets/chocolate-croissant.jpg'
  },
  {
    id: '7',
    name: 'Детские панкейки',
    description: 'Мини панкейки с кленовым сиропом и ягодами',
    price: 1650,
    category: 'Детское меню',
    image: 'src/assets/kids-pancakes.jpg'
  },
  {
    id: '8',
    name: 'Борщ украинский',
    description: 'Традиционный борщ со сметаной и зеленью',
    price: 1850,
    category: 'Первые блюда',
    image: 'src/assets/borscht.jpg'
  }
];

const CART_STORAGE_KEY = 'cozy-cafe-cart';
let cartItems = loadCart();

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

  const carousel = document.getElementById('categoryCarousel');
  const track = document.getElementById('categoryTrack');
  const leftArrow = document.getElementById('carouselLeft');
  const rightArrow = document.getElementById('carouselRight');
  const menuGrid = document.getElementById('menuGrid');
  const menuTitle = document.getElementById('menuTitle');
  const menuCount = document.getElementById('menuCount');
  const emptyCategory = document.getElementById('emptyCategory');

  function renderCategories() {
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

    CATEGORY_DATA.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `category-button${selectedCategory === category.name ? ' selected' : ''}`;
      button.innerHTML = `
        <span class="category-image">
          <img src="${category.image}" alt="${category.name}">
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

  function renderMenu() {
    const filteredItems = selectedCategory === 'Всё'
      ? MENU_ITEMS
      : MENU_ITEMS.filter(item => item.category === selectedCategory);

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
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="menu-body">
        <h3>${item.name}</h3>
        <p class="menu-description">${item.description}</p>
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
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-info">
          <h3>${item.name}</h3>
          <p>${item.description}</p>
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

function initialize() {
  updateCartCount();
  const page = document.body?.dataset?.page;
  if (page === 'home') {
    initHomePage();
  }
  if (page === 'cart') {
    initCartPage();
  }
}

document.addEventListener('DOMContentLoaded', initialize);
