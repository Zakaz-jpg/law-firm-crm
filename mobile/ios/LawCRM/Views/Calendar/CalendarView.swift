import SwiftUI

struct CalendarView: View {
    @State private var currentDate = Date()
    @State private var events: [CalendarEventDTO] = []
    @State private var loading = false
    @State private var selectedDay: Date? = nil

    private let calendar = Calendar.current
    private let monthFmt: DateFormatter = {
        let f = DateFormatter(); f.locale = Locale(identifier: "ru_RU")
        f.dateFormat = "LLLL yyyy"; return f
    }()
    private let timeFmt: DateFormatter = {
        let f = DateFormatter(); f.locale = Locale(identifier: "ru_RU")
        f.dateFormat = "HH:mm"; return f
    }()
    private let dayFmt: DateFormatter = {
        let f = DateFormatter(); f.locale = Locale(identifier: "ru_RU")
        f.dateFormat = "d MMMM, EEEE"; return f
    }()

    private var monthStart: Date {
        calendar.date(from: calendar.dateComponents([.year, .month], from: currentDate))!
    }
    private var daysInMonth: Int {
        calendar.range(of: .day, in: .month, for: monthStart)!.count
    }
    private var firstWeekday: Int {
        // Mon=0 offset
        let wd = calendar.component(.weekday, from: monthStart)
        return (wd + 5) % 7
    }
    private var byDay: [String: [CalendarEventDTO]] {
        Dictionary(grouping: events) { e in
            let comps = calendar.dateComponents([.year, .month, .day], from: e.hearingDate)
            return "\(comps.year!)-\(comps.month!)-\(comps.day!)"
        }
    }
    private func dayKey(_ day: Int) -> String {
        let comps = calendar.dateComponents([.year, .month], from: monthStart)
        return "\(comps.year!)-\(comps.month!)-\(day)"
    }
    private var selectedEvents: [CalendarEventDTO] {
        guard let sel = selectedDay else { return [] }
        let comps = calendar.dateComponents([.year, .month, .day], from: sel)
        let key = "\(comps.year!)-\(comps.month!)-\(comps.day!)"
        return byDay[key] ?? []
    }
    private var today: Date { calendar.startOfDay(for: Date()) }
    private func isToday(_ day: Int) -> Bool {
        guard let date = calendar.date(bySetting: .day, value: day, of: monthStart) else { return false }
        return calendar.isDate(date, inSameDayAs: today)
    }
    private func isSelected(_ day: Int) -> Bool {
        guard let sel = selectedDay,
              let date = calendar.date(bySetting: .day, value: day, of: monthStart) else { return false }
        return calendar.isDate(date, inSameDayAs: sel)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Month navigation
                    HStack {
                        Button { changeMonth(-1) } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 16, weight: .semibold))
                                .frame(width: 36, height: 36)
                                .background(Color(.systemGray6))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        Spacer()
                        Text(monthFmt.string(from: currentDate).capitalized)
                            .font(.system(size: 18, weight: .bold, design: .serif))
                        Spacer()
                        Button { changeMonth(1) } label: {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 16, weight: .semibold))
                                .frame(width: 36, height: 36)
                                .background(Color(.systemGray6))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    // Weekday headers
                    let weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 4) {
                        ForEach(weekdays, id: \.self) { d in
                            Text(d)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                        }

                        // Empty leading cells
                        ForEach(0..<firstWeekday, id: \.self) { _ in
                            Color.clear.frame(height: 52)
                        }

                        // Day cells
                        ForEach(1...daysInMonth, id: \.self) { day in
                            let key = dayKey(day)
                            let dayEvents = byDay[key] ?? []
                            let sel = isSelected(day)
                            let tod = isToday(day)

                            Button {
                                if let date = calendar.date(bySetting: .day, value: day, of: monthStart) {
                                    selectedDay = sel ? nil : date
                                }
                            } label: {
                                VStack(spacing: 3) {
                                    Text("\(day)")
                                        .font(.system(size: 15, weight: tod || sel ? .bold : .regular))
                                        .foregroundStyle(tod ? .white : (sel ? Color(red: 0.1, green: 0.15, blue: 0.27) : .primary))
                                        .frame(width: 30, height: 30)
                                        .background(
                                            tod ? Color(red: 0.1, green: 0.15, blue: 0.27) :
                                            sel ? Color(red: 0.79, green: 0.66, blue: 0.3).opacity(0.2) : .clear
                                        )
                                        .clipShape(Circle())

                                    if !dayEvents.isEmpty {
                                        HStack(spacing: 2) {
                                            ForEach(0..<min(dayEvents.count, 3), id: \.self) { _ in
                                                Circle()
                                                    .fill(Color(red: 0.79, green: 0.66, blue: 0.3))
                                                    .frame(width: 4, height: 4)
                                            }
                                        }
                                    } else {
                                        Spacer().frame(height: 6)
                                    }
                                }
                                .frame(height: 52)
                                .frame(maxWidth: .infinity)
                                .background(sel ? Color(red: 0.79, green: 0.66, blue: 0.3).opacity(0.08) : .clear)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 12)

                    // Selected day events
                    if let sel = selectedDay {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(dayFmt.string(from: sel).capitalized)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 16)

                            if selectedEvents.isEmpty {
                                Text("Заседаний нет")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 20)
                            } else {
                                ForEach(selectedEvents) { e in
                                    NavigationLink(destination: CaseDetailView(caseId: e.caseId)) {
                                        HStack(spacing: 12) {
                                            VStack(alignment: .leading) {
                                                Text(timeFmt.string(from: e.hearingDate))
                                                    .font(.system(size: 13, weight: .bold))
                                                    .foregroundStyle(Color(red: 0.79, green: 0.66, blue: 0.3))
                                            }
                                            VStack(alignment: .leading, spacing: 3) {
                                                Text(e.title)
                                                    .font(.system(size: 14, weight: .semibold))
                                                    .foregroundStyle(.primary)
                                                    .lineLimit(2)
                                                if let court = e.court {
                                                    Text(court)
                                                        .font(.system(size: 12))
                                                        .foregroundStyle(.secondary)
                                                }
                                                if let num = e.caseNumber {
                                                    Text("№ \(num)")
                                                        .font(.system(size: 12))
                                                        .foregroundStyle(.secondary)
                                                }
                                            }
                                            Spacer()
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 12))
                                                .foregroundStyle(.secondary)
                                        }
                                        .padding(14)
                                        .background(Color(.systemBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray5)))
                                        .padding(.horizontal, 16)
                                    }
                                }
                            }
                        }
                        .padding(.top, 4)
                    } else if !events.isEmpty {
                        Text("\(events.count) заседани\(eventsWord(events.count)) в этом месяце")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .padding(.top, 8)
                    }

                    Spacer(minLength: 32)
                }
            }
            .navigationTitle("Календарь")
            .overlay {
                if loading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.ultraThinMaterial)
                }
            }
            .task { await loadEvents() }
        }
    }

    private func changeMonth(_ delta: Int) {
        guard let newDate = calendar.date(byAdding: .month, value: delta, to: currentDate) else { return }
        currentDate = newDate
        selectedDay = nil
        Task { await loadEvents() }
    }

    @MainActor
    private func loadEvents() async {
        loading = true
        defer { loading = false }
        guard let start = calendar.date(from: calendar.dateComponents([.year, .month], from: currentDate)),
              let end = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: start)
        else { return }
        do {
            events = try await APIClient.shared.calendar(start: start, end: end)
        } catch {
            events = []
        }
    }

    private func eventsWord(_ n: Int) -> String {
        let mod10 = n % 10, mod100 = n % 100
        if mod100 >= 11 && mod100 <= 19 { return "й" }
        if mod10 == 1 { return "е" }
        if mod10 >= 2 && mod10 <= 4 { return "я" }
        return "й"
    }
}
