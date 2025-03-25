import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden celestial-button",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-accent to-accent-dark text-white",
        secondary: "bg-transparent border border-secondary text-secondary hover:bg-secondary/10",
        gold: "bg-gradient-to-r from-secondary to-accent-gold text-primary-dark",
        outline: "border border-input bg-transparent hover:bg-accent/10 hover:text-accent",
        ghost: "hover:bg-accent/10 hover:text-accent",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 py-1 text-xs",
        lg: "h-12 px-8 py-3 text-lg",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface CelestialButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const CelestialButton = forwardRef<HTMLButtonElement, CelestialButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

CelestialButton.displayName = "CelestialButton";

export { CelestialButton, buttonVariants };
