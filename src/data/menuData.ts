import { MenuItem } from '@/contexts/CartContext';
import cappuccinoImg from '@/assets/cappuccino.jpg';
import avocadoToastImg from '@/assets/avocado-toast.jpg';
import caesarSaladImg from '@/assets/caesar-salad.jpg';
import margheritaPizzaImg from '@/assets/margherita-pizza.jpg';
import tiramisuImg from '@/assets/tiramisu.jpg';
import chocolateCroissantImg from '@/assets/chocolate-croissant.jpg';
import kidsPancakesImg from '@/assets/kids-pancakes.jpg';
import borschtImg from '@/assets/borscht.jpg';

export const categories = [
  'Всё',
  'Хлебные изделия', 
  'Завтраки',
  'Детское меню',
  'Салаты',
  'Первые блюда',
  'Вторые блюда',
  'Паста',
  'Суши',
  'Пицца',
  'Шашлык',
  'Гарнир и соусы',
  'Ассорти',
  'Банкетные блюда',
  'Бар',
  'Десерты'
];

// Примеры блюд для демонстрации
export const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Капучино классический',
    description: 'Идеальное сочетание эспрессо и молочной пены',
    price: 1200,
    category: 'Бар',
    image: cappuccinoImg
  },
  {
    id: '2',
    name: 'Авокадо тост',
    description: 'Свежий авокадо на хрустящем хлебе с помидорами черри',
    price: 2100,
    category: 'Завтраки',
    image: avocadoToastImg
  },
  {
    id: '3',
    name: 'Цезарь с курицей',
    description: 'Классический салат с курицей гриль, пармезаном и соусом цезарь',
    price: 2900,
    category: 'Салаты',
    image: caesarSaladImg
  },
  {
    id: '4',
    name: 'Маргарита',
    description: 'Традиционная пицца с томатами, моцареллой и базиликом',
    price: 3400,
    category: 'Пицца',
    image: margheritaPizzaImg
  },
  {
    id: '5',
    name: 'Тирамису',
    description: 'Нежный итальянский десерт с маскарпоне и кофе',
    price: 1800,
    category: 'Десерты',
    image: tiramisuImg
  },
  {
    id: '6',
    name: 'Круассан с шоколадом',
    description: 'Французский круассан с тающим шоколадом внутри',
    price: 980,
    category: 'Хлебные изделия',
    image: chocolateCroissantImg
  },
  {
    id: '7',
    name: 'Детские панкейки',
    description: 'Мини панкейки с кленовым сиропом и ягодами',
    price: 1650,
    category: 'Детское меню',
    image: kidsPancakesImg
  },
  {
    id: '8',
    name: 'Борщ украинский',
    description: 'Традиционный борщ со сметаной и зеленью',
    price: 1850,
    category: 'Первые блюда',
    image: borschtImg
  }
];