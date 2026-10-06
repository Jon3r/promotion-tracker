import 'dart:async';

import '../eligibility/rank.dart';
import '../eligibility/stripe_due.dart';
import '../models/models.dart';
import 'backend.dart';

const defaultCoachEmail = 'andy@onlyjonesy.com.au';

class MockBackend implements Backend {
  MockBackend();

  String? _email;
  final _auth = StreamController<String?>.broadcast();
  final _links = StreamController<DeepLink>.broadcast();
  final Map<String, DateTime> _snoozes = {};
  final Set<String> _promoted = {};
  final List<ConfirmationItem> _queue = [
    ConfirmationItem(
      id: 'kids-evening_yesterday_finn',
      eventId: 'kids-evening',
      dayKey: DateTime.now().toUtc().subtract(const Duration(days: 1)).toIso8601String().substring(0, 10),
      contactKey: 'finn',
      memberStyleId: 31,
      fullName: 'Finn Walsh',
      currentRank: 'White Belt 2 stripe',
      nextRank: 'White Belt 3 stripe',
      currentLabel: 'White Belt · 2 stripes',
      nextLabel: 'White Belt · 3 stripes',
      classTitle: 'Kids BJJ',
      status: 'pending',
    ),
  ];

  @override
  Stream<String?> authState() => _auth.stream;

  @override
  String? get currentEmail => _email;

  @override
  Future<void> signIn(String email, String password) async {
    final normalised = email.trim().toLowerCase();
    if (normalised != defaultCoachEmail) {
      throw Exception('This account is not on the coach allowlist.');
    }
    if (password.trim().isEmpty) {
      throw Exception('Enter a password.');
    }
    _email = normalised;
    _auth.add(_email);
  }

  @override
  Future<void> signOut() async {
    _email = null;
    _auth.add(null);
  }

  @override
  Future<List<ClassSession>> loadTimetable(String day) async {
    final classes = _classesFor(day);
    return [
      for (final session in classes)
        ClassSession(
          id: session.id,
          title: session.title,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          startsAtLabel: session.startsAtLabel,
          organisation: session.organisation,
          audience: session.audience,
          dayKey: session.dayKey,
          dueCount: (await loadClassCandidates(session.id, day))
              .where((c) => !c.snoozed)
              .length,
        ),
    ];
  }

  @override
  Future<List<StripeCandidate>> loadClassCandidates(String eventId, String day) async {
    final now = DateTime.now().toUtc();
    return _rawCandidates(eventId)
        .where((c) => !_promoted.contains(c.contactKey))
        .where((c) => isDueForStripe(c.currentRank, c.nextRank))
        .map((c) {
          final until = _snoozes[c.contactKey];
          return c.copyWith(snoozed: isSnoozed(until, now), snoozeUntil: until);
        })
        .toList();
  }

  @override
  Future<DateTime> snoozePromotion({
    required String contactKey,
    required int? memberStyleId,
    required int days,
  }) async {
    if (!allowedSnoozeDays.contains(days)) {
      throw Exception('days must be 7, 14, or 21');
    }
    final until = DateTime.now().toUtc().add(Duration(days: days));
    _snoozes[contactKey] = until;
    _queue.removeWhere((item) => item.contactKey == contactKey);
    return until;
  }

  @override
  Future<ConfirmResult> confirmPromotion({
    required String contactKey,
    required int? memberStyleId,
    required String eventId,
    required String dayKey,
    required String nextRank,
    required bool happened,
  }) async {
    _queue.removeWhere(
      (item) =>
          item.contactKey == contactKey &&
          item.eventId == eventId &&
          item.dayKey == dayKey,
    );
    if (happened) {
      _promoted.add(contactKey);
      _snoozes.remove(contactKey);
    }
    return ConfirmResult(
      clubworxSynced: happened,
      warning: happened
          ? 'Demo mode: ClubWorx was not called. Confirmation stored locally.'
          : null,
    );
  }

  @override
  Future<List<ConfirmationItem>> loadConfirmQueue() async {
    return List.unmodifiable(_queue);
  }

  @override
  Future<void> registerFcmToken(String token) async {}

  @override
  Stream<DeepLink> notificationTaps() => _links.stream;

  /// Used by widget tests to simulate a push tap.
  void emitNotification(DeepLink link) => _links.add(link);

  List<ClassSession> _classesFor(String day) {
    DateTime at(int hour, int minute) =>
        DateTime.parse('${day}T${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}:00.000Z');

    return [
      ClassSession(
        id: 'kids-evening',
        title: 'Kids BJJ',
        startsAt: at(6, 30),
        endsAt: at(7, 30),
        startsAtLabel: '$day · 16:30',
        organisation: 'Main Mats',
        audience: 'kids',
        dayKey: day,
      ),
      ClassSession(
        id: 'adults-evening',
        title: 'Adults Gi',
        startsAt: at(8, 0),
        endsAt: at(9, 0),
        startsAtLabel: '$day · 18:00',
        organisation: 'Main Mats',
        audience: 'adults',
        dayKey: day,
      ),
    ];
  }

  List<StripeCandidate> _rawCandidates(String eventId) {
    if (eventId == 'kids-evening') {
      return [
        StripeCandidate(
          contactKey: 'alice',
          memberStyleId: 11,
          firstName: 'Alice',
          lastName: 'Ng',
          fullName: 'Alice Ng',
          currentRank: 'Grey Belt 2 stripe',
          nextRank: 'Grey Belt 3 stripe',
          currentLabel: normaliseRank('Grey Belt 2 stripe').label,
          nextLabel: normaliseRank('Grey Belt 3 stripe').label,
          audience: 'kids',
        ),
        StripeCandidate(
          contactKey: 'ben',
          memberStyleId: 12,
          firstName: 'Ben',
          lastName: 'Cole',
          fullName: 'Ben Cole',
          currentRank: 'White Belt',
          nextRank: 'White Belt 1 stripe',
          currentLabel: normaliseRank('White Belt').label,
          nextLabel: normaliseRank('White Belt 1 stripe').label,
          audience: 'kids',
        ),
        StripeCandidate(
          contactKey: 'dana',
          memberStyleId: 13,
          firstName: 'Dana',
          lastName: 'Beltup',
          fullName: 'Dana Beltup',
          currentRank: 'Grey Belt 4 stripe',
          nextRank: 'Yellow/White Belt',
          currentLabel: normaliseRank('Grey Belt 4 stripe').label,
          nextLabel: normaliseRank('Yellow/White Belt').label,
          audience: 'kids',
        ),
      ];
    }
    if (eventId == 'adults-evening') {
      return [
        StripeCandidate(
          contactKey: 'carol',
          memberStyleId: 21,
          firstName: 'Carol',
          lastName: 'Diaz',
          fullName: 'Carol Diaz',
          currentRank: 'Purple Belt 3 stripe',
          nextRank: 'Purple Belt 4 stripe',
          currentLabel: normaliseRank('Purple Belt 3 stripe').label,
          nextLabel: normaliseRank('Purple Belt 4 stripe').label,
          audience: 'adults',
        ),
        StripeCandidate(
          contactKey: 'ed',
          memberStyleId: 22,
          firstName: 'Ed',
          lastName: 'Blue',
          fullName: 'Ed Blue',
          currentRank: 'White Belt 4 stripe',
          nextRank: 'Blue Belt',
          currentLabel: normaliseRank('White Belt 4 stripe').label,
          nextLabel: normaliseRank('Blue Belt').label,
          audience: 'adults',
        ),
      ];
    }
    return [];
  }
}
