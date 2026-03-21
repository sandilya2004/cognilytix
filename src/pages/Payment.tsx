import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, ArrowLeft, CreditCard, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "Pro";
  const price = plan === "Business" ? "₹2,999" : "₹999";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("This is a demo — no payment processed. Enjoy exploring!");
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pricing")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Cognilytix AI</span>
        </div>
      </header>

      <main className="container py-12 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Order Summary */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground mb-1">Order Summary</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Cognilytix AI — {plan} Plan</span>
              <span className="font-semibold text-foreground">{price}/mo</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="font-medium text-foreground">Total due today</span>
              <span className="text-xl font-bold text-primary">{price}</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Payment Details</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="card">Card Number</Label>
                <Input id="card" placeholder="4242 4242 4242 4242" className="mt-1" maxLength={19} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" placeholder="MM/YY" className="mt-1" maxLength={5} required />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" className="mt-1" maxLength={4} required />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full mt-4" size="lg">
                <Lock className="h-4 w-4 mr-2" />
                Pay {price}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>256-bit SSL encryption · Secure checkout · Demo mode</span>
              </div>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
