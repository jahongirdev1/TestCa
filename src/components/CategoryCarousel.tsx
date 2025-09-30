import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Category images
import breadImg from '@/assets/categories/bread.jpg';
import breakfastImg from '@/assets/categories/breakfast.jpg';
import kidsImg from '@/assets/categories/kids.jpg';
import saladsImg from '@/assets/categories/salads.jpg';
import soupImg from '@/assets/categories/soup.jpg';
import mainCourseImg from '@/assets/categories/main-course.jpg';
import pastaImg from '@/assets/categories/pasta.jpg';
import sushiImg from '@/assets/categories/sushi.jpg';
import pizzaImg from '@/assets/categories/pizza.jpg';
import grillImg from '@/assets/categories/grill.jpg';
import sidesImg from '@/assets/categories/sides.jpg';
import appetizersImg from '@/assets/categories/appetizers.jpg';
import banquetImg from '@/assets/categories/banquet.jpg';
import barImg from '@/assets/categories/bar.jpg';
import dessertsImg from '@/assets/categories/desserts.jpg';

const categoryData = [
  { name: 'Хлебные изделия', image: breadImg },
  { name: 'Завтраки', image: breakfastImg },
  { name: 'Детское меню', image: kidsImg },
  { name: 'Салаты', image: saladsImg },
  { name: 'Первые блюда', image: soupImg },
  { name: 'Вторые блюда', image: mainCourseImg },
  { name: 'Паста', image: pastaImg },
  { name: 'Суши', image: sushiImg },
  { name: 'Пицца', image: pizzaImg },
  { name: 'Шашлык', image: grillImg },
  { name: 'Гарнир и соусы', image: sidesImg },
  { name: 'Ассорти', image: appetizersImg },
  { name: 'Банкетные блюда', image: banquetImg },
  { name: 'Бар', image: barImg },
  { name: 'Десерты', image: dessertsImg },
];

interface CategoryCarouselProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryCarousel = ({ selectedCategory, onCategoryChange }: CategoryCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollButtons);
      return () => carousel.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = 200;
    const currentScroll = carouselRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    carouselRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  return (
    <div className="w-full py-6 relative">
      {/* Left Arrow */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      )}

      {/* Right Arrow */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}

      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Все категории */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            className={`flex flex-col items-center p-3 h-auto space-y-3 rounded-xl transition-all duration-300 hover:scale-105 ${
              selectedCategory === 'Всё' 
                ? 'bg-gradient-coffee text-primary-foreground shadow-button' 
                : 'hover:bg-accent'
            }`}
            onClick={() => onCategoryChange('Всё')}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-cream flex items-center justify-center text-lg md:text-xl font-bold text-coffee-medium shadow-card border-4 border-white">
              Всё
            </div>
            <span className="text-xs md:text-sm font-medium text-center leading-tight max-w-[80px] whitespace-nowrap">
              Всё меню
            </span>
          </Button>
        </div>

        {/* Категории с изображениями */}
        {categoryData.map((category) => (
          <div key={category.name} className="flex-shrink-0">
            <Button
              variant="ghost"
              className={`flex flex-col items-center p-3 h-auto space-y-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                selectedCategory === category.name 
                  ? 'bg-gradient-coffee text-primary-foreground shadow-button' 
                  : 'hover:bg-accent'
              }`}
              onClick={() => onCategoryChange(category.name)}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shadow-card border-4 border-white relative">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
                {selectedCategory === category.name && (
                  <div className="absolute inset-0 bg-gradient-coffee/20 rounded-full" />
                )}
              </div>
              <span className="text-xs md:text-sm font-medium text-center leading-tight max-w-[80px] whitespace-nowrap">
                {category.name}
              </span>
            </Button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default CategoryCarousel;