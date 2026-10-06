import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app.dart';
import 'firebase_options.dart';
import 'services/backend.dart';
import 'services/firebase_backend.dart';
import 'services/mock_backend.dart';

const useMock = bool.fromEnvironment('USE_MOCK', defaultValue: true);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Backend backend;
  var demoMode = useMock || !DefaultFirebaseOptions.configured;

  if (!demoMode) {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      final firebase = FirebaseBackend();
      await firebase.listenForNotifications();
      backend = firebase;
    } catch (error) {
      debugPrint('Firebase init failed, falling back to demo mode: $error');
      backend = MockBackend();
      demoMode = true;
    }
  } else {
    backend = MockBackend();
  }

  runApp(StripeTrackerApp(backend: backend, demoMode: demoMode));
}
