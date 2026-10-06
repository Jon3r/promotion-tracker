import 'package:flutter/material.dart';

/// PJA brand — matches Next.js dashboard (`#1914a6`, `#ffbe00`).
class PjaColors {
  static const blue = Color(0xFF1914A6);
  static const blueHover = Color(0xFF141288);
  static const gold = Color(0xFFFFBE00);
  static const goldHover = Color(0xFFE6AB00);
  static const white = Color(0xFFFFFFFF);
  static const ink = Color(0xFF171717);
}

ThemeData buildPjaTheme() {
  const font = 'LibreFranklin';
  final colorScheme = ColorScheme.light(
    primary: PjaColors.blue,
    onPrimary: PjaColors.white,
    secondary: PjaColors.gold,
    onSecondary: PjaColors.blue,
    surface: PjaColors.white,
    onSurface: PjaColors.ink,
  );

  final textTheme = ThemeData.light().textTheme.apply(
    fontFamily: font,
    bodyColor: PjaColors.ink,
    displayColor: PjaColors.ink,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    fontFamily: font,
    scaffoldBackgroundColor: PjaColors.white,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: PjaColors.blue,
      foregroundColor: PjaColors.white,
      elevation: 0,
      titleTextStyle: textTheme.titleLarge?.copyWith(
        color: PjaColors.white,
        fontWeight: FontWeight.w600,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: PjaColors.white,
      indicatorColor: PjaColors.gold.withValues(alpha: 0.35),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontFamily: font,
          fontSize: 12,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          color: selected ? PjaColors.blue : Colors.black54,
        );
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PjaColors.blue,
        foregroundColor: PjaColors.white,
        textStyle: const TextStyle(fontFamily: font, fontWeight: FontWeight.w600),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: PjaColors.gold,
        foregroundColor: PjaColors.blue,
        textStyle: const TextStyle(fontFamily: font, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: PjaColors.blue,
        side: const BorderSide(color: PjaColors.blue),
        textStyle: const TextStyle(fontFamily: font, fontWeight: FontWeight.w600),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: PjaColors.gold.withValues(alpha: 0.25),
      selectedColor: PjaColors.gold,
      labelStyle: const TextStyle(fontFamily: font, color: PjaColors.blue, fontSize: 12),
      secondaryLabelStyle: const TextStyle(fontFamily: font, color: PjaColors.blue),
    ),
  );
}
