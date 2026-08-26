import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, BedDouble, Bath, Ruler, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/AuthDialog";
import { formatPrice, formatAddress } from "@/lib/utils";
import { toast } from "sonner";

interface SavedPropertyItem {
  id: string;
  propertyId: string;
  savedAt: string;
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    price: string;
    beds: number;
    baths: string;
    sqft: number;
    images: Array<{ id: string; url: string; label: string }>;
    foundlyScore: number | null;
  };
}

export default function SavedHomes() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [saved, setSaved] = useState<SavedPropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetch("/api/saved", { credentials: "include" })
      .then(r => r.json())
      .then(data => setSaved(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  const handleRemove = async (propertyId: string) => {
    try {
      await fetch(`/api/saved/${propertyId}`, { method: "DELETE", credentials: "include" });
      setSaved(prev => prev.filter(s => s.propertyId !== propertyId));
      toast.success("Removed from saved homes");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-saved-title">Saved Homes</h1>
        </div>

        {authLoading || loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-20 space-y-4">
            <Heart className="h-12 w-12 text-muted-foreground/40 mx-auto" strokeWidth={1.5} />
            <h2 className="text-lg font-medium">Log in to see your saved homes</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Create an account or log in to save properties you're interested in and access them anytime.
            </p>
            <Button onClick={() => setAuthOpen(true)} data-testid="button-login-prompt">Log In</Button>
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Heart className="h-12 w-12 text-muted-foreground/40 mx-auto" strokeWidth={1.5} />
            <h2 className="text-lg font-medium">No saved homes yet</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Browse properties and tap the Save button to keep track of homes you love.
            </p>
            <Link href="/">
              <Button data-testid="button-browse-homes">Browse Homes</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saved.map(item => {
              const p = item.property;
              const heroImage = p.images?.[0]?.url;
              return (
                <div key={item.id} className="group bg-card border border-border/60 rounded-xl overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-saved-${item.propertyId}`}>
                  <div className="relative cursor-pointer" onClick={() => navigate(`/property/${p.id}`)}>
                    {heroImage ? (
                      <img src={heroImage} alt={p.address} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <Heart className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {p.foundlyScore != null && (
                      <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-2 py-1 rounded-md text-xs font-medium">
                        Inzly Score: {p.foundlyScore}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="cursor-pointer" onClick={() => navigate(`/property/${p.id}`)}>
                        <p className="font-semibold text-lg">{formatPrice(p.price)}</p>
                        <div className="flex items-center text-muted-foreground text-xs gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" strokeWidth={1.5} />
                          {formatAddress(p.address, p.city, p.state, p.zip)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(p.id)}
                        data-testid={`button-remove-${item.propertyId}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" strokeWidth={1.5} /> {p.beds} bd</span>
                      <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" strokeWidth={1.5} /> {p.baths} ba</span>
                      <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" strokeWidth={1.5} /> {p.sqft?.toLocaleString()} sqft</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
