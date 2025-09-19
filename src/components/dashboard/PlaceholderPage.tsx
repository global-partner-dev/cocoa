import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[hsl(var(--golden-accent))] to-[hsl(var(--golden-light))] rounded-full flex items-center justify-center">
            <Construction className="w-8 h-8 text-[hsl(var(--chocolate-dark))]" />
          </div>
          <CardTitle className="text-[hsl(var(--chocolate-dark))]">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {description}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.placeholderPage.underDevelopment')}
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('dashboard.placeholderPage.backToDashboard')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;