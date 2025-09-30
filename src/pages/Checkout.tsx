import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    table: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.table) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Имитация отправки заказа
    setTimeout(() => {
      setIsSubmitting(false);
      clearCart();
      toast({
        title: "Заказ принят!",
        description: "Ваш заказ передан на кухню. Ожидайте подачи!",
      });
      navigate('/');
    }, 2000);
  };

  if (items.length === 0) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          className="mb-6 border-coffee-light text-coffee-medium hover:bg-coffee-light/10"
          onClick={() => navigate('/cart')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к корзине
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Оформление заказа</h1>

        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Order Form */}
          <Card className="bg-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Данные для заказа</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Ваше имя</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Введите ваше имя"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="border-border focus:border-coffee-medium focus:ring-coffee-medium/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">Номер телефона</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="border-border focus:border-coffee-medium focus:ring-coffee-medium/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="table" className="text-foreground">Номер или название стола</Label>
                  <Input
                    id="table"
                    name="table"
                    type="text"
                    placeholder="Например: стол 5 или у окна"
                    value={formData.table}
                    onChange={handleInputChange}
                    className="border-border focus:border-coffee-medium focus:ring-coffee-medium/20"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-coffee hover:bg-gradient-hero text-primary-foreground shadow-button transition-spring hover:scale-105"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      Отправляем заказ...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Подтвердить заказ
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="bg-gradient-cream shadow-card border-border/50 h-fit">
            <CardHeader>
              <CardTitle className="text-foreground">Ваш заказ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <span className="text-foreground font-medium">{item.name}</span>
                      <span className="text-muted-foreground text-sm block">
                        {item.quantity} × {item.price} ₸
                      </span>
                    </div>
                    <span className="text-coffee-medium font-bold">
                      {item.price * item.quantity} ₸
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span className="text-foreground">Итого к оплате:</span>
                  <span className="text-coffee-medium">{getTotalPrice()} ₸</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-accent-foreground">
                  <strong>Способ оплаты:</strong> При получении заказа у стола
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Checkout;