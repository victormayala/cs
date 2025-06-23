
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Palette, ShoppingBag, Zap, Users, Settings2, Edit, BarChart3, ShoppingCart, Layers, Star, CheckCircle, Link2, Lightbulb, Sparkles, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { FaShopify, FaWordpress, FaHtml5 } from 'react-icons/fa';

const FeatureHighlightCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="flex flex-col items-center p-6 text-center bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
    <div className="bg-secondary/10 p-4 rounded-full w-fit mb-6">
      <Icon className="h-10 w-10 text-secondary" />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{description}</p>
  </div>
);

const StepCard = ({ icon: Icon, number, title, description }: { icon: React.ElementType, number: string, title: string, description: string }) => (
  <div className="flex flex-col p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center mb-4">
      <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold mr-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
    </div>
     <div className="flex-shrink-0 mb-4 flex justify-center">
      <Icon className="h-12 w-12 text-secondary" />
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const IntegrationCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="flex flex-col items-center p-8 text-center bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full border">
    <div className="bg-primary/10 p-5 rounded-full w-fit mb-6">
      <Icon className="h-10 w-10 text-primary" />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{description}</p>
  </div>
);

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 text-center bg-gradient-to-b from-background via-primary/5 to-background">
          <div className="container mx-auto px-4">
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-foreground mb-6 leading-tight">
              Craft. Click. <span className="text-primary">Convert.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Customizer Studio empowers e-commerce businesses to offer intuitive product personalization at scale, effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 px-8 py-3 text-base w-full sm:w-auto">
                <Link href="/signup">
                  <span className="flex items-center">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Link>
              </Button>
               <Button asChild size="lg" variant="outline" className="shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 px-8 py-3 text-base w-full sm:w-auto">
                <Link href="/how-it-works">
                  <span className="flex items-center">
                    See How It Works
                  </span>
                </Link>
              </Button>
            </div>
            <div className="mt-16 md:mt-20 max-w-5xl mx-auto">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted/20">
                  <Image 
                      src="/top-hero.png"
                      alt="Interactive product customizer interface example from Customizer Studio"
                      fill
                      className="object-cover"
                      data-ai-hint="product customizer interface"
                      priority
                  />
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-4">
                Seamlessly Integrate With Your Platform
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Customizer Studio works where you work. Effortlessly connect with the world's most popular e-commerce platforms.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <IntegrationCard icon={FaShopify} title="Shopify" description="One-click install with our dedicated Shopify App. Automatic theme injection gets you running in minutes." />
              <IntegrationCard icon={FaWordpress} title="WooCommerce" description="Use our powerful WordPress plugin to embed the customizer on your WooCommerce product pages." />
              <IntegrationCard icon={FaHtml5} title="Custom HTML/JS" description="Embed our customizer anywhere with a simple iframe or JavaScript snippet for full flexibility." />
            </div>
            <div className="text-center mt-12">
                <p className="text-muted-foreground">More integrations for BigCommerce, Wix, and Squarespace are coming soon!</p>
            </div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-4">
                Why Choose Customizer Studio?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Customizer Studio is packed with intuitive features to make product personalization seamless for you and delightful for your customers.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureHighlightCard 
                icon={Zap} 
                title="Seamless Integration" 
                description="Connect with Shopify, WooCommerce, and more in minutes. Simple setup, powerful results for your store." 
              />
              <FeatureHighlightCard 
                icon={Layers} 
                title="Intuitive Design Canvas" 
                description="A user-friendly interface for text, image uploads, clipart, shapes, and live previews of designs." 
              />
              <FeatureHighlightCard 
                icon={Sparkles} 
                title="AI-Powered Assistance" 
                description="Smart AI assists with design ideas, element suggestions, and even background removal for uploads." 
              />
              <FeatureHighlightCard 
                icon={Settings2} 
                title="Granular Product Control" 
                description="Define design areas, manage product views, set up variations, and control every aspect of customization." 
              />
              <FeatureHighlightCard 
                icon={BarChart3} 
                title="Boost Conversions &amp; AOV" 
                description="Personalized products lead to higher engagement, increased Average Order Value, and stronger brand loyalty." 
              />
              <FeatureHighlightCard 
                icon={Users} 
                title="Delight Your Customers" 
                description="Give customers the power to create exactly what they want, leading to higher satisfaction and repeat business." 
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-4">
                Launch in <span className="text-primary">3 Simple Steps</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Launching your personalized product line with Customizer Studio is simpler than you think.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <StepCard
                number="1"
                icon={Link2}
                title="Connect Your Store"
                description="Easily link Customizer Studio to your existing e-commerce platform like Shopify or WooCommerce."
              />
              <StepCard
                number="2"
                icon={Edit}
                title="Configure Products"
                description="Select products, define customizable views, design areas, and set up options using our intuitive tools."
              />
              <StepCard
                number="3"
                icon={ShoppingCart}
                title="Embed &amp; Go Live"
                description="Add the Customizer Studio tool to your product pages and start offering unique personalized items."
              />
            </div>
            <div className="text-center mt-12">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/signup">
                  <span className="flex items-center">
                    Start Customizing Today <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </section>
        

        {/* Value Prop Section */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="lg:w-1/2">
                <div className="w-full rounded-xl overflow-hidden">
                  <Image
                    src="/bottom-hero.png"
                    alt="A collage of customized products created with Customizer Studio"
                    width={1200} 
                    height={750} 
                    className="w-full h-auto object-contain block rounded-xl"
                    data-ai-hint="customized products collage"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-6">
                  Customizer Studio is Not Just a Tool, It's a <span className="text-primary">Growth Engine</span>.
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  Offering product personalization is one of the most effective ways to stand out in a crowded market. Customizer Studio provides an enterprise-grade solution that's accessible to businesses of all sizes.
                </p>
                <ul className="space-y-3 text-muted-foreground mb-8">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-foreground">Increase Engagement:</span> Interactive design keeps customers on your page longer.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-foreground">Reduce Returns:</span> Customers are more satisfied with products they helped create.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-foreground">Command Premium Prices:</span> Personalized items often justify higher price points.</span>
                  </li>
                   <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-foreground">Unlock New Markets:</span> Cater to niche customer demands with highly specific customizations.</span>
                  </li>
                </ul>
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href="/pricing">
                    <span className="flex items-center">
                      Explore Features &amp; Pricing <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">
              Ready to Unleash Personalization?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-10 max-w-xl mx-auto">
              Join hundreds of businesses offering unique, personalized products. Start your journey with Customizer Studio today.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center items-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto text-base px-8 py-3"
                >
                  <Link href="/signup">
                    <span>Start Your Free Trial</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/80 hover:text-primary-foreground/80 w-full sm:w-auto text-base px-8 py-3"
                >
                  <Link href="/pricing">
                    <span>View Pricing Plans</span>
                  </Link>
                </Button>
            </div>
          </div>
        </section>
      </main>
      
      <MarketingFooter />
    </div>
  );
}
