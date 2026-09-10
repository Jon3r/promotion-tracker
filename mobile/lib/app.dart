import 'package:flutter/material.dart';

import 'models/models.dart';
import 'screens/class_sheet.dart';
import 'screens/confirm_queue_screen.dart';
import 'screens/sign_in_screen.dart';
import 'screens/timetable_screen.dart';
import 'services/backend.dart';

class StripeTrackerApp extends StatelessWidget {
  const StripeTrackerApp({super.key, required this.backend, this.demoMode = true});

  final Backend backend;
  final bool demoMode;

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFC45C26),
      brightness: Brightness.dark,
    );
    return MaterialApp(
      title: 'Stripe tracker',
      theme: ThemeData(
        colorScheme: scheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF121212),
      ),
      home: AuthGate(backend: backend, demoMode: demoMode),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key, required this.backend, required this.demoMode});

  final Backend backend;
  final bool demoMode;

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
        return HomeShell(backend: backend, email: email, demoMode: demoMode);
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
  });

  final Backend backend;
  final String email;
  final bool demoMode;

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
