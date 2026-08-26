import { Search, ArrowRight, Eye, DollarSign, MapPin, BedDouble, Bath, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";
import heroImg from "@assets/generated_images/modern_suburban_home_exterior_with_blue_sky.png";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Property } from "@shared/schema";
import { formatPrice, formatAddress } from "@/lib/utils";

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await api.getProperties();
        setProperties(data);
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query && properties.length > 0) {
      setLocation(`/property/${properties[0].id}`);
    }
  };

  const trendingProperties = properties;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative h-[560px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={heroImg} 
              alt="Modern Home" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
          </div>

          <div className="relative z-10 w-full max-w-3xl px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-semibold text-white mb-5 tracking-tight leading-tight">
              Complete Home Intelligence. <br/>Before the Offer.
            </h1>
            <p className="text-base md:text-lg text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed">
              Inzly transforms complex property data into actionable insights. We surface the critical details others miss—potential issues, estimated repairs, and long-term health—so you can advise or buy with absolute certainty.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 max-w-xl mx-auto bg-card p-2 rounded-xl shadow-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <Input 
                  className="pl-10 h-11 text-base border-0 shadow-none focus-visible:ring-0 bg-transparent" 
                  placeholder="Enter an address or ZIP code" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Button type="submit" size="lg" className="h-11 px-6 font-medium" data-testid="button-analyze">
                View Insights
              </Button>
            </form>
            
            <div className="mt-8 flex justify-center gap-8 text-white/70 text-sm">
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" strokeWidth={1.5} /> Detailed reports
              </span>
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" strokeWidth={1.5} /> Cost estimates
              </span>
            </div>
          </div>
        </section>

        {/* Recently Analyzed Section */}
        <section className="py-16 md:py-24 container mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Properties with insights</h2>
              <p className="text-muted-foreground mt-1">Browse homes we've analyzed — tap any listing to see what we found</p>
            </div>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {loading ? (
              <div className="col-span-3 text-center py-16 text-muted-foreground">Loading properties...</div>
            ) : trendingProperties.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-muted-foreground">No properties available yet</div>
            ) : (
              trendingProperties.map((prop) => (
                <Link key={prop.id} href={`/property/${prop.id}`} className="block group" data-testid={`card-property-${prop.id}`}>
                    <Card className="overflow-hidden border-border/50 hover:border-secondary/80 transition-all duration-300 hover:shadow-md bg-card">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <img 
                          src={Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0].url : ''} 
                          alt={prop.address} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" 
                        />
                        {prop.foundlyScore !== null && prop.foundlyScore !== undefined && (
                          <div className="absolute top-3 right-3">
                            <Badge 
                              className={`backdrop-blur-md shadow-sm ${
                                prop.foundlyScore > 80 
                                  ? "bg-secondary/90 text-secondary-foreground" 
                                  : prop.foundlyScore < 50 
                                    ? "bg-destructive/90 text-destructive-foreground" 
                                    : "bg-muted/90 text-foreground"
                              }`}
                              data-testid={`badge-score-${prop.id}`}
                            >
                              Inzly Score: {prop.foundlyScore}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors" data-testid={`text-address-${prop.id}`}>
                              {prop.address}
                            </h3>
                            <p className="text-muted-foreground text-sm">{[prop.city, prop.state].filter(Boolean).join(", ") || "\u00A0"}</p>
                          </div>
                          <div className="text-right pl-4">
                            <div className="font-semibold" data-testid={`text-price-${prop.id}`}>{formatPrice(prop.price)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1.5">
                            <BedDouble className="h-4 w-4" strokeWidth={1.5} /> {prop.beds}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Bath className="h-4 w-4" strokeWidth={1.5} /> {prop.baths}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Ruler className="h-4 w-4" strokeWidth={1.5} /> {prop.sqft?.toLocaleString()} sq ft
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Feature Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-3">What Inzly helps you understand</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                We analyze properties to give you the context you need to make informed decisions
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              <div className="bg-card p-8 rounded-xl border border-border/50 hover:border-secondary/50 transition-colors">
                <div className="h-11 w-11 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-5">
                  <Eye className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Property condition insights</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  We look at listing photos and descriptions to identify signs of wear, deferred maintenance, and potential concerns worth investigating.
                </p>
              </div>
              
              <div className="bg-card p-8 rounded-xl border border-border/50 hover:border-secondary/50 transition-colors">
                <div className="h-11 w-11 bg-[hsl(var(--clay))]/10 rounded-lg flex items-center justify-center text-[hsl(var(--clay))] mb-5">
                  <DollarSign className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Repair cost estimates</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Get realistic estimates for repairs and maintenance based on the home's age, visible condition, and typical costs in the area.
                </p>
              </div>

              <div className="bg-card p-8 rounded-xl border border-border/50 hover:border-secondary/50 transition-colors">
                <div className="h-11 w-11 bg-secondary/20 rounded-lg flex items-center justify-center text-secondary-foreground mb-5">
                  <MapPin className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Location context</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Understand factors beyond the property itself: flood zones, future development plans, and other details that could affect your decision.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
