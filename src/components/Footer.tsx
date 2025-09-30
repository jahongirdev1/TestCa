import { MapPin, Phone, Clock, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-coffee text-primary-foreground mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* О нас */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">О нас</h3>
            <p className="text-primary-foreground/90 leading-relaxed mb-3">
              Добро пожаловать в наше уютное кафе! Мы — семейное заведение с богатой историей, 
              где каждый гость становится частью нашей большой семьи.
            </p>
            <p className="text-primary-foreground/90 leading-relaxed">
              Наша кухня объединяет лучшие традиции казахстанской и мировой кулинарии. 
              Мы готовим с душой, используя только свежие, отборные продукты от местных фермеров.
            </p>
          </div>

          {/* Контакты */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Контакты</h3>
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-cappuccino mt-0.5" />
                  <div className="text-primary-foreground/90">
                    <p>г. Алматы, пр. Назарбаева 123</p>
                    <p>ТРЦ "Mega Park", 2-й этаж</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-cappuccino mt-0.5" />
                  <div className="text-primary-foreground/90">
                    <p>+7 (727) 123-45-67</p>
                    <p>+7 (701) 234-56-78</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-cappuccino" />
                  <span className="text-primary-foreground/90">
                    info@nashcafe.kz
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Режим работы */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Режим работы</h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-cappuccino mt-0.5" />
                <div className="text-primary-foreground/90 space-y-2">
                  <div>
                    <p className="font-medium">Будние дни:</p>
                    <p>Понедельник - Пятница: 08:00 - 22:00</p>
                  </div>
                  <div>
                    <p className="font-medium">Выходные:</p>
                    <p>Суббота - Воскресенье: 09:00 - 23:00</p>
                  </div>
                  <p className="text-sm text-primary-foreground/70">
                    Кухня работает до 21:30 в будние дни и до 22:30 в выходные
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-primary-foreground/20 my-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center text-primary-foreground/70">
          <p>&copy; 2024 Наше Кафе. Все права защищены.</p>
          <p className="mt-2 md:mt-0 text-sm">
            Сделано с ❤️ для наших гостей
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;