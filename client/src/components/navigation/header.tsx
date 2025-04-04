import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogOut } from "lucide-react";
import { PATHS } from "@/lib/constants";
import { CelestialButton } from "@/components/ui/celestial-button";
import { useAuth } from "@/hooks/use-auth";
import { CartButton } from "@/components/shop/cart-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: PATHS.HOME, label: "Home" },
  { href: PATHS.ABOUT, label: "About" },
  { href: PATHS.READERS, label: "Readers" },
  { href: PATHS.LIVE, label: "Live" },
  { href: PATHS.SHOP, label: "Shop" },
  { href: PATHS.COMMUNITY, label: "Community" },
  { href: PATHS.MESSAGES, label: "Messages" },
  { href: PATHS.DASHBOARD, label: "Dashboard" },
  { href: PATHS.HELP, label: "Help Center" },
  { href: PATHS.POLICIES, label: "Policies" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  
  return (
    <header className="sticky top-0 z-50 bg-primary-dark/80 backdrop-blur-lg border-b border-accent-gold/30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href={PATHS.HOME} className="flex items-center gap-3">
            <img 
              src="/assets/logos/soulseer_logo.png" 
              alt="SoulSeer Logo" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain glow-effect"
            />
            <span className="text-3xl md:text-4xl font-alex-brush text-accent">SoulSeer</span>
          </Link>
          
          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-light hover:text-accent transition duration-300 font-playfair text-sm xl:text-base ${
                  location === link.href ? "text-accent" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* Action Buttons / User Menu */}
          <div className="flex items-center space-x-3">
            {/* Cart Button */}
            <CartButton />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 focus:outline-none">
                    <Avatar className="h-8 w-8 border border-secondary/50">
                      <AvatarImage src={user.profileImage || ""} />
                      <AvatarFallback className="bg-accent text-white">
                        {user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-light font-playfair">{user.fullName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-cinzel">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={PATHS.DASHBOARD} className="cursor-pointer w-full font-playfair">
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="text-destructive focus:text-destructive cursor-pointer font-playfair"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth" className="hidden lg:block">
                  <CelestialButton variant="secondary" size="sm" className="text-sm">
                    Login
                  </CelestialButton>
                </Link>
                <Link href="/auth" className="hidden lg:block">
                  <CelestialButton className="text-sm">
                    Get Started
                  </CelestialButton>
                </Link>
              </>
            )}
            
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden text-light focus:outline-none"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div 
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen 
              ? 'max-h-[500px] opacity-100 border-t border-accent/20 mt-3' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="py-3 space-y-3 cosmic-bg backdrop-blur-md rounded-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2.5 px-4 text-light hover:text-accent transition duration-300 font-playfair ${
                  location === link.href 
                    ? "text-accent border-l-2 border-accent pl-3" 
                    : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {!user && (
              <div className="flex space-x-3 pt-3 px-4">
                <Link
                  href="/auth"
                  className="flex-1 text-center bg-transparent border border-secondary text-secondary hover:bg-secondary/10 py-2 px-4 rounded-full transition duration-300 celestial-button"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth"
                  className="flex-1 text-center bg-gradient-to-r from-accent to-accent-dark text-white py-2 px-6 rounded-full transition duration-300 celestial-button"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
