import 'package:flutter_test/flutter_test.dart';
import 'package:stripe_tracker/models/grading.dart';

void main() {
  test('GradingStudent.fromJson maps slim API payload', () {
    final student = GradingStudent.fromJson({
      'contactKey': 'ck1',
      'memberStyleId': 42,
      'fullName': 'Alex Adult',
      'currentRank': 'Purple Belt 3 stripe',
      'nextRank': 'Purple Belt 4 stripe',
      'beltSize': 'A2',
      'email': 'a@example.com',
      'phone': '',
      'currentBelt': 'purple',
      'nextBelt': 'purple',
      'gradingBelt': 'purple',
      'gradingBeltOverride': null,
      'readyToPromote': true,
    });

    expect(student.fullName, 'Alex Adult');
    expect(student.memberStyleId, 42);
    expect(student.readyToPromote, isTrue);
    expect(student.currentBelt, 'purple');
  });
}
