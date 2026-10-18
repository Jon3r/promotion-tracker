import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../models/models.dart';
import 'backend.dart';

class FirebaseBackend implements Backend {
  FirebaseBackend({
    FirebaseAuth? auth,
    FirebaseFunctions? functions,
    FirebaseMessaging? messaging,
  })  : _auth = auth ?? FirebaseAuth.instance,
        _functions = functions ?? FirebaseFunctions.instance,
        _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseAuth _auth;
  final FirebaseFunctions _functions;
  final FirebaseMessaging _messaging;
  final _links = StreamController<DeepLink>.broadcast();

  Future<void> listenForNotifications() async {
    await _messaging.requestPermission();
    final token = await _messaging.getToken();
    if (token != null && _auth.currentUser != null) {
      await registerFcmToken(token);
    }
    _messaging.onTokenRefresh.listen((next) {
      if (_auth.currentUser != null) {
        registerFcmToken(next);
      }
    });
    FirebaseMessaging.onMessageOpenedApp.listen(_fromRemote);
    final initial = await _messaging.getInitialMessage();
    if (initial != null) {
      _fromRemote(initial);
    }
  }

  void _fromRemote(RemoteMessage message) {
    final data = message.data;
    final eventId = data['eventId'];
    final dayKey = data['dayKey'];
    if (eventId == null || dayKey == null) return;
    _links.add(
      DeepLink(
        type: data['type'] ?? 'class_ending',
        eventId: eventId,
        dayKey: dayKey,
        contactKey: data['contactKey'],
      ),
    );
  }

  @override
  Stream<String?> authState() =>
      _auth.authStateChanges().map((user) => user?.email?.toLowerCase());

  @override
  String? get currentEmail => _auth.currentUser?.email?.toLowerCase();

  @override
  Future<void> signIn(String email, String password) {
    return _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  @override
  Future<void> signOut() => _auth.signOut();

  Future<Map<String, dynamic>> _call(String name, [Map<String, dynamic>? data]) async {
    final callable = _functions.httpsCallable(name);
    final result = await callable.call(data ?? {});
    return Map<String, dynamic>.from(result.data as Map);
  }

  @override
  Future<List<ClassSession>> loadTimetable(String day) async {
    final payload = await _call('getTodayTimetable', {'day': day});
    final classes = (payload['classes'] as List? ?? [])
        .map((row) => ClassSession.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
    return classes;
  }

  @override
  Future<List<StripeCandidate>> loadClassCandidates(String eventId, String day) async {
    final payload = await _call('getClassCandidates', {
      'eventId': eventId,
      'day': day,
    });
    return (payload['candidates'] as List? ?? [])
        .map((row) => StripeCandidate.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  @override
  Future<DateTime> snoozePromotion({
    required String contactKey,
    required int? memberStyleId,
    required int days,
  }) async {
    final payload = await _call('snoozePromotion', {
      'contactKey': contactKey,
      'memberStyleId': memberStyleId,
      'days': days,
    });
    return DateTime.parse(payload['snoozeUntil'] as String);
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
    final payload = await _call('confirmPromotion', {
      'contactKey': contactKey,
      'memberStyleId': memberStyleId,
      'eventId': eventId,
      'dayKey': dayKey,
      'nextRank': nextRank,
      'happened': happened,
    });
    return ConfirmResult(
      clubworxSynced: payload['clubworxSynced'] == true,
      warning: payload['warning']?.toString(),
    );
  }

  @override
  Future<List<ConfirmationItem>> loadConfirmQueue() async {
    final payload = await _call('getConfirmQueue');
    return (payload['items'] as List? ?? [])
        .map((row) => ConfirmationItem.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  @override
  Future<void> registerFcmToken(String token) {
    return _call('registerFcmToken', {'token': token});
  }

  @override
  Stream<DeepLink> notificationTaps() => _links.stream;
}
