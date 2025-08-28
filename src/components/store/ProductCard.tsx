
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { PublicProduct } from '@/types/product';
import { ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: PublicProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-md hover:shadow-xl transition-shadow duration-300 group">
      <div className="relative aspect-square w-full bg-muted/30 overflow-hidden">
        <Link href={product.productUrl}>
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </Link>
      </div>
      <CardContent className="p-4 flex-grow">
        <h3 className="font-semibold text-lg text-foreground truncate">
          <Link href={product.productUrl} className="hover:text-primary transition-colors">{product.name}</Link>
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          From ${product.price.toFixed(2)}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={product.productUrl}>
            Customize <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
        <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}
