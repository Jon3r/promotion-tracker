import 'package:flutter/material.dart';

import '../eligibility/stripe_due.dart';
import '../models/models.dart';
import '../services/backend.dart';

class ConfirmQueueScreen extends StatefulWidget {
  const ConfirmQueueScreen({super.key, required this.backend});

  final Backend backend;

  @override
  State<ConfirmQueueScreen> createState() => _ConfirmQueueScreenState();
}

class _ConfirmQueueScreenState extends State<ConfirmQueueScreen> {
  late Future<List<ConfirmationItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.backend.loadConfirmQueue();
  }

  void _reload() {
    setState(() {
      _future = widget.backend.loadConfirmQueue();
    });
  }

  Future<void> _answer(ConfirmationItem item, bool happened) async {
    final result = await widget.backend.confirmPromotion(
      contactKey: item.contactKey,
      memberStyleId: item.memberStyleId,
      eventId: item.eventId,
      dayKey: item.dayKey,
      nextRank: item.nextRank,
      happened: happened,
    );
    if (!mounted) return;
    final message = happened
        ? (result.warning ??
            (result.clubworxSynced
                ? 'Saved and updated ClubWorx.'
                : 'Saved. Update ClubWorx manually if needed.'))
        : 'Marked as not promoted.';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    _reload();
  }

  Future<void> _delay(ConfirmationItem item, int days) async {
    await widget.backend.snoozePromotion(
      contactKey: item.contactKey,
      memberStyleId: item.memberStyleId,
      days: days,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${item.fullName} delayed $days days')),
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Did it happen?')),
      body: FutureBuilder<List<ConfirmationItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return const Center(
              child: Text('No pending post-class confirmations.'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.fullName,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text('${item.classTitle} · ${item.dayKey}'),
                        Text('${item.currentLabel}  →  ${item.nextLabel}'),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            FilledButton(
                              onPressed: () => _answer(item, true),
                              child: const Text('Yes'),
                            ),
                            OutlinedButton(
                              onPressed: () => _answer(item, false),
                              child: const Text('No'),
                            ),
                            for (final days in allowedSnoozeDays)
                              TextButton(
                                onPressed: () => _delay(item, days),
                                child: Text('Delay $days d'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
