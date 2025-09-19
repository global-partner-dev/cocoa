import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,text-decoration-color,fill,stroke,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        chocolate: "bg-gradient-to-r from-[hsl(var(--chocolate-dark))] to-[hsl(var(--chocolate-medium))] text-[hsl(var(--chocolate-cream))] hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)]",
        golden: "bg-gradient-to-r from-[hsl(var(--golden-accent))] to-[hsl(var(--golden-light))] text-[hsl(var(--chocolate-dark))] hover:shadow-[var(--shadow-golden)] transition-[var(--transition-smooth)] font-semibold",
        hero: "bg-gradient-to-r from-[hsl(var(--golden-accent))] to-[hsl(var(--golden-light))] text-[hsl(var(--chocolate-dark))] hover:scale-105 hover:shadow-[var(--shadow-golden)] transition-[var(--transition-smooth)] font-semibold border-2 border-[hsl(var(--golden-accent))]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);