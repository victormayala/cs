declare module 'lucide-react' {
  import { ComponentType } from 'react';

  export interface IconProps {
    color?: string;
    size?: number | string;
    strokeWidth?: number;
    className?: string;
  }

  // Define icon components
  export const Loader2: ComponentType<IconProps>;
  export const AlertTriangle: ComponentType<IconProps>;
  export const ShoppingCart: ComponentType<IconProps>;
  export const UploadCloud: ComponentType<IconProps>;
  export const Layers: ComponentType<IconProps>;
  export const Type: ComponentType<IconProps>;
  export const Shapes: ComponentType<IconProps>;
  export const Smile: ComponentType<IconProps>;
  export const Palette: ComponentType<IconProps>;
  export const Gem: ComponentType<IconProps>;
  export const Settings2: ComponentType<IconProps>;
  export const PanelLeftClose: ComponentType<IconProps>;
  export const PanelRightOpen: ComponentType<IconProps>;
  export const PanelRightClose: ComponentType<IconProps>;
  export const PanelLeftOpen: ComponentType<IconProps>;
  export const Ban: ComponentType<IconProps>;
  export const ArrowLeft: ComponentType<IconProps>;
}