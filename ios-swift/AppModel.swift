import Foundation
import SwiftUI

enum SessionPhase {
    case loading
    case signedOut
    case signedIn
}

enum SiteFlowAPIError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Enter a valid SiteFlo server URL."
        case .invalidResponse:
            return "The server returned an invalid response."
        case .server(let message):
            return message
        }
    }
}

final class SiteFlowAPI {
    static let shared = SiteFlowAPI()

    private let session: URLSession

    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.httpCookieStorage = HTTPCookieStorage.shared
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: configuration)
    }

    func bootstrap(baseURL: URL) async throws -> BootstrapResponse {
        let request = try makeRequest(path: "/api/mobile/bootstrap", baseURL: baseURL)
        let (data, response) = try await session.data(for: request)
        return try decode(BootstrapResponse.self, from: data, response: response)
    }

    func login(baseURL: URL, email: String, password: String) async throws {
        var request = try makeRequest(path: "/api/mobile/login", baseURL: baseURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "email": email,
            "password": password
        ])

        let (data, response) = try await session.data(for: request)
        _ = try decode(EmptyResponse.self, from: data, response: response)
    }

    func logout(baseURL: URL) async {
        guard var request = try? makeRequest(path: "/api/mobile/logout", baseURL: baseURL) else { return }
        request.httpMethod = "POST"
        _ = try? await session.data(for: request)
    }

    private func makeRequest(path: String, baseURL: URL) throws -> URLRequest {
        let trimmed = baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: trimmed + path) else {
            throw SiteFlowAPIError.invalidBaseURL
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return request
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data, response: URLResponse) throws -> T {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SiteFlowAPIError.invalidResponse
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        if (200..<300).contains(httpResponse.statusCode) {
            return try decoder.decode(T.self, from: data)
        }

        if let error = try? decoder.decode(APIErrorResponse.self, from: data) {
            throw SiteFlowAPIError.server(error.error)
        }

        throw SiteFlowAPIError.invalidResponse
    }
}

private struct APIErrorResponse: Decodable {
    let error: String
}

private struct EmptyResponse: Decodable {
    let ok: Bool
}

@MainActor
final class AppModel: ObservableObject {
    @Published var phase: SessionPhase = .loading
    @Published var bootstrap: BootstrapResponse?
    @Published var errorMessage: String?
    @Published var isBusy = false
    @Published var serverURLString: String {
        didSet {
            UserDefaults.standard.set(serverURLString, forKey: Self.serverURLDefaultsKey)
        }
    }

    private static let serverURLDefaultsKey = "siteflow.serverURL"

    init() {
        self.serverURLString = UserDefaults.standard.string(forKey: Self.serverURLDefaultsKey) ?? "http://localhost:3000"
    }

    var serverURL: URL? {
        URL(string: serverURLString.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    var orgName: String {
        bootstrap?.org?.name ?? "SiteFlo"
    }

    var userEmail: String {
        bootstrap?.user.email ?? ""
    }

    func restoreSession() async {
        do {
            try await refresh()
        } catch {
            phase = .signedOut
        }
    }

    func login(email: String, password: String) async {
        isBusy = true
        errorMessage = nil

        defer { isBusy = false }

        do {
            guard let baseURL = serverURL else {
                throw SiteFlowAPIError.invalidBaseURL
            }

            try await SiteFlowAPI.shared.login(baseURL: baseURL, email: email, password: password)
            try await refresh()
        } catch {
            phase = .signedOut
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func refresh() async throws {
        guard let baseURL = serverURL else {
            throw SiteFlowAPIError.invalidBaseURL
        }

        isBusy = true
        defer { isBusy = false }

        do {
            let bootstrap = try await SiteFlowAPI.shared.bootstrap(baseURL: baseURL)
            self.bootstrap = bootstrap
            self.phase = .signedIn
            self.errorMessage = nil
        } catch {
            self.bootstrap = nil
            self.phase = .signedOut
            throw error
        }
    }

    func logout() async {
        guard let baseURL = serverURL else {
            phase = .signedOut
            bootstrap = nil
            return
        }

        await SiteFlowAPI.shared.logout(baseURL: baseURL)
        bootstrap = nil
        phase = .signedOut
        errorMessage = nil
    }
}
