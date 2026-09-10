import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stripe_tracker/app.dart';
import 'package:stripe_tracker/services/mock_backend.dart';

void main() {
  testWidgets('coach can delay a stripe and confirm a promotion', (tester) async {
    final backend = MockBackend();
    await tester.pumpWidget(StripeTrackerApp(backend: backend, demoMode: true));

    expect(find.text('Stripe tracker'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(1), 'demo-password');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Kids BJJ'), findsOneWidget);
    expect(find.textContaining('due'), findsWidgets);

    await tester.tap(find.text('Kids BJJ'));
    await tester.pumpAndSettle();

    expect(find.text('Alice Ng'), findsOneWidget);
    expect(find.text('Dana Beltup'), findsNothing);

    await tester.tap(find.text('Delay 7 d').first);
    await tester.pumpAndSettle();
    expect(find.text('Delayed'), findsOneWidget);
    expect(find.textContaining('Sleeping until'), findsOneWidget);

    await tester.pageBack();
    await tester.pumpAndSettle();

    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();

    expect(find.text('Finn Walsh'), findsOneWidget);
    await tester.tap(find.text('Yes'));
    await tester.pumpAndSettle();
    expect(find.text('Finn Walsh'), findsNothing);
    expect(find.text('No pending post-class confirmations.'), findsOneWidget);
  });

  testWidgets('unknown email is rejected', (tester) async {
    await tester.pumpWidget(StripeTrackerApp(backend: MockBackend(), demoMode: true));
    await tester.enterText(find.byType(TextField).first, 'not-a-coach@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'secret');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.textContaining('allowlist'), findsOneWidget);
  });
}
