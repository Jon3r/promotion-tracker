class ClassSession {
  const ClassSession({
    required this.id,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    required this.startsAtLabel,
    required this.organisation,
    required this.audience,
    required this.dayKey,
    this.dueCount = 0,
  });

  final String id;
  final String title;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final String startsAtLabel;
  final String organisation;
  final String audience;
  final String? dayKey;
  final int dueCount;

  factory ClassSession.fromJson(Map<String, dynamic> json) {
    DateTime? parse(dynamic value) {
      if (value == null || value.toString().isEmpty) return null;
      return DateTime.tryParse(value.toString());
    }

    return ClassSession(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Class').toString(),
      startsAt: parse(json['startsAt']),
      endsAt: parse(json['endsAt']),
      startsAtLabel: (json['startsAtLabel'] ?? '').toString(),
      organisation: (json['organisation'] ?? '').toString(),
      audience: (json['audience'] ?? 'adults').toString(),
      dayKey: json['dayKey']?.toString(),
      dueCount: json['dueCount'] is int
          ? json['dueCount'] as int
          : int.tryParse('${json['dueCount'] ?? 0}') ?? 0,
    );
  }
}

class StripeCandidate {
  const StripeCandidate({
    required this.contactKey,
    required this.memberStyleId,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.currentRank,
    required this.nextRank,
    required this.currentLabel,
    required this.nextLabel,
    required this.audience,
    this.snoozed = false,
    this.snoozeUntil,
  });

  final String contactKey;
  final int? memberStyleId;
  final String firstName;
  final String lastName;
  final String fullName;
  final String currentRank;
  final String nextRank;
  final String currentLabel;
  final String nextLabel;
  final String audience;
  final bool snoozed;
  final DateTime? snoozeUntil;

  StripeCandidate copyWith({bool? snoozed, DateTime? snoozeUntil}) {
    return StripeCandidate(
      contactKey: contactKey,
      memberStyleId: memberStyleId,
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      currentRank: currentRank,
      nextRank: nextRank,
      currentLabel: currentLabel,
      nextLabel: nextLabel,
      audience: audience,
      snoozed: snoozed ?? this.snoozed,
      snoozeUntil: snoozeUntil ?? this.snoozeUntil,
    );
  }

  factory StripeCandidate.fromJson(Map<String, dynamic> json) {
    return StripeCandidate(
      contactKey: (json['contactKey'] ?? '').toString(),
      memberStyleId: json['memberStyleId'] == null
          ? null
          : int.tryParse(json['memberStyleId'].toString()),
      firstName: (json['firstName'] ?? '').toString(),
      lastName: (json['lastName'] ?? '').toString(),
      fullName: (json['fullName'] ?? '').toString(),
      currentRank: (json['currentRank'] ?? '').toString(),
      nextRank: (json['nextRank'] ?? '').toString(),
      currentLabel: (json['currentLabel'] ?? '').toString(),
      nextLabel: (json['nextLabel'] ?? '').toString(),
      audience: (json['audience'] ?? 'adults').toString(),
      snoozed: json['snoozed'] == true,
      snoozeUntil: json['snoozeUntil'] == null
          ? null
          : DateTime.tryParse(json['snoozeUntil'].toString()),
    );
  }
}

class ConfirmationItem {
  const ConfirmationItem({
    required this.id,
    required this.eventId,
    required this.dayKey,
    required this.contactKey,
    required this.memberStyleId,
    required this.fullName,
    required this.currentRank,
    required this.nextRank,
    required this.currentLabel,
    required this.nextLabel,
    required this.classTitle,
    required this.status,
  });

  final String id;
  final String eventId;
  final String dayKey;
  final String contactKey;
  final int? memberStyleId;
  final String fullName;
  final String currentRank;
  final String nextRank;
  final String currentLabel;
  final String nextLabel;
  final String classTitle;
  final String status;

  factory ConfirmationItem.fromJson(Map<String, dynamic> json) {
    return ConfirmationItem(
      id: (json['id'] ?? '').toString(),
      eventId: (json['eventId'] ?? '').toString(),
      dayKey: (json['dayKey'] ?? '').toString(),
      contactKey: (json['contactKey'] ?? '').toString(),
      memberStyleId: json['memberStyleId'] == null
          ? null
          : int.tryParse(json['memberStyleId'].toString()),
      fullName: (json['fullName'] ?? '').toString(),
      currentRank: (json['currentRank'] ?? '').toString(),
      nextRank: (json['nextRank'] ?? '').toString(),
      currentLabel: (json['currentLabel'] ?? '').toString(),
      nextLabel: (json['nextLabel'] ?? '').toString(),
      classTitle: (json['classTitle'] ?? '').toString(),
      status: (json['status'] ?? 'pending').toString(),
    );
  }
}

class ConfirmResult {
  const ConfirmResult({required this.clubworxSynced, this.warning});

  final bool clubworxSynced;
  final String? warning;
}

class DeepLink {
  const DeepLink({required this.type, required this.eventId, required this.dayKey, this.contactKey});

  final String type;
  final String eventId;
  final String dayKey;
  final String? contactKey;
}
