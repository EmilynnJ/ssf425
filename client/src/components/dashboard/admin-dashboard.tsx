import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Reading } from "@shared/schema";
import { Loader2, User as UserIcon, BookOpen, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Helper function to get status color for readings
function getStatusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-500 hover:bg-blue-600";
    case "waiting_payment":
      return "bg-amber-500 hover:bg-amber-600";
    case "payment_completed":
      return "bg-emerald-500 hover:bg-emerald-600";
    case "in_progress":
      return "bg-purple-500 hover:bg-purple-600";
    case "completed":
      return "bg-green-500 hover:bg-green-600";
    case "cancelled":
      return "bg-red-500 hover:bg-red-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
}

// Helper function to format reading status for display
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Interface for reader data with session count
interface ReaderWithStats extends User {
  sessionCount?: number;
  totalEarnings?: number;
}

// Interface for reading data with names
interface ReadingWithNames extends Reading {
  clientName: string;
  readerName: string;
}

export function AdminDashboard() {
  const { toast } = useToast();

  // Fetch all readings
  const {
    data: readings,
    error: readingsError,
    isLoading: readingsLoading,
  } = useQuery<ReadingWithNames[]>({
    queryKey: ["/api/admin/readings"],
    onError: (error) => {
      toast({
        title: "Error fetching readings",
        description: error instanceof Error ? error.message : "Failed to load readings data",
        variant: "destructive",
      });
    },
  });

  // Fetch all readers
  const {
    data: readers,
    error: readersError,
    isLoading: readersLoading,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/readers"],
    onError: (error) => {
      toast({
        title: "Error fetching readers",
        description: error instanceof Error ? error.message : "Failed to load readers data",
        variant: "destructive",
      });
    },
  });

  // Fetch all users
  const {
    data: users,
    error: usersError,
    isLoading: usersLoading,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    onError: (error) => {
      toast({
        title: "Error fetching users",
        description: error instanceof Error ? error.message : "Failed to load users data",
        variant: "destructive",
      });
    },
  });

  // Calculate reader stats
  const readersWithStats: ReaderWithStats[] = readers?.map(reader => {
    const readerReadings = readings?.filter(reading => reading.readerId === reader.id) || [];
    const completedReadings = readerReadings.filter(reading => reading.status === "completed");
    const totalEarnings = completedReadings.reduce((sum, reading) => sum + (reading.totalPrice || 0), 0);
    
    return {
      ...reader,
      sessionCount: readerReadings.length,
      totalEarnings,
    };
  }) || [];

  // Calculate platform stats
  const totalUsers = users?.length || 0;
  const totalReaders = readers?.length || 0;
  const totalClients = users?.filter(user => user.role === "client")?.length || 0;
  const totalReadings = readings?.length || 0;
  const completedReadings = readings?.filter(reading => reading.status === "completed")?.length || 0;
  const totalRevenue = readings?.filter(reading => reading.status === "completed")
    .reduce((sum, reading) => sum + (reading.totalPrice || 0), 0) || 0;

  if (readingsLoading || readersLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (readingsError || readersError || usersError) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg text-red-800">
        <h3 className="text-xl font-semibold mb-2">Error Loading Dashboard</h3>
        <p>There was a problem loading the admin dashboard. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md">
          <CardHeader className="pb-1 px-3 md:px-6 md:pb-2">
            <CardTitle className="text-sm md:text-lg font-medium text-indigo-800">Total Users</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4 md:h-5 md:w-5 text-indigo-500" />
              <span className="text-xl md:text-2xl font-bold text-indigo-800">{totalUsers}</span>
            </div>
            <p className="text-xs md:text-sm text-indigo-600 mt-1">
              {totalClients} Clients, {totalReaders} Readers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 shadow-md">
          <CardHeader className="pb-1 px-3 md:px-6 md:pb-2">
            <CardTitle className="text-sm md:text-lg font-medium text-cyan-800">Total Readings</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-cyan-500" />
              <span className="text-xl md:text-2xl font-bold text-cyan-800">{totalReadings}</span>
            </div>
            <p className="text-xs md:text-sm text-cyan-600 mt-1">
              {completedReadings} Completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 shadow-md">
          <CardHeader className="pb-1 px-3 md:px-6 md:pb-2">
            <CardTitle className="text-sm md:text-lg font-medium text-emerald-800">Platform Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="text-xl md:text-2xl font-bold text-emerald-800">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs md:text-sm text-emerald-600 mt-1">
              From {completedReadings} completed readings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md">
          <CardHeader className="pb-1 px-3 md:px-6 md:pb-2">
            <CardTitle className="text-sm md:text-lg font-medium text-amber-800">Online Readers</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
              <span className="text-xl md:text-2xl font-bold text-amber-800">
                {readers?.filter(reader => reader.isOnline).length || 0}
              </span>
            </div>
            <p className="text-xs md:text-sm text-amber-600 mt-1">
              Of {totalReaders} total readers
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="readings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="readings">All Readings</TabsTrigger>
          <TabsTrigger value="readers">Reader Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="readings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Readings</CardTitle>
              <CardDescription>
                Complete overview of all readings in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>A list of all readings.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead className="hidden md:table-cell">Client</TableHead>
                      <TableHead>Reader</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings && readings.length > 0 ? (
                      readings.map((reading) => (
                        <TableRow key={reading.id}>
                          <TableCell className="font-medium">{reading.id}</TableCell>
                          <TableCell className="hidden md:table-cell">{reading.clientName}</TableCell>
                          <TableCell>{reading.readerName}</TableCell>
                          <TableCell className="hidden sm:table-cell capitalize">{reading.type}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reading.status)}>
                              {formatStatus(reading.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{new Date(reading.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {reading.totalPrice ? formatCurrency(reading.totalPrice) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No readings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reader Performance</CardTitle>
              <CardDescription>
                Performance metrics for all psychic readers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>Reader performance metrics.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Rating</TableHead>
                      <TableHead className="hidden sm:table-cell">Sessions</TableHead>
                      <TableHead className="hidden md:table-cell">Specialties</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readersWithStats && readersWithStats.length > 0 ? (
                      readersWithStats.map((reader) => (
                        <TableRow key={reader.id}>
                          <TableCell className="font-medium">{reader.username}</TableCell>
                          <TableCell>
                            <Badge className={reader.isOnline ? "bg-green-500" : "bg-gray-500"}>
                              {reader.isOnline ? "Online" : "Offline"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {reader.rating ? `${reader.rating.toFixed(1)} ⭐` : "No ratings"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{reader.sessionCount || 0}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {reader.specialties && reader.specialties.length > 0 
                              ? reader.specialties.slice(0, 2).join(", ") + (reader.specialties.length > 2 ? "..." : "")
                              : "None"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(reader.totalEarnings || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No readers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}