import SwiftUI

enum SiteFlowPalette {
    static let ink = Color(red: 17 / 255, green: 24 / 255, blue: 39 / 255)
    static let slate = Color(red: 107 / 255, green: 114 / 255, blue: 128 / 255)
    static let border = Color(red: 229 / 255, green: 231 / 255, blue: 235 / 255)
    static let background = Color(red: 249 / 255, green: 250 / 255, blue: 251 / 255)
    static let card = Color.white
    static let teal = Color(red: 20 / 255, green: 184 / 255, blue: 166 / 255)
    static let tealSoft = Color(red: 240 / 255, green: 253 / 255, blue: 250 / 255)
    static let red = Color(red: 220 / 255, green: 38 / 255, blue: 38 / 255)
    static let amber = Color(red: 217 / 255, green: 119 / 255, blue: 6 / 255)
    static let blue = Color(red: 37 / 255, green: 99 / 255, blue: 235 / 255)
}

struct SiteFlowScreen<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            SiteFlowPalette.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(title)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(SiteFlowPalette.ink)

                    content
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
        }
    }
}

struct SiteFlowCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(SiteFlowPalette.card)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(SiteFlowPalette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 6)
    }
}

struct SiteFlowSectionHeader: View {
    let title: String
    let actionTitle: String?
    let action: (() -> Void)?

    init(_ title: String, actionTitle: String? = nil, action: (() -> Void)? = nil) {
        self.title = title
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.slate)
                .tracking(0.8)

            Spacer()

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(SiteFlowPalette.teal)
            }
        }
    }
}

struct StatusBadge: View {
    let title: String
    let foreground: Color
    let background: Color

    init(title: String, foreground: Color, background: Color) {
        self.title = title
        self.foreground = foreground
        self.background = background
    }

    init(status: String) {
        let colors = statusBadge(for: status)
        self.init(
            title: displayStatus(status),
            foreground: colors.0,
            background: colors.1
        )
    }

    var body: some View {
        Text(title)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(background)
            .clipShape(Capsule())
    }
}

struct OrgPill: View {
    let name: String
    let subtitle: String

    var initials: String {
        let parts = name.split(separator: " ")
        if parts.count > 1 {
            return String(parts.first?.prefix(1) ?? "") + String(parts.last?.prefix(1) ?? "")
        }
        return String(name.prefix(2)).uppercased()
    }

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [SiteFlowPalette.teal, SiteFlowPalette.blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 42, height: 42)
                .overlay(
                    Text(initials)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.7))
                    .lineLimit(1)
            }
        }
    }
}

func formatCurrency(_ value: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: value)) ?? "$0"
}

func displayStatus(_ status: String) -> String {
    switch status {
    case "in_progress":
        return "In Progress"
    case "not_started":
        return "Not Started"
    case "planned":
        return "Planned"
    case "done":
        return "Done"
    default:
        return status.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

func statusBadge(for status: String) -> (Color, Color) {
    switch status {
    case "in_progress":
        return (SiteFlowPalette.blue, SiteFlowPalette.blue.opacity(0.12))
    case "done":
        return (.green, .green.opacity(0.12))
    case "planned", "not_started":
        return (SiteFlowPalette.amber, SiteFlowPalette.amber.opacity(0.12))
    default:
        return (SiteFlowPalette.slate, SiteFlowPalette.border)
    }
}

func shortDateLabel(_ dateString: String) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withFullDate]

    guard let date = formatter.date(from: dateString) else {
        return dateString
    }

    let calendar = Calendar.current
    if calendar.isDateInToday(date) {
        return "Today"
    }
    if calendar.isDateInTomorrow(date) {
        return "Tomorrow"
    }

    let display = DateFormatter()
    display.dateFormat = "EEE, MMM d"
    return display.string(from: date)
}
