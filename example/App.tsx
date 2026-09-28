import React from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ActionButtons } from './src/components/ActionButtons';
import { Header } from './src/components/Header';
import { PlatformWarning } from './src/components/PlatformWarning';
import { ResultCard } from './src/components/ResultCard';
import { StatusCard } from './src/components/StatusCard';
import { COLORS } from './src/constants/theme';
import { useCutoutDemo } from './src/hooks/useCutoutDemo';

export default function App() {
  const { phase, saving, pickAndCutout, saveCutoutToGallery } = useCutoutDemo();

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Header />
          <PlatformWarning />
          <ActionButtons disabled={phase.kind === 'loading'} onUpload={() => pickAndCutout()} />

          {(phase.kind === 'loading' || phase.kind === 'error') && <StatusCard phase={phase} />}

          {phase.kind === 'done' && (
            <ResultCard
              result={phase.result}
              sourceUri={phase.source}
              saving={saving}
              onSave={saveCutoutToGallery}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 60,
  },
});
