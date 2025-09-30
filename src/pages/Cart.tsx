import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/Header';

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    updateQuantity(id, newQuantity);
  };

  const handleRemove = (id: string) => {
    removeFromCart(id);
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    // Имитация обработки
    setTimeout(() => {
      setIsProcessing(false);
      navigate('/checkout');
    }, 500);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button
            variant="outline"
            className="mb-6 border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к меню
          </Button>

          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-4">Корзина пуста</h1>
            <p className="text-muted-foreground mb-8">
              Добавьте блюда из меню, чтобы сделать заказ
            </p>
            <Button
              className="bg-gradient-coffee hover:bg-gradient-hero text-primary-foreground"
              onClick={() => navigate('/')}
            >
              Перейти к меню
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          className="mb-6 border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Продолжить выбор
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Ваш заказ</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-card shadow-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                      <div className="text-coffee-medium font-bold mt-2">{item.price} ₸</div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      <span className="font-bold text-foreground w-8 text-center">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-cream shadow-card border-border/50 sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Итого к оплате</h2>
                
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-foreground font-medium">
                        {item.price * item.quantity} ₸
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-foreground">Общая сумма:</span>
                    <span className="text-coffee-medium">{getTotalPrice()} ₸</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <Button
                  size="lg"
                  className="w-full bg-gradient-coffee hover:bg-gradient-hero text-primary-foreground shadow-button transition-spring hover:scale-105"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Обработка...' : 'Оформить заказ'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cart;