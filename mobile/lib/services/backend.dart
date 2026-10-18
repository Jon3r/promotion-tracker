import '../models/models.dart';

abstract class Backend {
  Stream<String?> authState();

  String? get currentEmail;

  Future<void> signIn(String email, String password);

  Future<void> signOut();

  Future<List<ClassSession>> loadTimetable(String day);

  Future<List<StripeCandidate>> loadClassCandidates(String eventId, String day);

  Future<DateTime> snoozePromotion({
    required String contactKey,
    required int? memberStyleId,
    required int days,
  });

  Future<ConfirmResult> confirmPromotion({
    required String contactKey,
    required int? memberStyleId,
    required String eventId,
    required String dayKey,
    required String nextRank,
    required bool happened,
  });

  Future<List<ConfirmationItem>> loadConfirmQueue();

  Future<void> registerFcmToken(String token);

  Stream<DeepLink> notificationTaps();
}
