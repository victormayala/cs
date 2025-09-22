"use client";

interface CustomPreviewImageProps {
    src: string;
    alt: string;
    viewName: string;
}

export function CustomPreviewImage({ src, alt, viewName }: CustomPreviewImageProps) {
    return (
        <div className="relative h-24 w-24 rounded-md overflow-hidden bg-muted/50 border">
            {/* Use standard img tag instead of Next.js Image */}
            <img 
                src={src} 
                alt={alt}
                className="w-full h-full object-contain"
                loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 truncate">
                {viewName}
            </div>
        </div>
    );
}