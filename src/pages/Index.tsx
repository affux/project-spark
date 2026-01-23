import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Store, Users, ShoppingCart, Shield, Zap, BarChart3, Play, AlertCircle, Sparkles, ChevronRight, Heart, Package, Globe, TrendingUp, Truck, CreditCard, Headphones, Clock, CheckCircle, DollarSign, Layers, X, Check, Flame, Star, Crown, Mail, Lock, Award, BadgeCheck, ShieldCheck, Verified, MessageCircle, Phone, BookOpen, FileText, Video, Lightbulb, ExternalLink } from 'lucide-react';
import { usePublicBrandingSettings } from '@/hooks/usePublicBrandingSettings';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TestimonialsCarousel } from '@/components/landing/TestimonialsCarousel';
import { FloatingCTA } from '@/components/landing/FloatingCTA';
import { AnimatedSection } from '@/components/landing/AnimatedSection';
import { TrustedBrandsSection } from '@/components/landing/TrustedBrands';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import { ContactForm } from '@/components/landing/ContactForm';

// Product images
import wirelessEarbudsImg from '@/assets/products/wireless-earbuds.jpg';
import smartWatchImg from '@/assets/products/smart-watch.jpg';
import ringLightImg from '@/assets/products/ring-light.jpg';
import portableBlenderImg from '@/assets/products/portable-blender.jpg';
import backpackImg from '@/assets/products/backpack.jpg';
import wirelessChargerImg from '@/assets/products/wireless-charger.jpg';
import yogaMatImg from '@/assets/products/yoga-mat.jpg';
import miniProjectorImg from '@/assets/products/mini-projector.jpg';

