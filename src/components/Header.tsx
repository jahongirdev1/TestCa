import { ShoppingCart, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const totalItems = getTotalItems();

  return (
    <header className="sticky top-0 z-50 bg-gradient-coffee shadow-soft backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <div className="bg-primary-foreground p-2 rounded-lg shadow-button">
              <Coffee className="h-8 w-8 text-coffee-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Уютное Кафе</h1>
              <p className="text-sm text-primary-foreground/80">Вкус домашнего уюта</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="relative bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 transition-smooth"
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;