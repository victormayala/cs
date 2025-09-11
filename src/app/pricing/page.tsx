
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const pricingTiers = [
  {
    name: "Starter",
    price: "$19",
    frequency: "/month",
    description: "For individuals and small projects getting started.",
    features: [
      "5 Customizable Products",
      "Basic Customization Tools",
      "AI Design Suggestions",
      "Community Support",
    ],
    cta: "Choose Starter",
    href: "/signup?plan=starter",
  },
  {
    name: "Pro",
    price: "$49",
    frequency: "/month",
    description: "For professionals and growing businesses.",
    features: [
      "25 Customizable Products",
      "All Customization Tools",
      "Advanced AI Design Generation",
      "Shopify & WooCommerce Integration",
      "Priority Email Support",
    ],
    cta: "Choose Pro",
    href: "/signup?plan=pro",
    popular: true,
  },
  {
    name: "Plus",
    price: "$99",
    frequency: "/month",
    description: "For businesses scaling their customization offerings.",
    features: [
      "100 Customizable Products",
      "Everything in Pro",
      "API Access (Beta)",
      "Dedicated Account Manager",
    ],
    cta: "Choose Plus",
    href: "/signup?plan=plus",
  }
];

export default function PricingPage() {

  return (
    <div className="flex flex-col min-h-screen bg-background"> 
      <MarketingHeader />
      <main className="flex-1 py-12 md:py-20 bg-muted/20"> 
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
              Find the perfect plan
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with a plan that fits your needs. Upgrade as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className={cn(
                "flex flex-col shadow-lg transition-all duration-300", 
                tier.popular ? 'border-primary ring-2 ring-primary scale-105 bg-card' : 'border-border bg-card/60 hover:bg-card hover:shadow-xl'
              )}>
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
                    className={cn(
                        "w-full",
                        tier.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-accent text-accent-foreground hover:bg-accent/90'
                    )}
                    size="lg"
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="text-center mt-16">
            <p className="text-muted-foreground">
              Need a custom enterprise solution? <Link href="/contact" className="text-primary font-semibold hover:underline">Contact our sales team</Link>.
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
