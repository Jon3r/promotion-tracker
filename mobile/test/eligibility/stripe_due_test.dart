import 'package:flutter_test/flutter_test.dart';
import 'package:stripe_tracker/eligibility/stripe_due.dart';

void main() {
  group('isDueForStripe', () {
    test('includes same-belt stripe increases', () {
      expect(isDueForStripe('White Belt 1 stripe', 'White Belt 2 stripe'), isTrue);
      expect(isDueForStripe('Purple Belt 3 stripe', 'Purple Belt 4 stripe'), isTrue);
      expect(isDueForStripe('Grey Belt 2 stripe', 'Grey Belt 3 stripe'), isTrue);
    });

    test('treats missing current stripe count as 0', () {
      expect(isDueForStripe('White Belt', 'White Belt 1 stripe'), isTrue);
    });

    test('excludes belt-ups', () {
      expect(isDueForStripe('White Belt 4 stripe', 'Blue Belt'), isFalse);
      expect(isDueForStripe('Grey Belt 4 stripe', 'Yellow/White Belt'), isFalse);
      expect(isDueForStripe('White Belt', 'Blue Belt'), isFalse);
    });

    test('excludes ready-to-promote text without a stripe increase', () {
      expect(isDueForStripe('White Belt 4 stripe', 'Ready to Promote'), isFalse);
      expect(isDueForStripe('Blue Belt', 'Ready for Promotion'), isFalse);
    });

    test('excludes equal ranks', () {
      expect(isDueForStripe('White Belt', 'White Belt'), isFalse);
      expect(isDueForStripe('White Belt 2 stripe', 'White Belt 2 stripe'), isFalse);
    });
  });

  group('isSnoozed', () {
    final now = DateTime.utc(2026, 9, 10);

    test('is true before snoozeUntil', () {
      expect(isSnoozed(DateTime.utc(2026, 9, 17), now), isTrue);
    });

    test('is false once snooze expires', () {
      expect(isSnoozed(DateTime.utc(2026, 9, 9), now), isFalse);
    });
  });
}
