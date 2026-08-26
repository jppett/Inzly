import { MapPin, Share, Heart, Ruler, BedDouble, Bath, Calendar, AlertOctagon, GraduationCap, Sparkles, MessageCircle, Send, X, Loader2, ChevronLeft, ChevronRight, ChevronDown as ChevronDownIcon, AlertTriangle, CheckCircle, ArrowLeft, Copy, MessageSquare, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IssueCard from "@/components/IssueCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRoute } from "wouter";
import NotFound from "@/pages/not-found";
import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence, motion } from "framer-motion";
import { api, API_BASE_URL } from "@/lib/api";
import type { PropertyWithIssues } from "@/lib/api";
import { cn, formatPrice, formatAddress } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Issue } from "@shared/schema";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/AuthDialog";


function IssueDot({ issue, onClick, isActive, onDismiss }: { issue: Issue; onClick: () => void; isActive: boolean; onDismiss: () => void }) {
  return (
    <Popover open={isActive} onOpenChange={(open) => !open && onDismiss()}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all z-20 cursor-pointer hover:scale-110",
            issue.severity === "critical" ? "bg-destructive text-white" :
            issue.severity === "warning" ? "bg-[hsl(var(--clay))] text-white" :
            issue.severity === "good" ? "bg-secondary text-secondary-foreground" : "bg-muted-foreground text-white",
            isActive ? "ring-4 ring-white/50 scale-125" : "animate-pulse"
          )}
          style={{ 
            left: `${(issue as any).imageLocation.x <= 1 ? (issue as any).imageLocation.x * 100 : (issue as any).imageLocation.x}%`, 
            top: `${(issue as any).imageLocation.y <= 1 ? (issue as any).imageLocation.y * 100 : (issue as any).imageLocation.y}%` 
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden shadow-xl" side="top" align="center">
         <div className={cn("p-3 text-white font-semibold flex justify-between items-center", 
            issue.severity === "critical" ? "bg-destructive" :
            issue.severity === "warning" ? "bg-[hsl(var(--clay))]" :
            issue.severity === "good" ? "bg-secondary text-secondary-foreground" : "bg-muted-foreground"
         )}>
            <span>{issue.title}</span>
            <Badge variant="outline" className="border-white/40 text-white bg-transparent">
              {issue.category}
            </Badge>
         </div>
         <div className="p-4 bg-card">
            <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
            {issue.costEstimate && (
              <div className="text-sm font-semibold">
                Est. Repair: <span className="text-foreground">{issue.costEstimate}</span>
              </div>
            )}
         </div>
      </PopoverContent>
    </Popover>
  );
}

function ImageWithDots({ imageSrc, alt, className, overlayIssues, objectFit = "cover", activeIssueId, setActiveIssueId }: { imageSrc: string; alt: string; className?: string; overlayIssues?: Issue[]; objectFit?: "cover" | "contain"; activeIssueId: string | null; setActiveIssueId: (id: string | null) => void }) {
  const imageIssues = overlayIssues ?? [];

  return (
    <div className={cn("relative group cursor-pointer h-full w-full", className)} onClick={() => setActiveIssueId(null)}>
      <img src={imageSrc} alt={alt} className={cn("w-full h-full transition-transform duration-500 group-hover:scale-105", objectFit === "contain" ? "object-contain" : "object-cover")} />
      
      {imageIssues.map(issue => (
        <IssueDot 
          key={issue.id} 
          issue={issue} 
          isActive={activeIssueId === issue.id}
          onClick={() => setActiveIssueId(activeIssueId === issue.id ? null : issue.id)}
          onDismiss={() => setActiveIssueId(null)}
        />
      ))}

      {imageIssues.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {imageIssues.length} insight{imageIssues.length !== 1 ? 's' : ''} detected
        </div>
      )}
    </div>
  );
}

