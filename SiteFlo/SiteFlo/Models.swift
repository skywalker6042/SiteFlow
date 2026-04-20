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

    enum CodingKeys: String, CodingKey {
        case canViewJobs, canEditJobs, canViewJobFinancials, canViewSchedule
        case canManageSchedule, canViewCrew, canViewFinancials, canViewActivity
        case canUploadPhotos, canViewTasks, canCompleteTasks, canManageTasks
        case canViewChangeOrders, canManageChangeOrders, canViewAllJobs
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        canViewJobs            = (try? c.decode(Bool.self, forKey: .canViewJobs))            ?? false
        canEditJobs            = (try? c.decode(Bool.self, forKey: .canEditJobs))            ?? false
        canViewJobFinancials   = (try? c.decode(Bool.self, forKey: .canViewJobFinancials))   ?? false
        canViewSchedule        = (try? c.decode(Bool.self, forKey: .canViewSchedule))        ?? false
        canManageSchedule      = (try? c.decode(Bool.self, forKey: .canManageSchedule))      ?? false
        canViewCrew            = (try? c.decode(Bool.self, forKey: .canViewCrew))            ?? false
        canViewFinancials      = (try? c.decode(Bool.self, forKey: .canViewFinancials))      ?? false
        canViewActivity        = (try? c.decode(Bool.self, forKey: .canViewActivity))        ?? false
        canUploadPhotos        = (try? c.decode(Bool.self, forKey: .canUploadPhotos))        ?? false
        canViewTasks           = (try? c.decode(Bool.self, forKey: .canViewTasks))           ?? false
        canCompleteTasks       = (try? c.decode(Bool.self, forKey: .canCompleteTasks))       ?? false
        canManageTasks         = (try? c.decode(Bool.self, forKey: .canManageTasks))         ?? false
        canViewChangeOrders    = (try? c.decode(Bool.self, forKey: .canViewChangeOrders))    ?? false
        canManageChangeOrders  = (try? c.decode(Bool.self, forKey: .canManageChangeOrders))  ?? false
        canViewAllJobs         = (try? c.decode(Bool.self, forKey: .canViewAllJobs))         ?? false
    }
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
