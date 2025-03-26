import { ReactNode } from "react";
import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/navigation/footer";
import { WebSocketStatus } from "@/components/debug/websocket-status";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // WebSocket context is used by the WebSocketStatus component
  
  return (
    <div className="min-h-screen flex flex-col cosmic-bg">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      
      {/* WebSocket status indicator */}
      <WebSocketStatus />
    </div>
  );
}
