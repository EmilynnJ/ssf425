import { DashboardLayout } from "./dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { Reading, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ReaderDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  
  const { data: readings, isLoading } = useQuery<Reading[]>({
    queryKey: ["/api/readings/reader"],
  });
  
  useEffect(() => {
    if (user) {
      setIsOnline(user.isOnline || false);
    }
  }, [user]);
  
  const handleOnlineToggle = async (checked: boolean) => {
    setIsOnline(checked);
    
    try {
      await apiRequest("PATCH", "/api/readers/status", {
        isOnline: checked
      });
      
      // Invalidate user data to refresh status
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err) {
      console.error("Failed to update online status:", err);
      setIsOnline(!checked); // Revert on failure
    }
  };
  
  // Group readings by status
  const waitingReadings = readings?.filter(
    (r) => r.status === "payment_completed"
  ) || [];
  
  const activeReadings = readings?.filter(
    (r) => r.status === "in_progress"
  ) || [];
  
  const upcomingReadings = readings?.filter(
    (r) => r.status === "scheduled"
  ) || [];
  
  const completedReadings = readings?.filter(
    (r) => r.status === "completed"
  ) || [];
  
  return (
    <DashboardLayout title="Reader Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card className="glow-card">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-lg md:text-xl">Online Status</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="online-status" className="text-sm md:text-base">Available for Readings</Label>
              <Switch 
                id="online-status" 
                checked={isOnline}
                onCheckedChange={handleOnlineToggle}
              />
            </div>
            <div className="mt-2">
              <Badge className={isOnline ? "bg-green-500" : "bg-red-500"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-card">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-lg md:text-xl">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl md:text-3xl font-bold mb-2 gold-gradient">
              {user?.pricing ? formatCurrency(user.pricing / 100) : "$0.00"}/min
            </div>
            <Button variant="outline" size="sm">Update Pricing</Button>
          </CardContent>
        </Card>
        
        <Card className="glow-card sm:col-span-2 md:col-span-1">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-lg md:text-xl">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-1 gap-2 md:gap-2">
              <div className="flex flex-col md:flex-row md:justify-between">
                <span className="text-muted-foreground text-xs md:text-sm">Total Readings:</span>
                <span className="text-sm md:text-base font-medium">{completedReadings.length}</span>
              </div>
              <div className="flex flex-col md:flex-row md:justify-between">
                <span className="text-muted-foreground text-xs md:text-sm">Rating:</span>
                <span className="text-sm md:text-base font-medium">⭐ {user?.rating || "-"}/5</span>
              </div>
              <div className="flex flex-col md:flex-row md:justify-between">
                <span className="text-muted-foreground text-xs md:text-sm">Reviews:</span>
                <span className="text-sm md:text-base font-medium">{user?.reviewCount || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Readings */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Active Sessions</h2>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : activeReadings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeReadings.map((reading) => (
              <ReadingCard key={reading.id} reading={reading} />
            ))}
          </div>
        ) : (
          <Card className="glow-card">
            <CardContent className="pt-6 text-center">
              <p>No active reading sessions.</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Waiting Readings */}
      {waitingReadings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Waiting for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitingReadings.map((reading) => (
              <ReadingCard key={reading.id} reading={reading} actionLabel="Start Session" />
            ))}
          </div>
        </div>
      )}
      
      {/* Upcoming Readings */}
      {upcomingReadings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Upcoming Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingReadings.map((reading) => (
              <ReadingCard key={reading.id} reading={reading} />
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

interface ReadingCardProps {
  reading: Reading;
  actionLabel?: string;
}

function ReadingCard({ reading, actionLabel }: ReadingCardProps) {
  const sessionDate = reading.scheduledFor 
    ? new Date(reading.scheduledFor)
    : reading.createdAt 
      ? new Date(reading.createdAt) 
      : new Date();
  
  return (
    <Card className="glow-card h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <CardTitle className="text-lg break-words">{reading.notes || "General Reading"}</CardTitle>
          <Badge className={`${getStatusColor(reading.status)} whitespace-nowrap`}>
            {reading.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1">
            <span className="text-muted-foreground text-sm">Type:</span>
            <span className="capitalize text-sm text-right">{reading.type}</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <span className="text-muted-foreground text-sm">Date:</span>
            <span className="text-sm text-right">{sessionDate.toLocaleDateString()}</span>
          </div>
          {reading.scheduledFor && (
            <div className="grid grid-cols-2 gap-1">
              <span className="text-muted-foreground text-sm">Time:</span>
              <span className="text-sm text-right">{new Date(reading.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1">
            <span className="text-muted-foreground text-sm">Duration:</span>
            <span className="text-sm text-right">{reading.duration || "-"} min</span>
          </div>
          
          {actionLabel && (
            <Button className="w-full mt-4 bg-accent hover:bg-accent-dark text-white">
              {actionLabel}
            </Button>
          )}
          
          {reading.status === "in_progress" && (
            <Button className="w-full mt-4 bg-purple-500 hover:bg-purple-700 text-white">
              Continue Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string): string {
  const colors = {
    scheduled: "bg-blue-500",
    waiting_payment: "bg-yellow-500",
    payment_completed: "bg-green-500",
    in_progress: "bg-purple-500",
    completed: "bg-green-700",
    cancelled: "bg-red-500",
  };
  
  return colors[status as keyof typeof colors] || "bg-gray-500";
}