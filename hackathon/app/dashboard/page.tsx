import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MapContainer } from "@/components/map-container"
import { CreditCard, TrendingUp, MapPin, DollarSign } from "lucide-react"

// Mock data for Nessie API
const mockAccountData = {
  balance: 4250.75,
  accountNumber: "****1234",
  accountType: "Checking",
}

const mockTransactions = [
  { id: 1, merchant: "Whole Foods Market", category: "Groceries", amount: -89.32, date: "2024-01-15" },
  { id: 2, merchant: "Shell Gas Station", category: "Transportation", amount: -45.2, date: "2024-01-14" },
  { id: 3, merchant: "Netflix", category: "Entertainment", amount: -15.99, date: "2024-01-13" },
  { id: 4, merchant: "Starbucks", category: "Food & Dining", amount: -6.75, date: "2024-01-12" },
  { id: 5, merchant: "Amazon", category: "Shopping", amount: -127.84, date: "2024-01-11" },
]

const mockPPPData = {
  currentCity: "New York, NY",
  pppScore: 85,
  topCities: [
    { name: "Bangkok, Thailand", savings: 68, pppScore: 92 },
    { name: "Mexico City, Mexico", savings: 45, pppScore: 88 },
    { name: "Prague, Czech Republic", savings: 38, pppScore: 86 },
  ],
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 mx-auto max-w-screen-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview and PPP insights</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Account Balance Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${mockAccountData.balance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {mockAccountData.accountType} {mockAccountData.accountNumber}
              </p>
            </CardContent>
          </Card>

          {/* PPP Score Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PPP Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockPPPData.pppScore}/100</div>
              <p className="text-xs text-muted-foreground">{mockPPPData.currentCity}</p>
              <Progress value={mockPPPData.pppScore} className="mt-2" />
            </CardContent>
          </Card>

          {/* Current Location Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{mockPPPData.currentCity}</div>
              <p className="text-xs text-muted-foreground">Your purchasing power baseline</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">{transaction.merchant}</p>
                        <p className="text-xs text-muted-foreground">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${Math.abs(transaction.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PPP Map Section */}
          <Card>
            <CardHeader>
              <CardTitle>PPP Score Map</CardTitle>
            </CardHeader>
            <CardContent>
              <MapContainer />
            </CardContent>
          </Card>
        </div>

        {/* City Comparison Cards */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Top Cities for Your Money</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {mockPPPData.topCities.map((city, index) => (
              <Card key={city.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">+{city.savings}%</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{city.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">PPP Score: {city.pppScore}/100</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span>Your money goes {city.savings}% further</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
