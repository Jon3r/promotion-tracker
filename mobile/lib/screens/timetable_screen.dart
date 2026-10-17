import 'package:flutter/material.dart';

import '../app.dart';
import '../models/models.dart';
import '../services/backend.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({
    super.key,
    required this.backend,
    required this.email,
    required this.demoMode,
    this.pendingLink,
    this.onLinkConsumed,
  });

  final Backend backend;
  final String email;
  final bool demoMode;
  final DeepLink? pendingLink;
  final VoidCallback? onLinkConsumed;

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  late String _day;
  Future<List<ClassSession>>? _future;

  @override
  void initState() {
    super.initState();
    _day = DateTime.now().toUtc().toIso8601String().substring(0, 10);
    _reload();
  }

  @override
  void didUpdateWidget(covariant TimetableScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final link = widget.pendingLink;
    if (link != null && link != oldWidget.pendingLink) {
      _openLink(link);
    }
  }

  void _reload() {
    setState(() {
      _future = widget.backend.loadTimetable(_day);
    });
  }

  Future<void> _openLink(DeepLink link) async {
    widget.onLinkConsumed?.call();
    final classes = await (_future ?? widget.backend.loadTimetable(link.dayKey));
    if (!mounted) return;
    final match = classes.where((c) => c.id == link.eventId);
    if (match.isEmpty) return;
    await openClassSheet(
      context: context,
      backend: widget.backend,
      session: match.first,
      day: link.dayKey,
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/images/pja-logo.png',
              width: 32,
              height: 32,
              semanticLabel: 'PJJA',
            ),
            const SizedBox(width: 10),
            const Flexible(child: Text('Today’s classes')),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: widget.backend.signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.email,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                TextButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.tryParse(_day) ?? DateTime.now(),
                      firstDate: DateTime.now().subtract(const Duration(days: 14)),
                      lastDate: DateTime.now().add(const Duration(days: 14)),
                    );
                    if (picked == null) return;
                    _day = picked.toIso8601String().substring(0, 10);
                    _reload();
                  },
                  icon: const Icon(Icons.event),
                  label: Text(_day),
                ),
              ],
            ),
          ),
          if (widget.demoMode)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Demo timetable — stripe-due counts exclude belt-ups.'),
              ),
            ),
          Expanded(
            child: FutureBuilder<List<ClassSession>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text(snapshot.error.toString()));
                }
                final classes = snapshot.data ?? [];
                if (classes.isEmpty) {
                  return const Center(child: Text('No classes for this day.'));
                }
                return RefreshIndicator(
                  onRefresh: () async => _reload(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: classes.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final session = classes[index];
                      return Card(
                        child: ListTile(
                          title: Text(session.title),
                          subtitle: Text(
                            '${session.startsAtLabel}\n${session.organisation} · ${session.audience}',
                          ),
                          isThreeLine: true,
                          trailing: _DueChip(count: session.dueCount),
                          onTap: () async {
                            await openClassSheet(
                              context: context,
                              backend: widget.backend,
                              session: session,
                              day: _day,
                            );
                            _reload();
                          },
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _DueChip extends StatelessWidget {
  const _DueChip({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(count == 0 ? 'None' : '$count due'),
      visualDensity: VisualDensity.compact,
    );
  }
}
