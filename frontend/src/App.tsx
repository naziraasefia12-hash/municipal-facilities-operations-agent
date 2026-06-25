import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { WorkOrdersPage } from './pages/WorkOrdersPage'
import { NewWorkOrderPage } from './pages/NewWorkOrderPage'
import { WorkOrderDetailPage } from './pages/WorkOrderDetailPage'
import { BuildingsPage } from './pages/BuildingsPage'
import { TeamsPage } from './pages/TeamsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { AgentTestPage } from './pages/AgentTestPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/work-orders/new" element={<NewWorkOrderPage />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
            <Route path="/buildings" element={<BuildingsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/agent-test" element={<AgentTestPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
