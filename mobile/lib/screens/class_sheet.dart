import 'package:flutter/material.dart';

import '../eligibility/stripe_due.dart';
import '../models/models.dart';
import '../services/backend.dart';

class ClassSheet extends StatefulWidget {
  const ClassSheet({
    super.key,
    required this.backend,
    required this.session,
    required this.day,
  });

  final Backend backend;
  final ClassSession session;
  final String day;

  @override
  State<ClassSheet> createState() => _ClassSheetState();
}

class _ClassSheetState extends State<ClassSheet> {
  late Future<List<StripeCandidate>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.backend.loadClassCandidates(widget.session.id, widget.day);
  }

  void _reload() {
    setState(() {
      _future = widget.backend.loadClassCandidates(widget.session.id, widget.day);
    });
  }

  Future<void> _snooze(StripeCandidate candidate, int days) async {
    await widget.backend.snoozePromotion(
      contactKey: candidate.contactKey,
      memberStyleId: candidate.memberStyleId,
      days: days,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${candidate.fullName} delayed $days days')),
    );
    _reload();
  }

  Future<void> _confirmPromotion(StripeCandidate candidate) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm promotion?'),
        content: Text(
          'Mark ${candidate.fullName} as promoted to ${candidate.nextLabel}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final result = await widget.backend.confirmPromotion(
      contactKey: candidate.contactKey,
      memberStyleId: candidate.memberStyleId,
      eventId: widget.session.id,
      dayKey: widget.day,
      nextRank: candidate.nextRank,
      happened: true,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.warning ??
              (result.clubworxSynced
                  ? '${candidate.fullName} promoted and updated in ClubWorx.'
                  : '${candidate.fullName} marked promoted.'),
        ),
      ),
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.session.title),
      ),
      body: FutureBuilder<List<StripeCandidate>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          final all = snapshot.data ?? [];
          final due = all.where((c) => !c.snoozed && isDueForStripe(c.currentRank, c.nextRank)).toList();
          final snoozed = all.where((c) => c.snoozed).toList();

          if (due.isEmpty && snoozed.isEmpty) {
            return const Center(
              child: Text('No stripe promotions due in this class.'),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Due a stripe (not a belt-up)',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              if (due.isEmpty) const Text('Everyone due has been delayed.'),
              ...due.map(
                (candidate) => _CandidateCard(
                  candidate: candidate,
                  onSnooze: (days) => _snooze(candidate, days),
                  onConfirm: () => _confirmPromotion(candidate),
                ),
              ),
              if (snoozed.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Delayed',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                ...snoozed.map(
                  (candidate) => ListTile(
                    title: Text(candidate.fullName),
                    subtitle: Text(
                      'Sleeping until ${candidate.snoozeUntil?.toLocal().toString().split(' ').first ?? 'later'}',
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _CandidateCard extends StatelessWidget {
  const _CandidateCard({
    required this.candidate,
    required this.onSnooze,
    required this.onConfirm,
  });

  final StripeCandidate candidate;
  final Future<void> Function(int days) onSnooze;
  final Future<void> Function() onConfirm;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              candidate.fullName,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text('${candidate.currentLabel}  →  ${candidate.nextLabel}'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final days in allowedSnoozeDays)
                  OutlinedButton(
                    onPressed: () => onSnooze(days),
                    child: Text('Delay $days d'),
                  ),
                FilledButton(
                  onPressed: onConfirm,
                  child: const Text('Confirm promotion'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