const Index: React.FC = () => {
  const { settings: brandingSettings, isLoading } = usePublicBrandingSettings();
  const [needsSetup, setNeedsSetup] = useState(false);
  
  const siteName = brandingSettings.site_name;
  const logoUrl = brandingSettings.site_logo_url;
  const landingEnabled = brandingSettings.landing_page_enabled;
  const heroTitle = brandingSettings.landing_page_title;
  const heroSubtitle = brandingSettings.landing_page_subtitle;
  const videoUrl = brandingSettings.landing_video_url;
  const faqItems = brandingSettings.faq_items || [];
  
  // Process footer text with placeholders
  const footerText = (brandingSettings.footer_text || '© {year} {site_name}. All rights reserved.')
    .replace('{year}', new Date().getFullYear().toString())
    .replace('{site_name}', siteName);


  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { data } = await supabase.functions.invoke('check-admin-exists');
        if (data && !data.adminExists) {
          setNeedsSetup(true);
        }
      } catch (error) {
        console.error('Error checking setup:', error);
      }
    };
    checkSetup();
  }, []);

  if (!isLoading && !landingEnabled) {
    return <Navigate to="/login" replace />;
  }

  const renderVideo = (url: string) => {
    if (!url) return null;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        videoId = new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full aspect-video rounded-2xl shadow-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full aspect-video rounded-2xl shadow-2xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    return (
      <video
        src={url}
        controls
        className="w-full aspect-video rounded-2xl shadow-2xl"
      >
        Your browser does not support the video tag.
      </video>
    );
  };

  const features = [
    {
      icon: Globe,
      title: 'Global Supplier Network',
      description: 'Connect with suppliers from Amazon, Alibaba, AliExpress, eBay, and more in one dashboard.',
      gradient: 'from-blue-500/20 to-indigo-500/20'
    },
    {
      icon: Truck,
      title: 'Automated Fulfillment',
      description: 'Orders are automatically routed to suppliers for direct-to-customer shipping.',
      gradient: 'from-violet-500/20 to-purple-500/20'
    },
    {
      icon: TrendingUp,
      title: 'Product Research Tools',
      description: 'Discover trending products with profit margins and competition analysis.',
      gradient: 'from-amber-500/20 to-orange-500/20'
    },
    {
      icon: CreditCard,
      title: 'Secure Payment Processing',
      description: 'Accept payments globally with built-in fraud protection and instant payouts.',
      gradient: 'from-emerald-500/20 to-teal-500/20'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track sales, profits, best-sellers, and supplier performance at a glance.',
      gradient: 'from-cyan-500/20 to-blue-500/20'
    },
    {
      icon: Zap,
      title: 'One-Click Import',
      description: 'Import products from any marketplace with automatic price and inventory sync.',
      gradient: 'from-rose-500/20 to-pink-500/20'
    }
  ];

  const steps = [
    { step: '01', title: 'Find Products', desc: 'Browse trending products from global suppliers like Amazon & Alibaba.' },
    { step: '02', title: 'Import & Price', desc: 'One-click import products to your store with your custom markup.' },
    { step: '03', title: 'Customer Orders', desc: 'Customers purchase from your branded storefront.' },
    { step: '04', title: 'Auto-Fulfill', desc: 'Orders are automatically sent to suppliers who ship directly to customers.' }
  ];

  const benefits = [
    { icon: DollarSign, title: 'Zero Inventory Costs', desc: 'No upfront investment in stock. Pay only when you make a sale.' },
    { icon: Clock, title: 'Save Time', desc: 'Automate repetitive tasks and focus on growing your business.' },
    { icon: Layers, title: 'Unlimited Products', desc: 'Add as many products as you want without storage concerns.' },
    { icon: Headphones, title: '24/7 Support', desc: 'Our team is always here to help you succeed.' },
  ];

  const defaultFaqItems = [
    { id: '1', question: 'What is dropshipping?', answer: 'Dropshipping is a retail fulfillment method where you don\'t keep products in stock. Instead, when you sell a product, you purchase it from a third-party supplier who ships it directly to the customer. This means you never handle the product directly.' },
    { id: '2', question: 'How do I connect with suppliers?', answer: 'Our platform integrates with major marketplaces like Amazon, Alibaba, AliExpress, eBay, and Walmart. You can browse products, compare prices, and import them to your store with one click. We handle the supplier communication and order routing automatically.' },
    { id: '3', question: 'What are the costs involved?', answer: 'There are no upfront inventory costs. You only pay for products when customers place orders. Our platform charges a small transaction fee, and you keep the profit margin you set. No hidden fees or monthly minimums.' },
    { id: '4', question: 'How long does shipping take?', answer: 'Shipping times vary by supplier and destination. Domestic suppliers typically deliver in 3-7 days, while international suppliers may take 7-21 days. We provide tracking for all orders and keep customers informed throughout the process.' },
    { id: '5', question: 'Can I use my own branding?', answer: 'Yes! You get a fully customizable storefront with your brand name, logo, colors, and domain. Many of our suppliers also offer white-label shipping and packaging options so customers see only your brand.' },
    { id: '6', question: 'How do returns and refunds work?', answer: 'Our platform handles returns automatically. When a customer requests a return, we coordinate with the supplier and process refunds through our system. You can set your own return policy and we enforce it with suppliers.' },
  ];

  const displayFaqItems = faqItems.length > 0 ? faqItems : defaultFaqItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Floating CTA */}
      <FloatingCTA />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-lg shadow-accent/25">
                <span className="text-accent-foreground font-bold text-lg">{siteName.charAt(0)}</span>
              </div>
            )}
            <span className="font-bold text-xl text-foreground">{siteName}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/track">
                <Package className="w-4 h-4 mr-2" />
                Track Order
              </Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/login">
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Setup Banner */}
      {needsSetup && (
        <div className="fixed top-[73px] left-0 right-0 z-40 bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <span className="font-medium">Setup Required:</span> No admin account exists. Create one to manage your platform.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 rounded-full">
              <Link to="/setup">
                <Shield className="w-4 h-4 mr-2" />
                Setup Admin
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 hero-gradient overflow-hidden">
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 mesh-gradient" />
        
        {/* Animated shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto text-center relative z-10">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">The Future of Dropshipping</span>
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={100}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-foreground">
              {heroTitle.includes('Dropshipping') ? (
                <>
                  {heroTitle.split('Dropshipping')[0]}
                  <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">Dropshipping</span>
                  {heroTitle.split('Dropshipping')[1]}
                </>
              ) : (
                heroTitle
              )}
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12 text-muted-foreground">
              {heroSubtitle}
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" asChild className="rounded-full bg-gradient-to-r from-accent to-amber-500 hover:from-accent/90 hover:to-amber-500/90 text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30 hover:scale-105">
                <Link to="/login">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" className="rounded-full border-border/50 hover:bg-muted/50 transition-all hover:scale-105">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </AnimatedSection>
          
          {/* Stats */}
          <AnimatedSection delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mt-16">
              {[
                { value: '50K+', label: 'Active Stores' },
                { value: '$1Cr+', label: 'Monthly Sales' },
                { value: '500+', label: 'Suppliers' },
                { value: '99.9%', label: 'Uptime' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* Trusted Brands */}
          <AnimatedSection delay={500}>
            <TrustedBrandsSection />
          </AnimatedSection>
        </div>
      </section>

      {/* Video Section */}
      {videoUrl && (
        <section className="py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                <Play className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Watch & Learn</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                See How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Watch this quick tutorial to understand how our platform can help you build a profitable dropshipping business.
              </p>
            </AnimatedSection>
            
            <AnimatedSection delay={200} className="max-w-4xl mx-auto">
              <div className="relative glow-effect">
                {renderVideo(videoUrl)}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Powerful Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete dropshipping platform with supplier integrations, automated fulfillment, and powerful analytics.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <AnimatedSection 
                key={index} 
                delay={index * 100}
                direction={index % 2 === 0 ? 'up' : 'scale'}
              >
                <div className="feature-card glow-effect group h-full">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <ChevronRight className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Simple Process</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, transparent workflow that benefits everyone.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-accent/20 via-accent/50 to-accent/20" />
            
            {steps.map((item, index) => (
              <AnimatedSection 
                key={index} 
                delay={index * 150}
                className="text-center relative"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border-2 border-accent/30 flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-accent/10">
                  <span className="text-3xl font-bold bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">{item.desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Why Dropshipping Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Why Dropshipping?</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Start Selling Without the Risk
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No inventory, no warehousing, no hassle. Focus on what matters - growing your business.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <AnimatedSection 
                key={index} 
                delay={index * 100}
                direction="up"
              >
                <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <BarChart3 className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Platform Comparison</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Why Choose {siteName}?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how we stack up against traditional e-commerce and other dropshipping platforms.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200} className="overflow-x-auto">
            <div className="min-w-[800px] max-w-5xl mx-auto">
              <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                {/* Header */}
                <div className="grid grid-cols-4 bg-muted/50">
                  <div className="p-6 font-semibold text-foreground border-r border-border/30">Feature</div>
                  <div className="p-6 text-center border-r border-border/30">
                    <div className="font-bold text-foreground text-lg">{siteName}</div>
                    <div className="text-xs text-accent font-medium mt-1">Recommended</div>
                  </div>
                  <div className="p-6 text-center border-r border-border/30">
                    <div className="font-semibold text-muted-foreground">Traditional E-commerce</div>
                  </div>
                  <div className="p-6 text-center">
                    <div className="font-semibold text-muted-foreground">Other Platforms</div>
                  </div>
                </div>
                
                {/* Rows */}
                {[
                  { feature: 'Upfront Inventory Cost', us: 'None', trad: '$50K - $5L+', other: 'None' },
                  { feature: 'Supplier Integration', us: '500+ suppliers', trad: 'Manual sourcing', other: 'Limited' },
                  { feature: 'Order Automation', us: true, trad: false, other: 'Partial' },
                  { feature: 'Profit Margin Control', us: true, trad: true, other: 'Limited' },
                  { feature: 'Real-time Inventory Sync', us: true, trad: false, other: 'Partial' },
                  { feature: 'Multiple Marketplace Support', us: true, trad: false, other: false },
                  { feature: 'White-label Branding', us: true, trad: true, other: 'Extra cost' },
                  { feature: 'Analytics Dashboard', us: 'Advanced', trad: 'Basic', other: 'Basic' },
                  { feature: 'Customer Support', us: '24/7', trad: 'Self-managed', other: 'Business hours' },
                  { feature: 'Setup Time', us: '< 1 hour', trad: 'Weeks/Months', other: '1-3 days' },
                ].map((row, index) => (
                  <div 
                    key={index} 
                    className={`grid grid-cols-4 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'} border-t border-border/30`}
                  >
                    <div className="p-4 font-medium text-foreground border-r border-border/30">{row.feature}</div>
                    <div className="p-4 text-center border-r border-border/30 bg-accent/5">
                      {typeof row.us === 'boolean' ? (
                        row.us ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-foreground font-medium">{row.us}</span>
                      )}
                    </div>
                    <div className="p-4 text-center border-r border-border/30">
                      {typeof row.trad === 'boolean' ? (
                        row.trad ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">{row.trad}</span>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      {typeof row.other === 'boolean' ? (
                        row.other ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">{row.other}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Trending Products Showcase */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Flame className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Trending Now</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              High-Profit Products Ready to Sell
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse trending products with proven demand and healthy profit margins.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Wireless Earbuds Pro',
                image: wirelessEarbudsImg,
                category: 'Electronics',
                supplierPrice: 450,
                suggestedPrice: 1299,
                margin: 65,
                orders: '2.4K',
                trending: true,
              },
              {
                name: 'Smart Fitness Watch',
                image: smartWatchImg,
                category: 'Wearables',
                supplierPrice: 680,
                suggestedPrice: 1999,
                margin: 66,
                orders: '1.8K',
                trending: true,
              },
              {
                name: 'LED Ring Light Kit',
                image: ringLightImg,
                category: 'Photography',
                supplierPrice: 320,
                suggestedPrice: 899,
                margin: 64,
                orders: '3.1K',
                trending: false,
              },
              {
                name: 'Portable Blender',
                image: portableBlenderImg,
                category: 'Kitchen',
                supplierPrice: 280,
                suggestedPrice: 799,
                margin: 65,
                orders: '4.2K',
                trending: true,
              },
              {
                name: 'Minimalist Backpack',
                image: backpackImg,
                category: 'Fashion',
                supplierPrice: 420,
                suggestedPrice: 1199,
                margin: 65,
                orders: '1.5K',
                trending: false,
              },
              {
                name: 'Wireless Charging Pad',
                image: wirelessChargerImg,
                category: 'Electronics',
                supplierPrice: 180,
                suggestedPrice: 549,
                margin: 67,
                orders: '5.8K',
                trending: true,
              },
              {
                name: 'Yoga Mat Premium',
                image: yogaMatImg,
                category: 'Fitness',
                supplierPrice: 350,
                suggestedPrice: 999,
                margin: 65,
                orders: '2.9K',
                trending: false,
              },
              {
                name: 'Mini Projector',
                image: miniProjectorImg,
                category: 'Electronics',
                supplierPrice: 1200,
                suggestedPrice: 3499,
                margin: 66,
                orders: '890',
                trending: true,
              },
            ].map((product, index) => (
              <AnimatedSection 
                key={index} 
                delay={index * 75}
                direction="scale"
              >
                <div className="group relative bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-accent/30 hover:shadow-xl transition-all duration-300">
                  {product.trending && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                      <Flame className="w-3 h-3" />
                      Hot
                    </div>
                  )}
                  
                  {/* Product Image */}
                  <div className="h-40 bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
                    <h3 className="font-semibold text-foreground mb-3 truncate">{product.name}</h3>
                    
                    {/* Pricing */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Supplier Price</span>
                        <span className="text-foreground">${product.supplierPrice}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Suggested Price</span>
                        <span className="font-semibold text-foreground">${product.suggestedPrice}</span>
                      </div>
                    </div>
                    
                    {/* Profit Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Profit</div>
                          <div className="text-sm font-bold text-emerald-500">{product.margin}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Orders</div>
                        <div className="text-sm font-medium text-foreground">{product.orders}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={400} className="text-center mt-12">
            <Button size="lg" asChild className="rounded-full">
              <Link to="/login">
                Browse All Products
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Heart className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Success Stories</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Loved by Dropshippers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our successful store owners have to say about their dropshipping journey.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <TestimonialsCarousel />
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <AlertCircle className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">FAQ</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about starting your dropshipping business.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200} className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {displayFaqItems.map((item) => (
                <AccordionItem 
                  key={item.id} 
                  value={item.id}
                  className="feature-card border rounded-2xl px-6 data-[state=open]:shadow-lg transition-all duration-300"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="text-lg font-semibold text-foreground">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Trusted & Secure</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Business is in Safe Hands
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Industry-leading security and certifications to protect your business and customers.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: Lock, title: 'SSL Secured', desc: '256-bit encryption' },
              { icon: ShieldCheck, title: 'PCI Compliant', desc: 'Payment security' },
              { icon: BadgeCheck, title: 'Verified Business', desc: 'Trusted platform' },
              { icon: Award, title: 'Money Back', desc: '30-day guarantee' },
              { icon: Verified, title: 'GDPR Ready', desc: 'Data protection' },
              { icon: Headphones, title: '24/7 Support', desc: 'Always available' },
            ].map((badge, index) => (
              <AnimatedSection key={index} delay={index * 50} direction="scale">
                <div className="feature-card text-center p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <badge.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{badge.title}</h4>
                  <p className="text-sm text-muted-foreground">{badge.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <AnimatedSection>
            <div className="max-w-4xl mx-auto feature-card p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <Mail className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Stay Updated</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Get Dropshipping Tips & Deals
                </h3>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Join 25,000+ dropshippers receiving weekly tips, trending product alerts, and exclusive supplier deals.
                </p>
                
                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                    />
                  </div>
                  <Button type="submit" className="rounded-full bg-gradient-to-r from-accent to-amber-500 hover:from-accent/90 hover:to-amber-500/90 text-accent-foreground shadow-lg shadow-accent/25 px-8">
                    Subscribe
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
                
                <p className="text-xs text-muted-foreground mt-4">
                  No spam, unsubscribe anytime. By subscribing you agree to our Privacy Policy.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Blog & Resources Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Learn & Grow</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Resources to Help You Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert guides, tutorials, and insights to help you build a profitable dropshipping business.
            </p>
          </AnimatedSection>

          {/* Featured Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: FileText,
                category: 'Beginner Guide',
                title: 'Complete Dropshipping Guide for 2024',
                description: 'Learn everything you need to know about starting a successful dropshipping business from scratch.',
                readTime: '15 min read',
                gradient: 'from-blue-500/20 to-indigo-500/20',
                featured: true
              },
              {
                icon: TrendingUp,
                category: 'Product Research',
                title: 'Finding Winning Products That Sell',
                description: 'Discover how to identify trending products with high profit margins and low competition.',
                readTime: '10 min read',
                gradient: 'from-emerald-500/20 to-teal-500/20',
                featured: false
              },
              {
                icon: Globe,
                category: 'Supplier Guide',
                title: 'Working with International Suppliers',
                description: 'Best practices for vetting suppliers, negotiating prices, and ensuring quality products.',
                readTime: '12 min read',
                gradient: 'from-violet-500/20 to-purple-500/20',
                featured: false
              },
              {
                icon: CreditCard,
                category: 'Pricing Strategy',
                title: 'How to Price Your Products for Maximum Profit',
                description: 'Strategic pricing techniques to maximize your margins while staying competitive.',
                readTime: '8 min read',
                gradient: 'from-amber-500/20 to-orange-500/20',
                featured: false
              },
              {
                icon: Truck,
                category: 'Shipping',
                title: 'Shipping Strategies & Handling Returns',
                description: 'Optimize your shipping process and handle returns professionally to build customer trust.',
                readTime: '9 min read',
                gradient: 'from-rose-500/20 to-pink-500/20',
                featured: false
              },
              {
                icon: BarChart3,
                category: 'Scaling',
                title: 'Scaling Your Store to 6 Figures',
                description: 'Proven strategies to scale your dropshipping business and reach your first $100k in revenue.',
                readTime: '14 min read',
                gradient: 'from-cyan-500/20 to-blue-500/20',
                featured: false
              }
            ].map((resource, index) => (
              <AnimatedSection key={index} delay={index * 100} direction={index % 2 === 0 ? 'up' : 'scale'}>
                <div className="feature-card h-full group cursor-pointer hover:shadow-xl transition-all duration-300">
                  {resource.featured && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold">
                        Popular
                      </span>
                    </div>
                  )}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${resource.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <resource.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <div className="text-sm text-accent font-medium mb-2">{resource.category}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{resource.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {resource.readTime}
                    </span>
                    <span className="text-accent font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read More
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Quick Tips */}
          <AnimatedSection delay={300}>
            <div className="feature-card p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Quick Tips for Success</h3>
                  <p className="text-muted-foreground">Pro tips from successful dropshippers</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { tip: 'Start with a niche market to reduce competition', number: '01' },
                  { tip: 'Always order samples before listing products', number: '02' },
                  { tip: 'Focus on customer service to build loyalty', number: '03' },
                  { tip: 'Test ads with small budgets before scaling', number: '04' }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="text-4xl font-bold text-accent/20">{item.number}</div>
                    <p className="text-foreground font-medium">{item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Video Tutorials */}
          <AnimatedSection delay={400} className="mt-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Video Tutorials</h3>
              <p className="text-muted-foreground">Watch step-by-step guides from our experts</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Getting Started in 10 Minutes', duration: '10:24', views: '125K' },
                { title: 'Product Research Masterclass', duration: '24:15', views: '89K' },
                { title: 'Marketing Your Store', duration: '18:42', views: '67K' }
              ].map((video, index) => (
                <div key={index} className="feature-card p-6 group cursor-pointer hover:shadow-lg transition-all">
                  <div className="relative aspect-video bg-gradient-to-br from-accent/20 to-amber-500/20 rounded-xl mb-4 flex items-center justify-center group-hover:from-accent/30 group-hover:to-amber-500/30 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-background/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-6 h-6 text-accent ml-1" />
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/80 text-xs font-medium text-foreground">
                      {video.duration}
                    </div>
                  </div>
                  <h4 className="font-semibold text-foreground group-hover:text-accent transition-colors">{video.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{video.views} views</p>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* View All Button */}
          <AnimatedSection delay={500} className="text-center mt-12">
            <Button size="lg" variant="outline" className="rounded-full border-border/50 hover:bg-muted/50 transition-all hover:scale-105">
              <BookOpen className="w-5 h-5 mr-2" />
              View All Resources
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Social Proof Counters */}
      <section className="py-24 px-4 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        
        <div className="container mx-auto relative z-10">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Live Stats</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Numbers That Speak
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real-time statistics from our growing community of successful dropshippers.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedCounter
              end={52847}
              suffix="+"
              label="Orders Processed"
              icon={Package}
              description="This month alone"
            />
            <AnimatedCounter
              end={18432}
              suffix="+"
              label="Active Stores"
              icon={Store}
              description="Growing daily"
            />
            <AnimatedCounter
              end={847}
              suffix="+"
              label="Verified Suppliers"
              icon={Globe}
              description="Worldwide network"
            />
            <AnimatedCounter
              end={98}
              suffix="%"
              label="Success Rate"
              icon={TrendingUp}
              description="Customer satisfaction"
            />
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-24 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <AnimatedSection direction="left">
              <div className="lg:sticky lg:top-32">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <MessageCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Get in Touch</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Have Questions?<br />
                  <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">Let's Talk!</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Our team is here to help you succeed in your dropshipping journey. Reach out and we'll get back to you within 24 hours.
                </p>
                
                <div className="space-y-6">
                  {brandingSettings.contact_email && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Email Us</h4>
                        <p className="text-muted-foreground">{brandingSettings.contact_email}</p>
                      </div>
                    </div>
                  )}
                  
                  {brandingSettings.contact_phone && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Call Us</h4>
                        <p className="text-muted-foreground">{brandingSettings.contact_phone}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Live Chat</h4>
                      <p className="text-muted-foreground">Available 24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={200} direction="right">
              <div className="feature-card p-8 md:p-10">
                <ContactForm />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto text-center relative z-10">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Start Today</span>
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={100}>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              Ready to Launch Your<br />
              <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">Dropshipping Empire?</span>
            </h2>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <p className="text-lg max-w-2xl mx-auto mb-10 text-muted-foreground">
              Join thousands of successful dropshippers growing with {siteName}. Start your free trial today - no credit card required.
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <Button size="xl" asChild className="rounded-full bg-gradient-to-r from-accent to-amber-500 hover:from-accent/90 hover:to-amber-500/90 text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30 hover:scale-105">
              <Link to="/login">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50 bg-muted/20">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">{siteName.charAt(0)}</span>
              </div>
            )}
            <span className="font-semibold text-foreground">{siteName}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {footerText}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