function formatCategoryName(category: string): string {
  return category
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function CategoryGroupedInsights({ 
  issues, 
  activeIssueId, 
  setActiveIssueId, 
  setCarouselIndex,
  imageIds,
  propertyId,
  onOpenLightbox,
}: { 
  issues: Issue[]; 
  activeIssueId: string | null; 
  setActiveIssueId: (id: string | null) => void; 
  setCarouselIndex: (idx: number) => void; 
  imageIds: string[];
  propertyId: string;
  onOpenLightbox: (photos: string[], filenames: string[], title: string) => void;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const photoMap = Object.fromEntries(imageIds.map((id, idx) => [id, idx]));

  const grouped = issues.reduce<Record<string, Issue[]>>((acc, issue) => {
    const cat = issue.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(issue);
    return acc;
  }, {});

  const sortedCategories = Object.entries(grouped).sort(([, a], [, b]) => {
    const severityWeight = (issues: Issue[]) => 
      issues.reduce((w, i) => w + (i.severity === "critical" ? 10 : i.severity === "warning" ? 5 : 0), 0);
    return severityWeight(b) - severityWeight(a);
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="flex flex-col gap-2">
      {sortedCategories.map(([category, catIssues]) => {
        const criticalCount = catIssues.filter(i => i.severity === "critical").length;
        const warningCount = catIssues.filter(i => i.severity === "warning").length;
        const isExpanded = expandedCategories[category] ?? false;
        const worstSeverity = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info";

        return (
          <div key={category} className="border border-border/50 rounded-xl overflow-hidden bg-card" data-testid={`category-group-${category}`}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              data-testid={`button-toggle-category-${category}`}
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                worstSeverity === "critical" ? "bg-destructive/10 text-destructive" :
                worstSeverity === "warning" ? "bg-[hsl(var(--clay))]/10 text-[hsl(var(--clay))]" :
                "bg-secondary/20 text-secondary"
              )}>
                {worstSeverity === "critical" || worstSeverity === "warning" 
                  ? <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                  : <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{formatCategoryName(category)}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {criticalCount > 0 && (
                    <span className="text-xs text-destructive font-medium">{criticalCount} critical</span>
                  )}
                  {warningCount > 0 && (
                    <span className="text-xs text-[hsl(var(--clay))] font-medium">{warningCount} warning</span>
                  )}
                  <span className="text-xs text-muted-foreground">{catIssues.length} finding{catIssues.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 flex flex-col gap-1">
                    {catIssues.map((issue, idx) => {
                      const hasCarouselLoc = !!issue.imageLocation && photoMap[issue.imageLocation.imageId] !== undefined;
                      const refPhotos = Array.isArray(issue.referencePhotos) ? issue.referencePhotos : [];
                      const hasPhotos = hasCarouselLoc || refPhotos.length > 0;

                      const handleViewPhotos = hasPhotos ? () => {
                        if (hasCarouselLoc) {
                          const photoIdx = photoMap[issue.imageLocation!.imageId];
                          setCarouselIndex(photoIdx);
                          setActiveIssueId(issue.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else if (refPhotos.length > 0) {
                          const urls = refPhotos.map(filename =>
                            `${API_BASE_URL}/properties/${propertyId}/static/${filename}`
                          );
                          onOpenLightbox(urls, refPhotos, issue.title);
                        }
                      } : undefined;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "transition-all duration-300",
                            activeIssueId === issue.id ? "scale-[1.02] ring-2 ring-primary ring-offset-2 rounded-lg" : ""
                          )}
                        >
                          <IssueCard
                            title={issue.title}
                            description={issue.description}
                            severity={issue.severity}
                            category={issue.category}
                            costEstimate={issue.costEstimate ?? undefined}
                            hasPhotos={hasPhotos}
                            onViewPhotos={handleViewPhotos}
                          />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function PropertyDetails() {
  const [, params] = useRoute("/property/:slug");
  const slug = params?.slug || "";
  const [property, setProperty] = useState<PropertyWithIssues | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const [lightbox, setLightbox] = useState<{ photos: string[]; filenames: string[]; title: string; index: number } | null>(null);

  const carouselImageFilenames = (Array.isArray(property?.images) ? property.images : []).reduce<Record<string, string>>((acc, img) => {
    const parts = img.url.split('/');
    const filename = parts[parts.length - 1];
    if (filename) acc[img.id] = filename;
    return acc;
  }, {});
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!slug) return;
      setCarouselIndex(0);
      try {
        const data = await api.getProperty(slug);
        setProperty(data);
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [slug]);

  useEffect(() => {
    if (!property) return;
    fetch(`/api/saved/${property.id}/check`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setIsSaved(d.saved))
      .catch(() => {});
  }, [property?.id, isAuthenticated]);

  const handleToggleSave = async () => {
    if (!property) return;
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }
    try {
      if (isSaved) {
        await fetch(`/api/saved/${property.id}`, { method: "DELETE", credentials: "include" });
        setIsSaved(false);
        toast.success("Removed from saved homes");
      } else {
        await fetch(`/api/saved/${property.id}`, { method: "POST", credentials: "include" });
        setIsSaved(true);
        toast.success("Saved to your homes");
      }
    } catch {
      toast.error("Failed to update saved status");
    }
  };

  const handleAnalyze = async () => {
    if (!property) return;
    setAnalyzing(true);
    try {
      const updated = await api.analyzeProperty(property.id);
      setProperty(updated);
    } catch (error) {
      console.error("Error analyzing property:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!property || !chatQuestion.trim() || chatLoading) return;
    
    setChatLoading(true);
    setChatResponse("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/properties/${property.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: chatQuestion }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setChatResponse(prev => prev + data.content);
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error asking question:", error);
      setChatResponse("Sorry, I couldn't answer that question. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  // Scroll chat to bottom when response updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatResponse]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return <NotFound />;
  }

  const allIssues = property.issues;
  const issues = allIssues.filter(issue => issue.severity === "critical" || issue.severity === "warning");
  const priceHistory = property.priceHistory ?? [];
  const schools = property.schools ?? [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      {/* Property Header */}
      <div className="w-full bg-card border-b border-border/50 sticky top-16 z-40">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3 tracking-tight">
              <button
                onClick={() => window.history.back()}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              {formatPrice(property.price)} <Badge variant="outline" className="text-sm font-normal text-muted-foreground">For Sale</Badge>
            </h1>
            <div className="flex items-center text-muted-foreground text-sm gap-1.5 mt-1">
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              {formatAddress(property.address, property.city, property.state, property.zip)}
            </div>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-share">
                  <Share className="h-4 w-4" strokeWidth={1.5} /> Share
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url).then(() => {
                        toast.success("Link copied to clipboard");
                      }).catch(() => {
                        toast.error("Failed to copy link");
                      });
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm transition-colors"
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  <a
                    href={`sms:?body=${encodeURIComponent(`Check out this property: ${window.location.href} - ${property.address}, ${property.city}, ${property.state}`)}`}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm transition-colors block"
                    data-testid="button-share-text"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Text
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Check out this property`)}&body=${encodeURIComponent(`I found this property you might like:\n\n${property.address}, ${property.city}, ${property.state}\nPrice: $${property.price.toLocaleString()}\n\n${window.location.href}`)}`}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm transition-colors block"
                    data-testid="button-share-email"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleToggleSave} data-testid="button-save">
              <Heart className={cn("h-4 w-4", isSaved && "fill-destructive text-destructive")} strokeWidth={1.5} /> {isSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content Column (Images + Basic Info) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Photo Carousel */}
          {(() => {
            const photos = (Array.isArray(property.images) ? property.images : []).map(img => ({
              src: img.url,
              id: img.id,
              label: img.label,
            }));
            if (photos.length === 0) {
              return (
                <div className="relative rounded-xl overflow-hidden h-[500px] bg-muted flex items-center justify-center" data-testid="photo-carousel">
                  <span className="text-muted-foreground">No photos available</span>
                </div>
              );
            }
            const safeIndex = Math.min(carouselIndex, photos.length - 1);
            return (
              <div className="relative rounded-xl overflow-hidden h-[500px] group/carousel" data-testid="photo-carousel">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={safeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="h-full w-full"
                  >
                    <ImageWithDots
                      imageSrc={photos[safeIndex].src}
                      alt={photos[safeIndex].label}
                      activeIssueId={activeIssueId}
                      setActiveIssueId={setActiveIssueId}
                      overlayIssues={issues.filter(iss => {
                        if (!iss.imageLocation) return false;
                        const imgId = iss.imageLocation.imageId;
                        const photoId = photos[safeIndex].id;
                        const photoFilename = photos[safeIndex].src.split('/').pop() || '';
                        return imgId === photoId || imgId === photoFilename;
                      })}
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="absolute top-4 left-4 pointer-events-none z-30">
                  <Badge className="bg-black/70 text-white backdrop-blur-md border-0">
                    {photos[safeIndex].label} &middot; {safeIndex + 1}/{photos.length}
                  </Badge>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setCarouselIndex((safeIndex - 1 + photos.length) % photos.length); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70"
                  data-testid="button-carousel-prev"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCarouselIndex((safeIndex + 1) % photos.length); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70"
                  data-testid="button-carousel-next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === safeIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                      )}
                      data-testid={`button-carousel-dot-${i}`}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-6 sm:gap-10 py-5 border-y border-border/50">
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="font-semibold text-lg">{property.beds}</span>
              <span className="text-muted-foreground">Beds</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="font-semibold text-lg">{property.baths}</span>
              <span className="text-muted-foreground">Baths</span>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="font-semibold text-lg">{property.sqft.toLocaleString()}</span>
              <span className="text-muted-foreground">Sq Ft</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="font-semibold text-lg">{property.yearBuilt}</span>
              <span className="text-muted-foreground">Built</span>
            </div>
          </div>

          {/* Ask a Question Card */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h4 className="font-semibold text-foreground">Have a question about this home?</h4>
            </div>
            
            {!chatOpen ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask about the inspection insights, estimated costs, or anything else you'd like to understand better.
                </p>
                <Button 
                  className="w-full gap-2" 
                  onClick={() => setChatOpen(true)}
                  data-testid="button-open-chat"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Ask a question
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                {/* Question input */}
                <div className="flex gap-2">
                  <Input
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="e.g., Is the roof issue serious?"
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                    disabled={chatLoading}
                    data-testid="input-chat-question"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleAskQuestion} 
                    disabled={chatLoading || !chatQuestion.trim()}
                    data-testid="button-send-question"
                  >
                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Response area */}
                {(chatResponse || chatLoading) && (
                  <div 
                    ref={chatScrollRef}
                    className="bg-background rounded-lg p-4 max-h-[300px] overflow-y-auto border"
                  >
                    {chatLoading && !chatResponse && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                    {chatResponse && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-chat-response">
                        {chatResponse}
                      </p>
                    )}
                  </div>
                )}

                {/* Suggested questions */}
                {!chatResponse && !chatLoading && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                      {["What are the biggest issues?", "Total repair costs?", "Is this a good investment?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => setChatQuestion(q)}
                          className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                          data-testid={`button-suggested-${q.toLowerCase().replace(/\s+/g, '-').replace(/[?]/g, '')}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear/reset */}
                {chatResponse && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setChatResponse(""); setChatQuestion(""); }}
                    className="w-full text-muted-foreground"
                  >
                    Ask another question
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold mb-3">About this home</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {property.description}
            </p>
          </div>

          {/* Additional Details Tabs */}
          <Tabs defaultValue="features" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-6">
              <TabsTrigger value="features" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-3">Property Features</TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-3">Price History</TabsTrigger>
              <TabsTrigger value="schools" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-3">Schools</TabsTrigger>
            </TabsList>
            
            <TabsContent value="features" className="pt-6 animate-in slide-in-from-bottom-2 duration-300">
              {(() => {
                const f = (property as any).features;
                const hvac = [f?.heating, f?.cooling].filter(Boolean).join(", ") || null;
                const featureRows: Array<{ label: string; value: string }> = [
                  { label: "Type", value: f?.type },
                  { label: "Lot Size", value: f?.lotSize },
                  { label: "Stories", value: f?.stories },
                  { label: "HOA", value: f?.hoaFee },
                  { label: "Roof", value: f?.roofType },
                  { label: "Foundation", value: f?.foundationDetails },
                  { label: "Siding", value: f?.constructionMaterials },
                  { label: "HVAC", value: hvac },
                  { label: "Appliances", value: f?.appliances },
                  { label: "Fireplace", value: f?.fireplaceFeatures },
                  { label: "Windows", value: f?.windowFeatures },
                  { label: "Flooring", value: f?.flooring },
                  { label: "Fencing", value: f?.fencing },
                  { label: "Basement", value: f?.basement },
                  { label: "Parking", value: f?.parking },
                ].filter((row): row is { label: string; value: string } => row.value != null && row.value !== "");
                return featureRows.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                    {featureRows.map(row => (
                      <div key={row.label} className="flex justify-between border-b pb-2" data-testid={`feature-${row.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No feature details available for this property.</p>
                );
              })()}
            </TabsContent>

            <TabsContent value="history" className="pt-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="h-[300px] w-full border rounded-xl p-4">
                <h3 className="font-bold mb-4">Estimated Value History</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={10} 
                      tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(value) => `$${value/1000}k`}
                      tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="schools" className="pt-6 animate-in slide-in-from-bottom-2 duration-300">
               <div className="grid gap-4">
                 {schools.map((school, i) => (
                   <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                     <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                         <GraduationCap className="h-5 w-5" />
                       </div>
                       <div>
                         <h4 className="font-bold">{school.name}</h4>
                         <p className="text-sm text-muted-foreground">{school.type} • Grades {school.grades}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted font-bold text-sm mb-1">
                         {school.rating}
                       </div>
                       <p className="text-xs text-muted-foreground">{school.distance}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </TabsContent>
          </Tabs>

        </div>

        {/* Sidebar Column (The "Inzly" AI Analysis) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Inzly Score Card */}
          <div className="bg-card border border-border/50 rounded-xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <AlertOctagon className="h-32 w-32" strokeWidth={1.5} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Inzly Score</h3>
                {property.foundlyScore !== null && property.foundlyScore !== undefined ? (
                  <Badge variant={property.foundlyScore > 80 ? "default" : property.foundlyScore < 50 ? "destructive" : "secondary"} className="text-base px-3 py-1">
                    {property.foundlyScore}/100
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    Not Analyzed
                  </Badge>
                )}
              </div>
              
              {property.foundlyScore !== null && property.foundlyScore !== undefined ? (
                <>
                  <Progress value={property.foundlyScore} className={cn("h-3 mb-2", property.foundlyScore < 50 && "[&>div]:bg-destructive")} />
                  <p className="text-sm text-muted-foreground mb-6">
                    This property has a <span className={cn("font-medium", property.foundlyScore < 50 ? "text-destructive" : property.foundlyScore > 80 ? "text-secondary" : "text-foreground")}>
                      {property.foundlyScore < 50 ? "higher-than-average concern level" : property.foundlyScore > 80 ? "lower-than-average concern level" : "moderate concern level"}
                    </span> compared to similar homes.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-muted/40 p-3 rounded-lg text-center">
                       <div className={cn("text-2xl font-semibold", property.foundlyScore < 50 ? "text-destructive" : "text-foreground")}>{issues.length}</div>
                       <div className="text-xs text-muted-foreground font-medium">Insights found</div>
                    </div>
                     <div className="bg-muted/40 p-3 rounded-lg text-center">
                       <div className="text-2xl font-semibold text-foreground">
                         {property.foundlyScore < 50 ? "$85k+" : property.foundlyScore > 80 ? "$2k" : "~$22k"}
                       </div>
                       <div className="text-xs text-muted-foreground font-medium">Est. repairs</div>
                    </div>
                  </div>

                  <Button className="w-full gap-2" size="lg" onClick={handleAnalyze} disabled={analyzing} data-testid="button-reanalyze">
                    {analyzing ? "Analyzing..." : "Run analysis again"} <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">
                    This property hasn't been analyzed yet. Run an analysis to see potential concerns, estimated repair costs, and other details worth knowing.
                  </p>
                  <Button className="w-full gap-2" size="lg" onClick={handleAnalyze} disabled={analyzing} data-testid="button-analyze">
                    {analyzing ? "Analyzing..." : "Analyze this property"} <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Analysis Feed */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
              Property insights
            </h3>
            
            <ScrollArea className="h-[600px] pr-4">
              {issues.length > 0 ? (
                <CategoryGroupedInsights
                  issues={issues}
                  activeIssueId={activeIssueId}
                  setActiveIssueId={setActiveIssueId}
                  setCarouselIndex={setCarouselIndex}
                  imageIds={(Array.isArray(property.images) ? property.images : []).map(img => img.id)}
                  propertyId={property.id}
                  onOpenLightbox={(photos, filenames, title) => setLightbox({ photos, filenames, title, index: 0 })}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No insights yet. Run an analysis to see what we find.
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Upsell / CTA */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-5">
            <h4 className="font-semibold text-foreground mb-2">Considering this property?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              These insights can help guide your inspection. We recommend having a licensed inspector verify any concerns in person.
            </p>
            <Button variant="outline" className="w-full">Find a local inspector</Button>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
            data-testid="lightbox-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
                <span className="text-white/90 text-sm font-medium truncate pr-4">
                  {lightbox.title} &middot; {lightbox.index + 1}/{lightbox.photos.length}
                </span>
                <button
                  onClick={() => setLightbox(null)}
                  className="text-white/70 hover:text-white transition-colors p-1"
                  data-testid="button-close-lightbox"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-black max-h-[75vh]" data-testid="lightbox-image">
                <ImageWithDots
                  imageSrc={lightbox.photos[lightbox.index]}
                  alt={lightbox.title}
                  objectFit="contain"
                  activeIssueId={activeIssueId}
                  setActiveIssueId={setActiveIssueId}
                  overlayIssues={issues.filter(iss => {
                    if (!iss.imageLocation) return false;
                    const currentFilename = lightbox.filenames[lightbox.index];
                    const issueImageId = iss.imageLocation.imageId;
                    const issueCarouselFilename = carouselImageFilenames[issueImageId];
                    return currentFilename === issueCarouselFilename || currentFilename === issueImageId;
                  })}
                />
              </div>

              {lightbox.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length } : null)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    data-testid="button-lightbox-prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    data-testid="button-lightbox-next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="flex gap-2 justify-center mt-3">
                    {lightbox.photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setLightbox(prev => prev ? { ...prev, index: i } : null)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          i === lightbox.index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                        )}
                        data-testid={`button-lightbox-dot-${i}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
