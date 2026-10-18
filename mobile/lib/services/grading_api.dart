import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/grading.dart';

const gradingApiBase = String.fromEnvironment('GRADING_API_BASE', defaultValue: '');
const gradingApiSecret = String.fromEnvironment('GRADING_API_SECRET', defaultValue: '');

const _excludePrefsKey = 'grading_excluded_keys';

/// Talks to the Next.js `/api/mobile/*` endpoints for the Grading tab.
class GradingApiClient {
  GradingApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  bool get isConfigured => gradingApiBase.trim().isNotEmpty;

  Uri _uri(String path) {
    final base = gradingApiBase.replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$base$path');
  }

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (gradingApiSecret.isNotEmpty) 'x-share-secret': gradingApiSecret,
      };

  Future<GradingRoster> loadRoster() async {
    if (!isConfigured) {
      throw StateError(
        'GRADING_API_BASE is not set. Pass --dart-define=GRADING_API_BASE=https://…',
      );
    }
    final res = await _client.get(_uri('/api/mobile/roster'), headers: _headers);
    final body = _decode(res);
    if (res.statusCode != 200) {
      throw Exception(body['error']?.toString() ?? 'Failed to load roster (${res.statusCode})');
    }
    final adults = (body['adults'] as List? ?? [])
        .map((row) => GradingStudent.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
    final kids = (body['kids'] as List? ?? [])
        .map((row) => GradingStudent.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
    return GradingRoster(
      adults: adults,
      kids: kids,
      updatedAt: body['updatedAt']?.toString(),
    );
  }

  Future<void> setGradingOverride({
    required String category,
    required String contactKey,
    required String? gradingBelt,
  }) async {
    final res = await _client.post(
      _uri('/api/mobile/actions'),
      headers: _headers,
      body: jsonEncode({
        'action': gradingBelt == null || gradingBelt.isEmpty ? 'clearOverride' : 'setOverride',
        'category': category,
        'contactKey': contactKey,
        if (gradingBelt != null && gradingBelt.isNotEmpty) 'gradingBelt': gradingBelt,
        if (gradingApiSecret.isNotEmpty) 'password': gradingApiSecret,
      }),
    );
    final body = _decode(res);
    if (res.statusCode != 200) {
      throw Exception(body['error']?.toString() ?? 'Override failed (${res.statusCode})');
    }
  }

  Future<({int adultsCount, int kidsCount})> syncFromClubWorx() async {
    final res = await _client.post(
      _uri('/api/mobile/actions'),
      headers: _headers,
      body: jsonEncode({
        'action': 'sync',
        if (gradingApiSecret.isNotEmpty) 'password': gradingApiSecret,
      }),
    );
    final body = _decode(res);
    if (res.statusCode != 200) {
      throw Exception(body['error']?.toString() ?? 'Sync failed (${res.statusCode})');
    }
    return (
      adultsCount: body['adultsCount'] is int
          ? body['adultsCount'] as int
          : int.tryParse('${body['adultsCount']}') ?? 0,
      kidsCount: body['kidsCount'] is int
          ? body['kidsCount'] as int
          : int.tryParse('${body['kidsCount']}') ?? 0,
    );
  }

  /// Device-local hide list (exclude from this phone’s Grading view).
  Future<Set<String>> loadExcludedKeys() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_excludePrefsKey) ?? []).toSet();
  }

  Future<void> setExcludedKeys(Set<String> keys) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_excludePrefsKey, keys.toList()..sort());
  }

  Map<String, dynamic> _decode(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {}
    return {};
  }
}
