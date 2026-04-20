import Foundation

struct BootstrapResponse: Decodable {
    let user: SessionUser
    let org: OrganizationSummary?
    let dashboard: DashboardPayload?
    let jobs: [JobSummary]
    let workers: [WorkerSummary]
    let calendar: CalendarPayload
    let settings: SettingsPayload?
}

struct SessionUser: Decodable {
    let id: String
    let email: String
    let platformRole: String
    let role: String?
    let permissions: Permissions
    let isOwner: Bool?
}

struct Permissions: Decodable {
    let canViewJobs: Bool
    let canEditJobs: Bool
    let canViewJobFinancials: Bool
    let canViewSchedule: Bool
    let canManageSchedule: Bool
    let canViewCrew: Bool
    let canViewFinancials: Bool
    let canViewActivity: Bool
    let canUploadPhotos: Bool
    let canViewTasks: Bool
    let canCompleteTasks: Bool
    let canManageTasks: Bool
    let canViewChangeOrders: Bool
    let canManageChangeOrders: Bool
    let canViewAllJobs: Bool
}

struct OrganizationSummary: Decodable {
    let name: String
    let logoUrl: String?
    let status: String
    let phone: String?
    let trackWorkerTime: Bool
    let plan: String
    let enabledFeatures: [String]
}

struct DashboardPayload: Decodable {
    let activeCount: Int
    let totalOwed: Double
    let totalBilled: Double
    let totalUnbilled: Double
    let activeJobs: [JobSummary]
    let upcomingDays: [WorkDaySummary]
}

struct JobSummary: Decodable, Identifiable {
    let id: String
    let name: String
    let clientName: String?
    let address: String?
    let status: String
    let percentComplete: Int
    let totalValue: Double?
    let amountPaid: Double?
}

struct WorkerSummary: Decodable, Identifiable {
    let id: String
    let name: String
    let phone: String?
    let role: String?
    let loginEmail: String?
    let roleName: String?
    let roleColor: String?
    let specialties: [Specialty]
}

struct Specialty: Decodable, Identifiable {
    let id: String
    let name: String
}

struct CalendarPayload: Decodable {
    let year: Int
    let month: Int
    let workDays: [WorkDaySummary]
}

struct WorkDaySummary: Decodable, Identifiable {
    let id: String
    let date: String
    let status: String
    let jobId: String
    let jobName: String
    let workers: [WorkerChip]
}

struct WorkerChip: Decodable, Identifiable {
    let id: String
    let name: String
}

struct SettingsPayload: Decodable {
    let companyName: String
    let companyPhone: String?
    let coSeparateInvoice: Bool
    let requireSignature: Bool
    let trackWorkerTime: Bool
    let trackWorkerJob: Bool
}
