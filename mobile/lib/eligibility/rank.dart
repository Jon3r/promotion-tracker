class ParsedRank {
  const ParsedRank({
    required this.belt,
    required this.stripes,
    required this.label,
    required this.raw,
  });

  final String belt;
  final int? stripes;
  final String label;
  final String raw;
}

const adultBeltOrder = ['white', 'blue', 'purple', 'brown', 'black'];

const kidsBeltOrder = [
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

const _compoundBelts = <String, List<String>>{
  'greywhite': [
    'grey/white',
    'grey white',
    'grey-white',
    'greywhite',
    'grey&white',
    'gray/white',
    'gray white',
    'gray-white',
    'graywhite',
  ],
  'greyblack': [
    'grey/black',
    'grey black',
    'grey-black',
    'greyblack',
    'gray/black',
    'gray black',
  ],
  'yellowwhite': ['yellow/white', 'yellow white', 'yellow-white', 'yellowwhite'],
  'yellowblack': ['yellow/black', 'yellow black', 'yellow-black', 'yellowblack'],
  'orangewhite': ['orange/white', 'orange white', 'orange-white', 'orangewhite'],
  'orangeblack': ['orange/black', 'orange black', 'orange-black', 'orangeblack'],
  'greenwhite': [
    'green/white',
    'green white',
    'green-white',
    'greenwhite',
    'green&white',
    'green & white',
  ],
  'greenblack': ['green/black', 'green black', 'green-black', 'greenblack'],
};

const _simpleBelts = <String, List<String>>{
  'purple': ['purple'],
  'brown': ['brown'],
  'black': ['black'],
  'white': ['white'],
  'blue': ['blue'],
  'grey': ['grey', 'gray'],
  'yellow': ['yellow'],
  'orange': ['orange'],
  'green': ['green'],
};

const stripeLabels = <String, String>{
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
  'unknown': 'Unknown',
};

bool _rankPatternMatches(String normalised, String pattern) {
  final p = pattern.replaceAll(RegExp(r'\s+'), ' ');
  if (RegExp(r'[\s/\-&]').hasMatch(p)) {
    return normalised.contains(p);
  }
  final escaped = RegExp.escape(p);
  return RegExp('\\b$escaped\\b').hasMatch(normalised);
}

ParsedRank normaliseRank(String? raw) {
  final original = raw?.trim() ?? '';
  if (original.isEmpty) {
    return const ParsedRank(
      belt: 'unknown',
      stripes: null,
      label: 'Unknown',
      raw: '',
    );
  }

  final normalised = original.toLowerCase().replaceAll(RegExp(r'\s+'), ' ');

  var belt = 'unknown';
  for (final entry in _compoundBelts.entries) {
    if (entry.value.any((p) => _rankPatternMatches(normalised, p))) {
      belt = entry.key;
      break;
    }
  }
  if (belt == 'unknown') {
    for (final entry in _simpleBelts.entries) {
      if (entry.value.any((p) => _rankPatternMatches(normalised, p))) {
        belt = entry.key;
        break;
      }
    }
  }

  int? stripes;
  final stripeMatch = RegExp(r'(\d)\s*stripe').firstMatch(normalised);
  if (stripeMatch != null) {
    stripes = int.parse(stripeMatch.group(1)!);
  }

  final beltLabel = stripeLabels[belt] ?? belt;
  late final String label;
  if (stripes != null) {
    label =
        '$beltLabel Belt · $stripes stripe${stripes == 1 ? '' : 's'}';
  } else if (normalised.contains('belt')) {
    label = '$beltLabel Belt';
  } else {
    label = original;
  }

  return ParsedRank(
    belt: belt,
    stripes: stripes,
    label: label,
    raw: original,
  );
}

int beltSortIndex(String belt, String category) {
  final order = category == 'kids' ? kidsBeltOrder : adultBeltOrder;
  final idx = order.indexOf(belt);
  return idx == -1 ? 999 : idx;
}

String beltDisplayName(String belt) => stripeLabels[belt] ?? belt;
