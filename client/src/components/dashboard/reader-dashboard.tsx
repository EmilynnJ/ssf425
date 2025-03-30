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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glow-card">
          <CardHeader>
            <CardTitle>Online Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="online-status">Available for Readings</Label>
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
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 gold-gradient">
              {user?.pricing ? formatCurrency(user.pricing / 100) : "$0.00"}/min
            </div>
            <Button variant="outline" size="sm">Update Pricing</Button>
          </CardContent>
        </Card>
        
        <Card className="glow-card">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Readings:</span>
                <span>{completedReadings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rating:</span>
                <span>⭐ {user?.rating || "-"}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviews:</span>
                <span>{user?.reviewCount || 0}</span>
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
    <Card className="glow-card">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{reading.notes || "General Reading"}</CardTitle>
          <Badge className={getStatusColor(reading.status)}>
            {reading.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="capitalize">{reading.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span>{sessionDate.toLocaleDateString()}</span>
          </div>
          {reading.scheduledFor && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{new Date(reading.scheduledFor).toLocaleTimeString()}</span>
            </div>
          )}
          
          {actionLabel && (
            <Button className="w-full mt-2">
              {actionLabel}
            </Button>
          )}
          
          {reading.status === "in_progress" && (
            <Button className="w-full mt-2">
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