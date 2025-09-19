import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Award, User, LogOut, Menu, Globe, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
      director: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
      judge: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
      participant: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
      evaluator: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
    } as const;
    return colors[role as keyof typeof colors] || colors.participant;
  };

  const LanguageSwitcher = ({ isMobile = false }: { isMobile?: boolean }) => {
    const currentLanguage = i18n.language;
    const languages = [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' }
    ];

    const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

    if (isMobile) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
            {t('nav.language')}
          </div>
          {languages.map((lang) => (
            <Button
              key={lang.code}
              variant={currentLanguage === lang.code ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start gap-3"
              onClick={() => i18n.changeLanguage(lang.code)}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
              {currentLanguage === lang.code && (
                <Check className="w-4 h-4 ml-auto" />
              )}
            </Button>
          ))}
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{currentLang.flag}</span>
            <span className="hidden sm:inline text-sm">{currentLang.name}</span>
            <span className="sm:hidden">{currentLang.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {currentLanguage === lang.code && (
                <Check className="w-4 h-4 text-[hsl(var(--primary))]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <nav className="fixed top-0 w-full bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2 hover:opacity-80 transition-[var(--transition-smooth)]"
          >
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--chocolate-dark))] flex items-center justify-center">
              <Award className="w-5 h-5 text-[hsl(var(--chocolate-cream))]" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-[hsl(var(--chocolate-dark))]">
              {t("nav.brand")}
            </span>
          </Link>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switch */}
            <LanguageSwitcher />

            {/* Auth Area */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3">
                  <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {user.name}
                  </span>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <Button onClick={logout} variant="ghost" size="sm" className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.signOut")}</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost">
                  <Link to="/login">{t("nav.signIn")}</Link>
                </Button>
                <Button asChild variant="default">
                  <Link to="/register">{t("nav.join")}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <div className="p-4 space-y-6">
                  {/* Brand small */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[hsl(var(--chocolate-dark))] flex items-center justify-center">
                      <Award className="w-4 h-4 text-[hsl(var(--chocolate-cream))]" />
                    </div>
                    <span className="text-base font-semibold text-[hsl(var(--chocolate-dark))]">
                      {t("nav.brand")}
                    </span>
                  </div>

                  {/* Language Switch */}
                  <LanguageSwitcher isMobile />

                  {/* Auth Area */}
                  {isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">
                          {user.name}
                        </span>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </div>
                      <Button onClick={logout} variant="ghost" className="w-full justify-start gap-2">
                        <LogOut className="w-4 h-4" />
                        {t("nav.signOut")}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <Button asChild variant="ghost">
                        <Link to="/login">{t("nav.signIn")}</Link>
                      </Button>
                      <Button asChild variant="default">
                        <Link to="/register">{t("nav.join")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;