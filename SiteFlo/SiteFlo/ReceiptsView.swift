import SwiftUI

struct ReceiptSummary: Decodable, Identifiable {
    let id: String
    let jobId: String?
    let jobName: String?
    let vendor: String?
    let date: String?
    let total: Double?
    let category: String
    let description: String?
    let notes: String?
    let imagePath: String?
}

struct ReceiptsView: View {
    @Environment(AppModel.self) private var appModel

    @State private var receipts: [ReceiptSummary] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                if isLoading && receipts.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                } else if receipts.isEmpty {
                    ContentUnavailableView(
                        "No Receipts",
                        systemImage: "receipt",
                        description: Text("Receipts will show up here once they are added.")
                    )
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(receipts) { receipt in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(receipt.vendor ?? receipt.description ?? "Receipt")
                                    .font(.headline)
                                Spacer()
                                if let total = receipt.total {
                                    Text(formatCurrency(total))
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(SiteFlowPalette.teal)
                                }
                            }

                            HStack(spacing: 8) {
                                Text(receipt.category)
                                if let jobName = receipt.jobName, !jobName.isEmpty {
                                    Text("• \(jobName)")
                                }
                                if let date = receipt.date {
                                    Text("• \(date)")
                                }
                            }
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(SiteFlowPalette.red)
                        .listRowBackground(Color.clear)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Receipts")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await load()
            }
        }
        .task { @MainActor in
            await load()
        }
    }

    private func load() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            var request = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/receipts"))
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw SiteFlowAPIError.invalidResponse
            }
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            receipts = try decoder.decode([ReceiptSummary].self, from: data)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
