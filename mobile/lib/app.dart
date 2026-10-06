import 'package:flutter/material.dart';

import 'models/models.dart';
import 'screens/class_sheet.dart';
import 'screens/confirm_queue_screen.dart';
import 'screens/grading_screen.dart';
import 'screens/sign_in_screen.dart';
import 'screens/timetable_screen.dart';
import 'services/backend.dart';
import 'services/grading_api.dart';
import 'theme/pja_theme.dart';

class StripeTrackerApp extends StatelessWidget {
  StripeTrackerApp({
    super.key,
    required this.backend,
    this.demoMode = true,
    GradingApiClient? gradingApi,
  }) : gradingApi = gradingApi ?? GradingApiClient();

  final Backend backend;
  final bool demoMode;
  final GradingApiClient gradingApi;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PJJA Admin',
      theme: buildPjaTheme(),
      home: AuthGate(
        backend: backend,
        demoMode: demoMode,
        gradingApi: gradingApi,
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({
    super.key,
    required this.backend,
    required this.demoMode,
    required this.gradingApi,
  });

  final Backend backend;
  final bool demoMode;
  final GradingApiClient gradingApi;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<String?>(
      stream: backend.authState(),
      initialData: backend.currentEmail,
      builder: (context, snapshot) {
        final email = snapshot.data;
        if (email == null) {
          return SignInScreen(backend: backend, demoMode: demoMode);
        }
        return HomeShell(
          backend: backend,
          email: email,
          demoMode: demoMode,
          gradingApi: gradingApi,
        );
      },
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.backend,
    required this.email,
    required this.demoMode,
    required this.gradingApi,
  });

  final Backend backend;
  final String email;
  final bool demoMode;
  final GradingApiClient gradingApi;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  DeepLink? _pendingLink;

  @override
  void initState() {
    super.initState();
    widget.backend.notificationTaps().listen((link) {
      if (!mounted) return;
      setState(() {
        _pendingLink = link;
        _index = link.type == 'confirm' ? 1 : 0;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          TimetableScreen(
            backend: widget.backend,
            email: widget.email,
            demoMode: widget.demoMode,
            pendingLink: _pendingLink,
            onLinkConsumed: () => setState(() => _pendingLink = null),
          ),
          ConfirmQueueScreen(backend: widget.backend),
          GradingScreen(api: widget.gradingApi, demoMode: widget.demoMode),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Timetable',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_alt_outlined),
            selectedIcon: Icon(Icons.task_alt),
            label: 'Confirm',
          ),
          NavigationDestination(
            icon: Icon(Icons.military_tech_outlined),
            selectedIcon: Icon(Icons.military_tech),
            label: 'Grading',
          ),
        ],
      ),
    );
  }
}

Future<void> openClassSheet({
  required BuildContext context,
  required Backend backend,
  required ClassSession session,
  required String day,
}) {
  return Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => ClassSheet(backend: backend, session: session, day: day),
    ),
  );
}
