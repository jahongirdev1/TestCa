import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { menuItems } from '@/data/menuData';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const item = menuItems.find(item => item.id === id);

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Блюдо не найдено</h1>
            <Button onClick={() => navigate('/')}>Вернуться на главную</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(item, quantity);
    toast({
      title: "Добавлено в корзину",
      description: `${item.name} (${quantity} шт.) добавлено в корзину`,
    });
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          className="mb-6 border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Image Section */}
          <div className="aspect-square overflow-hidden rounded-2xl shadow-card">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <span className="text-sm bg-accent text-accent-foreground px-3 py-1 rounded-full">
                {item.category}
              </span>
              <h1 className="text-3xl font-bold text-foreground mt-3">
                {item.name}
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                {item.description}
              </p>
            </div>

            <div className="text-3xl font-bold text-coffee-medium">
              {item.price} ₸
            </div>

            {/* Quantity Selector */}
            <Card className="bg-gradient-cream border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Количество порций</h3>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-2xl font-bold text-foreground w-12 text-center">
                    {quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
                    onClick={incrementQuantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Итого:</span>
                    <span className="font-bold text-coffee-medium">
                      {item.price * quantity} ₸
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full bg-gradient-coffee hover:bg-gradient-hero text-primary-foreground shadow-button transition-spring hover:scale-105"
              onClick={handleAddToCart}
            >
              Добавить в корзину
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetail;