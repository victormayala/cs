
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    frequency: "/month",
    description: "Get started and experience basic customization.",
    features: [
      "1 Customizable Product",
      "Basic Customization Tools",
      "Customizer Studio Branding",
      "Community Support",
    ],
    cta: "Start for Free",
    href: "/signup?plan=free",
    ctaVariant: "outline" as const, // Specific for this button
  },
  {
    name: "Starter",
    price: "$29",
    frequency: "/month",
    description: "Perfect for small businesses and startups.",
    features: [
      "10 Customizable Products",
      "All Customization Tools",
      "No Customizer Studio Branding",
      "Email Support",
      "Shopify Integration",
    ],
    cta: "Choose Starter",
    href: "/signup?plan=starter",
    popular: true,
    ctaVariant: "default" as const, // Primary color for popular
  },
  {
    name: "Pro",
    price: "$79",
    frequency: "/month",
    description: "For growing businesses needing more power.",
    features: [
      "50 Customizable Products",
      "Advanced AI Design Features",
      "WooCommerce Integration",
      "Priority Email Support",
      "API Access (Beta)",
    ],
    cta: "Choose Pro",
    href: "/signup?plan=pro",
    ctaVariant: "secondary" as const, // Accent/Secondary color for this
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background"> 
      <MarketingHeader />
      <main className="flex-1 py-12 md:py-20 bg-card"> 
        <div className="container max-w-[1440px] mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for your business. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className={`flex flex-col shadow-lg ${tier.popular ? 'border-primary ring-2 ring-primary' : 'border-border'}`}>
                <CardHeader className="pb-4">
                  {tier.popular && (
                    <div className="text-sm font-semibold text-primary text-center mb-2 bg-primary/10 py-1 px-3 rounded-full w-fit mx-auto">
                      Most Popular
                    </div>
                  )}
                  <CardTitle className="font-headline text-2xl text-center text-card-foreground">{tier.name}</CardTitle>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.frequency}</span>
                  </div>
                  <CardDescription className="text-center h-10">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    asChild 
                    className={`w-full ${
                      tier.ctaVariant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 
                      tier.ctaVariant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : 
                      'bg-transparent text-accent border border-accent hover:bg-accent/10' // Outline Accent
                    }`} 
                    size="lg"
                    variant={tier.ctaVariant === 'outline' ? 'outline' : 'default'} // Set variant for proper styling base
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="text-center mt-16">
            <p className="text-muted-foreground">
              Need more? <Link href="/contact" className="text-accent hover:underline">Contact us for enterprise solutions</Link>.
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
