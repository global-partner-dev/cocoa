import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const LoginPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await login(formData.email, formData.password);

      if (success) {
        toast({
          title: t('auth.login.toasts.successTitle'),
          description: t('auth.login.toasts.successDesc'),
        });
        navigate("/dashboard");
      } else {
        toast({
          title: t('auth.login.toasts.failedTitle'),
          description: t('auth.login.toasts.failedDesc'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: t('auth.login.toasts.errorTitle'),
        description: t('auth.login.toasts.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 pt-20 bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--secondary))]">
      <Card className="w-full max-w-md shadow-[var(--shadow-chocolate)]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
            {t('auth.login.title')}
          </CardTitle>
          <CardDescription>
            {t('auth.login.subtitle')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.login.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('auth.login.emailPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('auth.login.passwordPlaceholder')}
                required
              />
            </div>

            <Button type="submit" className="w-full" variant="chocolate" disabled={isSubmitting}>
              {isSubmitting ? t('auth.login.signingIn') : t('auth.login.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.login.noAccount')}{" "}
              <Link to="/register" className="text-[hsl(var(--golden-accent))] hover:underline font-medium">
                {t('auth.login.registerNow')}
              </Link>
            </p>
          </div>


        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;