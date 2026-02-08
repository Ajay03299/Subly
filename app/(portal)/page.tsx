import Link from "next/link";
import { Navbar } from "@/components/navbar";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Clock,
  Users,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

        <div className="relative mx-auto max-w-5xl text-center">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
            Manage Subscriptions Effortlessly
          </Badge>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Control Your Subscriptions
            </span>
            <br />
            <span className="text-foreground">In One Place</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Discover, manage, and optimize all your subscriptions from a single
            dashboard. Never overspend again.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/shop">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                Explore Products <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">10K+</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">$5M+</p>
              <p className="text-sm text-muted-foreground">Saved Annually</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">99.9%</p>
              <p className="text-sm text-muted-foreground">Uptime Guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="border-t border-border/40 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-3">
              Features
            </Badge>
            <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
              Everything You Need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Powerful tools designed to simplify subscription management
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Instant access to all your subscriptions with real-time updates",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Enterprise-grade encryption keeps your data safe",
              },
              {
                icon: BarChart3,
                title: "Smart Analytics",
                description: "Detailed insights into your spending patterns",
              },
              {
                icon: Clock,
                title: "Auto Reminders",
                description:
                  "Never miss a renewal date with smart notifications",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Manage subscriptions across your entire team",
              },
              {
                icon: Smile,
                title: "Easy Integration",
                description: "Connect with 500+ popular services instantly",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group border-border/60 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <CardHeader>
                  <feature.icon className="mb-3 h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="border-t border-border/40 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-3">
              Pricing
            </Badge>
            <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Choose the perfect plan for your needs
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "₹299",
                period: "/month",
                description: "Perfect for individuals",
                features: [
                  "Up to 10 subscriptions",
                  "Basic analytics",
                  "Email notifications",
                  "Mobile app access",
                ],
                highlight: false,
              },
              {
                name: "Professional",
                price: "₹999",
                period: "/month",
                description: "For growing teams",
                features: [
                  "Unlimited subscriptions",
                  "Advanced analytics",
                  "Team collaboration",
                  "Priority support",
                  "Custom integrations",
                ],
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                description: "For large organizations",
                features: [
                  "Everything in Professional",
                  "Dedicated account manager",
                  "Custom SLA",
                  "White-label options",
                  "On-premise deployment",
                ],
                highlight: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`relative flex flex-col transition-all ${
                  plan.highlight
                    ? "border-primary/50 bg-gradient-to-b from-primary/5 to-accent/5 shadow-xl"
                    : "border-border/60 bg-card/50"
                }`}
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-4">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.name === "Enterprise"
                      ? "Contact Sales"
                      : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-primary via-primary/80 to-accent/80 px-8 py-16 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground sm:text-5xl">
            Ready to Take Control?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Join thousands of users saving money and time with Subly
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/shop">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Browse Products
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="border-t border-border/40 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-3">
              FAQ
            </Badge>
            <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
              Common Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How do I get started?",
                a: "Simply sign up with your email, connect your subscriptions, and start managing everything from one dashboard.",
              },
              {
                q: "Is my data secure?",
                a: "Yes, we use industry-leading encryption and comply with GDPR, SOC 2, and other security standards.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. Cancel your subscription anytime with no questions asked.",
              },
              {
                q: "Do you offer integrations?",
                a: "Yes, we integrate with 500+ popular services including all major payment providers.",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="border-border/60 bg-card/50 backdrop-blur transition-all hover:border-primary/30"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{item.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="font-semibold text-foreground">Product</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Company</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Follow</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-foreground">
                    GitHub
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Subly — Subscription Management System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
