import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Users, Star, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-chocolate.jpg";
import award from "@/assets/award.jpg";
import evaluation from "@/assets/evaluation.jpg";
import quality from "@/assets/quality.jpg";
import recognition from "@/assets/recognition.jpg";

import { useTranslation } from "react-i18next";

const HomePage = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Award,
      title: t("home.features.quality.title"),
      description: t("home.features.quality.description"),
      gradient: "from-violet-500 to-indigo-500",
      ring: "ring-violet-300/40",
      iconColor: "text-white",
      image: quality,
      key: "quality",
    },
    {
      icon: Users,
      title: t("home.features.expert.title"),
      description: t("home.features.expert.description"),
      gradient: "from-emerald-500 to-teal-500",
      ring: "ring-emerald-300/40",
      iconColor: "text-white",
      image: award,
      key: "expert",
    },
    {
      icon: Star,
      title: t("home.features.fair.title"),
      description: t("home.features.fair.description"),
      gradient: "from-amber-500 to-orange-500",
      ring: "ring-amber-300/40",
      iconColor: "text-white",
      image: evaluation,
      key: "fair",
    },
    {
      icon: Trophy,
      title: t("home.features.recognition.title"),
      description: t("home.features.recognition.description"),
      gradient: "from-rose-500 to-pink-500",
      ring: "ring-rose-300/40",
      iconColor: "text-white",
      image: recognition,
      key: "recognition",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--chocolate-dark)_/_0.65)] to-[hsl(var(--chocolate-medium)_/_0.5)]" />

        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-[hsl(var(--chocolate-cream))] mb-8 leading-tight">
            {t("home.hero.titleLine1")}
            <br />
            <span className="text-[hsl(var(--golden-accent))]">{t("home.hero.titleLine2")}</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-[hsl(var(--chocolate-cream)_/_0.95)] mb-12 max-w-4xl mx-auto leading-relaxed">
            {t("home.hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="xl" variant="chocolate">
              <Link to="/register">{t("home.actions.join")}</Link>
            </Button>
            <Button asChild size="xl" variant="golden">
              <Link to="/login">{t("home.actions.login")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[hsl(var(--chocolate-dark))] mb-4">
              {t("home.sectionTitle")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("home.sectionSubtitle")}
            </p>
          </div>

          {/* Modern Feature Cards - grouped with an image per item */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.key || index}
                className="group relative overflow-hidden border-0 bg-gradient-to-b from-white to-white/90 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-0">
                  {/* Image header per feature (taller) */}
                  <div className="relative h-40 w-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 group-hover:from-amber-100 group-hover:to-orange-100 transition-colors" />
                    <img src={feature.image} alt={feature.title} className="h-full w-full object-cover opacity-90 transition-opacity transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  <div className="p-6">
                    {/* Accent shape */}
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.6),transparent_60%)]" />

                    {/* Icon Badge */}
                    <div
                      className={`mx-auto -mt-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} ring-2 ${feature.ring} shadow-sm relative z-[1]`}
                    >
                      <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold tracking-tight text-[hsl(var(--chocolate-dark))] mb-2 text-center">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed text-center">
                      {feature.description}
                    </p>

                    {/* Hover underline accent */}
                    <div className="mx-auto mt-4 h-0.5 w-0 bg-gradient-to-r from-[hsl(var(--golden-accent))] to-amber-500 transition-all duration-300 group-hover:w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-[hsl(var(--chocolate-dark))] to-[hsl(var(--chocolate-medium))]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-[hsl(var(--chocolate-cream))] mb-6">
            {t("home.cta.heading")}
          </h2>
          <p className="text-xl text-[hsl(var(--chocolate-cream)_/_0.9)] mb-8">
            {t("home.cta.subtitle")}
          </p>
          <Button asChild size="xl" variant="golden">
            <Link to="/register">{t("home.cta.getStarted")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;