import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'Fashion Dropshipper',
    avatar: 'PS',
    content: 'This platform transformed my side hustle into a full-time dropshipping business. I source from Alibaba and sell seamlessly. Payouts are always on time!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Rahul Verma',
    role: 'Electronics Store Owner',
    avatar: 'RV',
    content: 'Running my electronics dropshipping store has never been easier. The supplier integration and inventory sync features are game-changers.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Ananya Patel',
    role: 'Home Decor Entrepreneur',
    avatar: 'AP',
    content: 'The automated order fulfillment is amazing! I can manage hundreds of orders without touching inventory. Perfect for my home decor niche.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Vikram Singh',
    role: 'Multi-Niche Dropshipper',
    avatar: 'VS',
    content: 'Started with 5 products from Amazon, now I have 200+ across categories. The analytics help me identify trending products instantly.',
    rating: 4,
  },
  {
    id: 5,
    name: 'Meera Krishnan',
    role: 'Beauty Products Seller',
    avatar: 'MK',
    content: 'From finding suppliers on AliExpress to automated customer notifications - everything is streamlined. My profit margins have doubled!',
    rating: 5,
  },
];

export const TestimonialsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Main testimonial card */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-8 md:p-12 shadow-xl">
        {/* Quote icon */}
        <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Quote className="w-8 h-8 text-accent" />
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center text-2xl font-bold text-accent-foreground shadow-lg shadow-accent/25">
              {testimonials[currentIndex].avatar}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < testimonials[currentIndex].rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Testimonial text */}
            <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6 transition-all duration-500">
              "{testimonials[currentIndex].content}"
            </p>

            {/* Author info */}
            <div>
              <p className="font-semibold text-foreground">{testimonials[currentIndex].name}</p>
              <p className="text-sm text-muted-foreground">{testimonials[currentIndex].role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          className="rounded-full border-border/50 hover:bg-accent/10 hover:border-accent/30"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Dots */}
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-accent w-8'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          className="rounded-full border-border/50 hover:bg-accent/10 hover:border-accent/30"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
