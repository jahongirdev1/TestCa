import { Button } from '@/components/ui/button';
import { categories } from '@/data/menuData';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="bg-gradient-cream p-6 rounded-lg shadow-soft">
      <h2 className="text-xl font-semibold text-foreground mb-4">Категории меню</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className={`
              transition-spring hover:scale-105
              ${selectedCategory === category 
                ? 'bg-gradient-coffee text-primary-foreground shadow-button border-coffee-medium' 
                : 'border-coffee-light text-coffee-medium hover:bg-coffee-light/10 hover:border-coffee-medium'
              }
            `}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;