import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import AboutPage from "@/pages/about-page";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import { Layout } from "./components/layout";
import "@/styles/globals.css";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/auth" component={AuthPage} />
        {/* Protected routes */}
        <ProtectedRoute path="/dashboard" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Dashboard</h1><p className="font-playfair">Your personal dashboard is coming soon.</p></div>} />
        <ProtectedRoute path="/messages" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Messages</h1><p className="font-playfair">Your messages will appear here.</p></div>} />
        {/* Public routes */}
        <Route path="/readers" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Our Readers</h1><p className="font-playfair">Meet our gifted psychic readers.</p></div>} />
        <Route path="/readers/:id" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Reader Profile</h1><p className="font-playfair">Reader details will appear here.</p></div>} />
        <Route path="/live" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Live Streams</h1><p className="font-playfair">Watch live psychic readings and spiritual sessions.</p></div>} />
        <Route path="/live/:id" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Live Stream</h1><p className="font-playfair">This live stream will appear here.</p></div>} />
        <Route path="/shop" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Spiritual Shop</h1><p className="font-playfair">Browse our mystical products and spiritual tools.</p></div>} />
        <Route path="/community" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Community</h1><p className="font-playfair">Connect with fellow spiritual seekers.</p></div>} />
        <Route path="/help" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Help Center</h1><p className="font-playfair">Find answers to your questions.</p></div>} />
        <Route path="/policies" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Policies</h1><p className="font-playfair">Our terms, privacy policy, and guidelines.</p></div>} />
        <Route path="/apply" component={() => <div className="container min-h-screen py-8"><h1 className="text-4xl font-alex mb-6">Apply as Reader</h1><p className="font-playfair">Join our network of gifted psychic readers.</p></div>} />
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
