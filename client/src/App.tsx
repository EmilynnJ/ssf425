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
        <ProtectedRoute path="/dashboard" component={() => <div>Dashboard Page</div>} />
        <ProtectedRoute path="/messages" component={() => <div>Messages Page</div>} />
        {/* Public routes */}
        <Route path="/readers" component={() => <div>Readers Page</div>} />
        <Route path="/readers/:id" component={() => <div>Reader Details Page</div>} />
        <Route path="/live" component={() => <div>Live Page</div>} />
        <Route path="/live/:id" component={() => <div>Live Stream Page</div>} />
        <Route path="/shop" component={() => <div>Shop Page</div>} />
        <Route path="/community" component={() => <div>Community Page</div>} />
        <Route path="/help" component={() => <div>Help Center Page</div>} />
        <Route path="/policies" component={() => <div>Policies Page</div>} />
        <Route path="/apply" component={() => <div>Apply as Reader Page</div>} />
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
