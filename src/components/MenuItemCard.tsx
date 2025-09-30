import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MenuItem, useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard = ({ item }: MenuItemCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleCardClick = () => {
    setShowQuantitySelector(!showQuantitySelector);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(item, quantity);
    setShowQuantitySelector(false);
    setQuantity(1);
  };


  const decreaseQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity(quantity + 1);
  };

  return (
    <Card className="group bg-card shadow-card hover:shadow-button transition-spring border-border/50">
      <div onClick={handleCardClick} className="cursor-pointer">
        <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
          />
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-coffee-medium transition-smooth">
            {item.name}
          </h3>
          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
            {item.description}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-2xl font-bold text-coffee-medium">
              {item.price} ₸
            </span>
            <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
              {item.category}
            </span>
          </div>
        </CardContent>
      </div>
      
      {showQuantitySelector && (
        <div className="p-4 border-t border-border/20 bg-accent/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Количество:</span>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[2rem] text-center">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={increaseQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            className="w-full bg-gradient-coffee hover:bg-gradient-hero text-primary-foreground shadow-button transition-spring"
            onClick={handleAddToCart}
          >
            Добавить в корзину
          </Button>
        </div>
      )}
    </Card>
  );
};

export default MenuItemCard;