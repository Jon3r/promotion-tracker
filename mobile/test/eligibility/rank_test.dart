import 'package:flutter_test/flutter_test.dart';
import 'package:stripe_tracker/eligibility/rank.dart';

void main() {
  group('normaliseRank', () {
    final cases = <(String, String, int?)>[
      ('Purple Belt 3 stripe', 'purple', 3),
      ('Purple Belt 4 stripe', 'purple', 4),
      ('white belts 4 stripe', 'white', 4),
      ('white belts 3stripe', 'white', 3),
      ('Blue Belt 3 stripe', 'blue', 3),
      ('Blue Belt 4 stripe', 'blue', 4),
      ('Brown Belt', 'brown', null),
      ('Blue Belt', 'blue', null),
    ];

    for (final entry in cases) {
      test('parses ${entry.$1}', () {
        final result = normaliseRank(entry.$1);
        expect(result.belt, entry.$2);
        expect(result.stripes, entry.$3);
      });
    }

    test('returns unknown for empty', () {
      expect(normaliseRank('').belt, 'unknown');
    });

    final compounds = <(String, String)>[
      ('Green White Belt', 'greenwhite'),
      ('Green/White Belt', 'greenwhite'),
      ('Green-White Belt', 'greenwhite'),
      ('GreenWhite Belt', 'greenwhite'),
      ('Green & White Belt', 'greenwhite'),
      ('GreyWhite Belt', 'greywhite'),
    ];

    for (final entry in compounds) {
      test('parses compound ${entry.$1}', () {
        expect(normaliseRank(entry.$1).belt, entry.$2);
      });
    }
  });

  test('orders adults white before blue', () {
    expect(beltSortIndex('white', 'adults'), lessThan(beltSortIndex('blue', 'adults')));
  });
}
