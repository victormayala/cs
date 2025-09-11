
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Check, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const pricingTiers = [
  {
    name: "Starter",
    price: "FREE",
    priceSub: "$10/mo per additional store",
    description: "For individuals and small projects just getting started.",
    features: [
      "1 Store",
      "20 Products",
      "7% Transaction Fee",
      "Storefront customization",
    ],
    cta: "Get Started",
    href: "/signup?plan=starter",
  },
  {
    name: "Pro",
    price: "$59",
    frequency: "/month",
    priceSub: "$10/mo per additional store",
    description: "For growing businesses that need more power and support.",
    features: [
      "5 Stores",
      "200 Products per store",
      "5% Transaction Fee",
      "Team management",
      "Priority email support",
    ],
    cta: "Choose Pro",
    href: "/signup?plan=pro",
    popular: true,
  },
  {
    name: "Plus",
    price: "Custom",
    priceSub: "For large-scale operations with custom needs.",
    description: "For large-scale operations with custom needs.",
    features: [
      "Unlimited Stores",
      "Unlimited Products",
      "2% Transaction Fee",
      "Client portal",
      "Priority live support",
    ],
    cta: "Contact Us",
    href: "/contact",
  }
];

const comparisonFeatures = [
    { feature: "Number of stores", starter: "1", pro: "5", plus: "Unlimited" },
    { feature: "Additional stores", starter: "$10/mo", pro: "$10/mo", plus: "Included" },
    { feature: "Number of products", starter: "20", pro: "200/store", plus: "Unlimited" },
    { feature: "Transaction fee", starter: "7%", pro: "5%", plus: "2%" },
    { feature: "Storefront customization", starter: true, pro: true, plus: true },
    { feature: "Automated page generation", starter: true, pro: true, plus: true },
    { feature: "AI-powered product description", starter: false, pro: true, plus: true },
    { feature: "Secure Stripe checkout", starter: true, pro: true, plus: true },
    { feature: "Advance reporting & analytics", starter: false, pro: true, plus: true },
    { feature: "Team management", starter: false, pro: true, plus: true },
    { feature: "Custom domain", starter: false, pro: true, plus: true },
    { feature: "Customizer Studio", starter: false, pro: false, plus: true },
    { feature: "Virtual mockup generator", starter: false, pro: false, plus: true },
    { feature: "Client approval flow", starter: true, pro: true, plus: true },
    { feature: "Client portal", starter: true, pro: true, plus: true },
    { feature: "White label", starter: true, pro: true, plus: true },
    { feature: "Priority email support", starter: false, pro: true, plus: true },
    { feature: "Priority live support", starter: false, pro: false, plus: true },
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
                  <CardTitle className="font-headline text-2xl text-center text-card-foreground">{tier.name}</CardTitle>
                  <CardDescription className="text-center h-10">{tier.description}</CardDescription>
                  <div className="text-center pt-4">
                    <span className="text-5xl font-bold text-foreground">{tier.price}</span>
                    {tier.frequency && <span className="text-muted-foreground">{tier.frequency}</span>}
                  </div>
                  {tier.price !== 'Custom' && <p className="text-center text-sm text-muted-foreground">{tier.priceSub}</p>}
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
                        tier.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-accent text-accent-foreground hover:bg-accent/90',
                        tier.price === 'Custom' && 'bg-background text-foreground border border-input hover:bg-accent'
                    )}
                    variant={tier.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

           {/* Comparison Table Section */}
           <div className="mt-20 md:mt-28">
             <div className="text-center mb-12">
               <h2 className="text-4xl font-bold font-headline text-foreground mb-4">
                Compare Our Plans
               </h2>
               <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                 Choose the plan that best fits your needs.
               </p>
             </div>
             <div className="overflow-x-auto">
               <div className="max-w-5xl mx-auto bg-card rounded-xl border shadow-lg p-2 sm:p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left font-semibold p-4 w-1/3">Plan Features</th>
                        <th className="text-center font-semibold p-4">Starter</th>
                        <th className="text-center font-semibold p-4">Pro</th>
                        <th className="text-center font-semibold p-4">Plus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonFeatures.map((item, index) => (
                        <tr key={index} className="border-t border-border/60 even:bg-muted/20">
                           <td className="p-4 font-medium text-foreground">{item.feature}</td>
                           {(['starter', 'pro', 'plus'] as const).map(plan => (
                             <td key={plan} className="p-4 text-center text-muted-foreground">
                               {typeof item[plan] === 'boolean' ? (
                                  item[plan] ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-destructive mx-auto" />
                                ) : (
                                  <span>{item[plan]}</span>
                                )}
                             </td>
                           ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
             </div>
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
