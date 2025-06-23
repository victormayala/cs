
"use client";

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const faqData = [
  {
    question: "What e-commerce platforms does Customizer Studio support?",
    answer: "Currently, Customizer Studio seamlessly integrates with Shopify and WooCommerce (WordPress). We are actively working on expanding support for other major platforms like BigCommerce, Wix, and Squarespace. Stay tuned for updates!"
  },
  {
    question: "Is there a free trial or a free plan?",
    answer: "Yes! Customizer Studio offers a 'Free' plan that allows you to explore basic customization features for one product. We also typically offer a 14-day free trial for our paid plans so you can experience the full power of Customizer Studio before committing."
  },
  {
    question: "How easy is it to install Customizer Studio on my website?",
    answer: "It's very straightforward! For most platforms, you can simply copy and paste a small JavaScript snippet into your product page template. For Shopify and WooCommerce, we are developing dedicated apps/plugins to make this process even simpler, often just a few clicks."
  },
  {
    question: "Can I customize the look and feel of the customizer tool?",
    answer: "While the core functionality is standardized for a consistent user experience, you will have options to match the customizer's basic color scheme to your brand. More advanced white-labeling and CSS customization options are planned for our higher-tier plans."
  },
  {
    question: "What kind of support do you offer?",
    answer: "We offer community support for our Free plan users. Paid plans include email support, with priority email support and dedicated account management options available for our Pro and Enterprise tiers."
  },
  {
    question: "How are custom orders handled by my store?",
    answer: "When a customer completes a customization, the details of their design (text, uploaded images, chosen options) are passed along with the order to your e-commerce platform. You'll receive this information in the order notes or via a dedicated panel, allowing your fulfillment team to produce the custom item accurately."
  }
];

export default function FaqPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex-1 py-12 md:py-20 bg-card">
        <div className="container max-w-[1440px] mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about Customizer Studio. If you don't find what you're looking for, feel free to contact us.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqData.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b-0 rounded-lg shadow-sm bg-card">
                  <AccordionTrigger className="p-6 text-left font-semibold text-card-foreground hover:no-underline hover:text-accent">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0 text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-4">Can't find the answer you're looking for?</p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
