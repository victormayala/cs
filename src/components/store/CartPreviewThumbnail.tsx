"use client";

interface CartPreviewThumbnailProps {
  viewId: string;
  viewName: string;
  url: string;
  productName: string;
  className?: string;
}

export function CartPreviewThumbnail({ viewName, url, productName, className = '' }: CartPreviewThumbnailProps) {
  return (
    <div className={`relative aspect-square w-24 rounded-md overflow-hidden bg-muted/50 border ${className}`}>
      {/* Plain img tag to avoid Next.js Image issues */}
      <img 
        src={url} 
        alt={`${productName} - ${viewName}`}
        className="w-full h-full object-contain"
        loading="lazy"
      />
      {/* View name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 truncate">
        {viewName}
      </div>
    </div>
  );
}