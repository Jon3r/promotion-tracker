class GradingStudent {
  const GradingStudent({
    required this.contactKey,
    required this.memberStyleId,
    required this.fullName,
    required this.currentRank,
    required this.nextRank,
    required this.beltSize,
    required this.email,
    required this.phone,
    required this.currentBelt,
    required this.nextBelt,
    required this.gradingBelt,
    required this.gradingBeltOverride,
    required this.readyToPromote,
  });

  final String? contactKey;
  final int? memberStyleId;
  final String fullName;
  final String currentRank;
  final String nextRank;
  final String beltSize;
  final String email;
  final String phone;
  final String currentBelt;
  final String nextBelt;
  final String? gradingBelt;
  final String? gradingBeltOverride;
  final bool readyToPromote;

  factory GradingStudent.fromJson(Map<String, dynamic> json) {
    return GradingStudent(
      contactKey: json['contactKey']?.toString(),
      memberStyleId: json['memberStyleId'] == null
          ? null
          : int.tryParse(json['memberStyleId'].toString()),
      fullName: (json['fullName'] ?? '').toString(),
      currentRank: (json['currentRank'] ?? '').toString(),
      nextRank: (json['nextRank'] ?? '').toString(),
      beltSize: (json['beltSize'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      currentBelt: (json['currentBelt'] ?? 'unknown').toString(),
      nextBelt: (json['nextBelt'] ?? 'unknown').toString(),
      gradingBelt: json['gradingBelt']?.toString(),
      gradingBeltOverride: json['gradingBeltOverride']?.toString(),
      readyToPromote: json['readyToPromote'] == true,
    );
  }

  GradingStudent copyWith({
    String? gradingBelt,
    String? gradingBeltOverride,
  }) {
    return GradingStudent(
      contactKey: contactKey,
      memberStyleId: memberStyleId,
      fullName: fullName,
      currentRank: currentRank,
      nextRank: nextRank,
      beltSize: beltSize,
      email: email,
      phone: phone,
      currentBelt: currentBelt,
      nextBelt: nextBelt,
      gradingBelt: gradingBelt ?? this.gradingBelt,
      gradingBeltOverride: gradingBeltOverride,
      readyToPromote: readyToPromote,
    );
  }
}

class GradingRoster {
  const GradingRoster({
    required this.adults,
    required this.kids,
    this.updatedAt,
  });

  final List<GradingStudent> adults;
  final List<GradingStudent> kids;
  final String? updatedAt;
}
