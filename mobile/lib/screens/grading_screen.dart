import 'package:flutter/material.dart';

import '../models/grading.dart';
import '../services/grading_api.dart';
import '../theme/pja_theme.dart';

const _adultBelts = ['white', 'blue', 'purple', 'brown', 'black'];
const _kidsBelts = [
  'white',
  'greywhite',
  'grey',
  'greyblack',
  'yellowwhite',
  'yellow',
  'yellowblack',
  'orangewhite',
  'orange',
  'orangeblack',
  'greenwhite',
  'green',
  'greenblack',
];

String _beltLabel(String belt) {
  const labels = {
    'white': 'White',
    'blue': 'Blue',
    'purple': 'Purple',
    'brown': 'Brown',
    'black': 'Black',
    'grey': 'Grey',
    'greywhite': 'Grey/White',
    'greyblack': 'Grey/Black',
    'yellow': 'Yellow',
    'yellowwhite': 'Yellow/White',
    'yellowblack': 'Yellow/Black',
    'orange': 'Orange',
    'orangewhite': 'Orange/White',
    'orangeblack': 'Orange/Black',
    'green': 'Green',
    'greenwhite': 'Green/White',
    'greenblack': 'Green/Black',
    'unknown': 'Needs review',
  };
  return labels[belt] ?? belt;
}

class GradingScreen extends StatefulWidget {
  const GradingScreen({super.key, required this.api, this.demoMode = false});

  final GradingApiClient api;
  final bool demoMode;

  @override
  State<GradingScreen> createState() => _GradingScreenState();
}

