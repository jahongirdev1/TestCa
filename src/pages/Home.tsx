import { useState, useMemo } from 'react';
import { menuItems } from '@/data/menuData';
import CategoryCarousel from '@/components/CategoryCarousel';
import MenuItemCard from '@/components/MenuItemCard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('Всё');

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'Всё') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-8">
          <div className="bg-gradient-hero rounded-2xl p-8 text-primary-foreground shadow-card">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Добро пожаловать в наше кафе
            </h2>
            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Насладитесь изысканными блюдами и атмосферой домашнего уюта
            </p>
          </div>
        </section>

        {/* Category Carousel */}
        <section className="mb-8">
          <CategoryCarousel 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </section>

        {/* Menu Items */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {selectedCategory === 'Всё' ? 'Все блюда' : selectedCategory}
            </h2>
            <span className="text-muted-foreground">
              {filteredItems.length} {filteredItems.length === 1 ? 'блюдо' : 'блюд'}
            </span>
          </div>
          
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                В этой категории пока нет блюд
              </p>
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;