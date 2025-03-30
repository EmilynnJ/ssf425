import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountBalance } from "@/components/account/account-balance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StarField } from "@/components/ui/star-field";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Clock, History, Calendar, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  
  interface Reading {
    id: number;
    type: 'chat' | 'video' | 'voice';
    status: string;
    duration?: number;
    totalPrice?: number;
    rating?: number;
    completedAt?: string;
    scheduledFor?: string;
    readerName?: string;
  }
  
  // Get user readings history
  const { data: readingHistory = [], isLoading: loadingReadings } = useQuery<Reading[]>({
    queryKey: [`/api/users/${user?.id}/readings`],
    enabled: !!user,
  });
  
  // Get upcoming scheduled readings
  const { data: upcomingReadings = [], isLoading: loadingUpcoming } = useQuery<Reading[]>({
    queryKey: [`/api/users/${user?.id}/readings/upcoming`],
    enabled: !!user,
  });
  
  // Compute some stats for dashboard
  const totalReadings = readingHistory.length;
  const totalMinutes = readingHistory.reduce((acc: number, reading: Reading) => 
    acc + (reading.duration || 0), 0);
  const totalSpent = readingHistory.reduce((acc: number, reading: Reading) => 
    acc + (reading.totalPrice || 0), 0);
  
  return (
    <div className="cosmic-bg min-h-screen relative pb-16">
      <StarField />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">My Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Account Balance Card */}
          <div className="md:col-span-1">
            <AccountBalance />
          </div>
          
          {/* Quick Stats */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Your Reading Stats</CardTitle>
              <CardDescription>Summary of your SoulSeer activity</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-md">
                  <History className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Readings</span>
                  <span className="text-2xl font-bold">{totalReadings}</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-md">
                  <Clock className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Minutes</span>
                  <span className="text-2xl font-bold">{totalMinutes}</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-md">
                  <span className="text-xl font-bold mb-2">$</span>
                  <span className="text-sm text-muted-foreground">Total Spent</span>
                  <span className="text-2xl font-bold">${(totalSpent / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="upcoming" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" /> Upcoming
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="h-4 w-4 mr-2" /> History
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" /> Messages
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {loadingUpcoming ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : upcomingReadings?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingReadings.map((reading) => (
                  <Card key={reading.id} className="glow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)} Reading
                      </CardTitle>
                      <CardDescription>
                        {reading.scheduledFor ? new Date(reading.scheduledFor).toLocaleString() : 'Time not scheduled'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Reader: {reading.readerName}</p>
                      <p>Status: {reading.status.replace('_', ' ')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming readings scheduled</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {loadingReadings ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : readingHistory?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readingHistory.map((reading) => (
                  <Card key={reading.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)} Reading
                      </CardTitle>
                      <CardDescription>
                        {reading.completedAt ? new Date(reading.completedAt).toLocaleString() : 'Completion time not recorded'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Duration: {reading.duration || 0} minutes</p>
                      <p>Total: ${((reading.totalPrice || 0) / 100).toFixed(2)}</p>
                      {reading.rating && (
                        <p>Rating: {Array(reading.rating).fill('★').join('')}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reading history yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Message center coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}