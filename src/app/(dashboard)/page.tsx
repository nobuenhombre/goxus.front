import { ChartLine, Users, Shield, Calendar } from "@phosphor-icons/react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const stats = [
  {
    title: "Total Users",
    value: "128",
    icon: Users,
    change: "+12 this week",
    iconClass: "text-muted-foreground",
  },
  {
    title: "Active Sessions",
    value: "24",
    icon: ChartLine,
    change: "+3 today",
    iconClass: "text-muted-foreground",
  },
  {
    title: "Roles",
    value: "4",
    icon: Shield,
    change: "Admin, Manager, Editor, Viewer",
    iconClass: "text-muted-foreground",
  },
  {
    title: "Uptime",
    value: "99.9%",
    icon: Calendar,
    change: "Past 30 days",
    iconClass: "text-muted-foreground",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="mb-2 flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`size-4 ${stat.iconClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bottom section: activity + status */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Activity feed coming soon
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Status panel coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
