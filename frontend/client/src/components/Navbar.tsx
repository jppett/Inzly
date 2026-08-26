import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Menu, Heart, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <>
      <nav className="border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-xl tracking-tight text-foreground">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Home className="h-4 w-4" strokeWidth={1.5} />
            </div>
            Inzly
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Homes</Link>
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <div className="h-5 w-px bg-border/60" />
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-user-menu">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.name.split(" ")[0]}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/saved")} className="gap-2 cursor-pointer" data-testid="menu-saved-homes">
                    <Heart className="h-4 w-4" strokeWidth={1.5} />
                    Saved Homes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="gap-2 cursor-pointer text-destructive" data-testid="menu-logout">
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)} data-testid="button-login">Log In</Button>
            )}
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  <Link href="/" className="text-lg font-medium">Homes</Link>
                  <Link href="/" className="text-lg font-medium">About</Link>
                  <hr className="my-2 border-border/60" />
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        {user.name}
                      </div>
                      <Link href="/saved" className="text-lg font-medium flex items-center gap-2">
                        <Heart className="h-4 w-4" strokeWidth={1.5} /> Saved Homes
                      </Link>
                      <Button variant="outline" className="w-full justify-start gap-2 text-destructive" onClick={() => logout()}>
                        <LogOut className="h-4 w-4" strokeWidth={1.5} /> Log Out
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full justify-start" onClick={() => setAuthOpen(true)}>Log In</Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
