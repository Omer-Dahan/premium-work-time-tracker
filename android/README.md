# Premium Work Time Tracker - Android App

This directory contains the production-ready Android application codebase, built with modern standards, Jetpack Compose, clean architecture (MVVM), Room DB, Hilt, and Excel Excel reports using Apache POI.

## Technical Specifications
- **Platform:** Android (Min SDK 26, Target SDK 35)
- **Language:** Kotlin (1.9.22+)
- **UI Toolkit:** Jetpack Compose (Material 3)
- **Architecture:** MVVM (Model-View-ViewModel) + Clean Architecture
- **Inversion of Control:** Hilt (for Dependency Injection)
- **Database:** Room Database (Offline-first, Local persistence)
- **Excel Generation:** Apache POI (`org.apache.poi:poi-ooxml`)
- **Localization:** XML String Resources (Dual-language RTL Hebrew and LTR English)

## Project Structure
```text
android/
├── app/
│   ├── build.gradle.kts           # Modules Gradle specifications & POI/Hilt dependencies
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml # Core app manifests & file sharing permissions
│           ├── java/com/timetracker/premium/
│           │   ├── MainActivity.kt # Entry point activity & Compose Navigation Setup
│           │   ├── data/
│           │   │   ├── AppDatabase.kt # Main Room database compiler
│           │   │   ├── Entities.kt    # Relational entity definitions
│           │   │   └── Repository.kt  # Centralized repository pattern
│           │   ├── ui/
│           │   │   ├── theme/
│           │   │   │   ├── Theme.kt   # High-end Black & White premium palettes
│           │   │   │   └── Color.kt   # Raw hex palettes
│           │   │   ├── viewModel/
│           │   │   │   └── TrackerViewModel.kt # State-matching logic (Timers, live updates)
│           │   │   └── screens/
│           │   │       ├── DashboardScreen.kt  # Prominent frictionless "Start" button
│           │   │       ├── ReportsScreen.kt    # Filtering tables & charts
│           │   │       └── SettingsScreen.kt   # Languages, export XML, about
│           │   └── export/
│           │       └── ExcelExporter.kt # Excel POI workbook generator (Bilingual)
│           └── res/
│               ├── values/
│               │   └── strings.xml      # English resources
│               └── values-he/
│                   └── strings.xml      # Hebrew RTL resources
└── build.gradle.kts                     # Project root Gradle configurations
```

## Setup & Run Instructions

1. **Prerequisites:**
   - Android Studio Koala (or newer).
   - JDK 17+ configured in Android Studio.

2. **Importing into Android Studio:**
   - Open Android Studio.
   - Choose **File > Open** or select **"Open an existing Android Studio project"** from the welcome window.
   - Select the `/android` folder in this workspace.

3. **Running the App:**
   - Select an emulator or connected physical Android device.
   - Click the green **Run** (Play) button in the top toolbar.

4. **Localization & RTL:**
   - The application supports English (LTR) and Hebrew (RTL) natively.
   - It will automatically respect the device system language or respect specific overrides when selected via the Settings panel.