class _GradingScreenState extends State<GradingScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  GradingRoster? _roster;
  Set<String> _excluded = {};
  String _search = '';
  String _beltFilter = 'all';
  bool _readyOnly = false;
  bool _loading = true;
  String? _error;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) setState(() => _beltFilter = 'all');
    });
    _bootstrap();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      Set<String> excluded = {};
      try {
        excluded = await widget.api.loadExcludedKeys().timeout(
          const Duration(milliseconds: 200),
          onTimeout: () => <String>{},
        );
      } catch (_) {
        // Prefs unavailable in some test / web environments.
      }
      if (widget.demoMode || !widget.api.isConfigured) {
        setState(() {
          _excluded = excluded;
          _roster = _demoRoster();
          _loading = false;
        });
        return;
      }
      final roster = await widget.api.loadRoster();
      setState(() {
        _excluded = excluded;
        _roster = roster;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
        if (widget.demoMode) {
          _roster = _demoRoster();
          _error = null;
        }
      });
    }
  }

  String get _category => _tabs.index == 0 ? 'adults' : 'kids';

  List<GradingStudent> get _activeList {
    final roster = _roster;
    if (roster == null) return [];
    final source = _category == 'adults' ? roster.adults : roster.kids;
    final q = _search.trim().toLowerCase();
    return source.where((s) {
      final key = '${_category}:${s.contactKey ?? s.fullName}';
      if (_excluded.contains(key)) return false;
      if (_readyOnly && !s.readyToPromote) return false;
      if (_beltFilter != 'all' && s.currentBelt != _beltFilter) return false;
      if (q.isEmpty) return true;
      return s.fullName.toLowerCase().contains(q) ||
          s.currentRank.toLowerCase().contains(q) ||
          s.nextRank.toLowerCase().contains(q);
    }).toList()
      ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
  }

  Future<void> _exclude(GradingStudent student) async {
    final key = '${_category}:${student.contactKey ?? student.fullName}';
    final next = {..._excluded, key};
    await widget.api.setExcludedKeys(next);
    setState(() => _excluded = next);
  }

  Future<void> _restoreExcluded() async {
    final prefix = '$_category:';
    final next = _excluded.where((k) => !k.startsWith(prefix)).toSet();
    await widget.api.setExcludedKeys(next);
    setState(() => _excluded = next);
  }

  Future<void> _setOverride(GradingStudent student, String? belt) async {
    final contactKey = student.contactKey;
    if (contactKey == null || contactKey.isEmpty) {
      _toast('No ClubWorx contact key for this student');
      return;
    }
    if (!widget.api.isConfigured) {
      _toast('Set GRADING_API_BASE to save overrides');
      return;
    }
    try {
      await widget.api.setGradingOverride(
        category: _category,
        contactKey: contactKey,
        gradingBelt: belt,
      );
      await _bootstrap();
      _toast(belt == null || belt.isEmpty ? 'Override cleared' : 'Grading belt saved');
    } catch (e) {
      _toast(e.toString());
    }
  }

  Future<void> _sync() async {
    if (!widget.api.isConfigured) {
      _toast('Set GRADING_API_BASE to sync');
      return;
    }
    setState(() => _syncing = true);
    try {
      final result = await widget.api.syncFromClubWorx();
      await _bootstrap();
      _toast('Synced ${result.adultsCount} adults, ${result.kidsCount} kids');
    } catch (e) {
      _toast(e.toString());
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final belts = _category == 'adults' ? _adultBelts : _kidsBelts;
    final hidden = _excluded.where((k) => k.startsWith('$_category:')).length;

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
            const Flexible(child: Text('Grading roster')),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _bootstrap,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Sync from ClubWorx',
            onPressed: _syncing || _loading ? null : _sync,
            icon: _syncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.cloud_sync_outlined),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: PjaColors.gold,
          unselectedLabelColor: Colors.white70,
          indicatorColor: PjaColors.gold,
          tabs: [
            Tab(text: 'Adults (${_roster?.adults.length ?? 0})'),
            Tab(text: 'Kids (${_roster?.kids.length ?? 0})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (!widget.api.isConfigured)
                  Container(
                    width: double.infinity,
                    color: PjaColors.gold.withValues(alpha: 0.25),
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      widget.demoMode
                          ? 'Demo grading roster (set GRADING_API_BASE for live data).'
                          : 'GRADING_API_BASE not set — pass --dart-define=GRADING_API_BASE=https://…',
                      style: const TextStyle(color: PjaColors.blue),
                    ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(_error!, style: const TextStyle(color: Colors.red)),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: TextField(
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'Search name or rank',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _beltFilter,
                          decoration: const InputDecoration(
                            labelText: 'Belt',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          items: [
                            const DropdownMenuItem(value: 'all', child: Text('All belts')),
                            ...belts.map(
                              (b) => DropdownMenuItem(
                                value: b,
                                child: Text(_beltLabel(b)),
                              ),
                            ),
                          ],
                          onChanged: (v) => setState(() => _beltFilter = v ?? 'all'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        label: const Text('Ready'),
                        selected: _readyOnly,
                        onSelected: (v) => setState(() => _readyOnly = v),
                      ),
                    ],
                  ),
                ),
                if (hidden > 0)
                  ListTile(
                    dense: true,
                    title: Text('$hidden hidden on this phone'),
                    trailing: TextButton(onPressed: _restoreExcluded, child: const Text('Show all')),
                  ),
                if (_roster?.updatedAt != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Updated ${_roster!.updatedAt}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ),
                Expanded(
                  child: _activeList.isEmpty
                      ? const Center(child: Text('No students match filters'))
                      : ListView.separated(
                          itemCount: _activeList.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final s = _activeList[index];
                            return ListTile(
                              title: Text(s.fullName),
                              subtitle: Text(
                                '${s.currentRank}\nNext: ${s.nextRank.isEmpty ? '—' : s.nextRank}'
                                '${s.gradingBeltOverride != null ? '\nOverride: ${_beltLabel(s.gradingBeltOverride!)}' : ''}',
                              ),
                              isThreeLine: true,
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (s.readyToPromote)
                                    const Padding(
                                      padding: EdgeInsets.only(right: 4),
                                      child: Chip(
                                        label: Text('READY'),
                                        visualDensity: VisualDensity.compact,
                                        padding: EdgeInsets.zero,
                                      ),
                                    ),
                                  PopupMenuButton<String>(
                                    onSelected: (value) async {
                                      if (value == 'exclude') {
                                        await _exclude(s);
                                      } else if (value == 'clear') {
                                        await _setOverride(s, null);
                                      } else {
                                        await _setOverride(s, value);
                                      }
                                    },
                                    itemBuilder: (context) => [
                                      ...belts.map(
                                        (b) => PopupMenuItem(
                                          value: b,
                                          child: Text('Grade as ${_beltLabel(b)}'),
                                        ),
                                      ),
                                      const PopupMenuItem(
                                        value: 'clear',
                                        child: Text('Clear grading override'),
                                      ),
                                      const PopupMenuItem(
                                        value: 'exclude',
                                        child: Text('Hide on this phone'),
                                      ),
                                    ],
                                  ),
                                ],
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

GradingRoster _demoRoster() {
  return const GradingRoster(
    updatedAt: 'demo',
    adults: [
      GradingStudent(
        contactKey: 'demo-adult-1',
        memberStyleId: 1,
        fullName: 'Alex Adult',
        currentRank: 'Purple Belt 3 stripe',
        nextRank: 'Purple Belt 4 stripe',
        beltSize: 'A2',
        email: 'alex@example.com',
        phone: '',
        currentBelt: 'purple',
        nextBelt: 'purple',
        gradingBelt: 'purple',
        gradingBeltOverride: null,
        readyToPromote: true,
      ),
      GradingStudent(
        contactKey: 'demo-adult-2',
        memberStyleId: 2,
        fullName: 'Sam Brown',
        currentRank: 'Brown Belt 1 stripe',
        nextRank: 'Brown Belt 2 stripe',
        beltSize: 'A3',
        email: '',
        phone: '',
        currentBelt: 'brown',
        nextBelt: 'brown',
        gradingBelt: 'brown',
        gradingBeltOverride: null,
        readyToPromote: true,
      ),
    ],
    kids: [
      GradingStudent(
        contactKey: 'demo-kid-1',
        memberStyleId: 3,
        fullName: 'Kim Kid',
        currentRank: 'Orange Black Belt',
        nextRank: 'Green Belt',
        beltSize: 'M2',
        email: '',
        phone: '',
        currentBelt: 'orangeblack',
        nextBelt: 'green',
        gradingBelt: 'greenwhite',
        gradingBeltOverride: null,
        readyToPromote: true,
      ),
    ],
  );
}
