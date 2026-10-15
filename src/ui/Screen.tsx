import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type ScreenProps = {
  children: ReactNode;
  /** Fixed above the scroll area, e.g. a back button + title. */
  header?: ReactNode;
  /** Fixed at the bottom: the screen's main action stays fully visible. */
  footer?: ReactNode;
  /** `bar` puts the footer on a white strip with a hairline on top (the billing pay bar). */
  footerStyle?: 'plain' | 'bar';
  /** `tab` screens sit above the tab bar, which owns the bottom safe area. */
  kind?: 'stack' | 'tab';
  scroll?: boolean;
};

/** Stone background, 20 side padding, no app-wide header bar (DESIGN.md · Layout). */
export function Screen({
  children,
  header,
  footer,
  footerStyle = 'plain',
  kind = 'stack',
  scroll = true,
}: ScreenProps) {
  const bottomSafe = kind === 'stack';
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, !footer && bottomSafe && styles.contentBottomSafe]}
      keyboardShouldPersistTaps="handled"
      // Number pads have no Done key: dragging the screen puts the keyboard away.
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      {header ? <View style={styles.header}>{header}</View> : <View style={styles.topInset} />}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            footerStyle === 'bar' && styles.footerBar,
            bottomSafe && styles.footerBottomSafe,
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: { flex: 1 },
  topInset: { height: rt.insets.top + theme.space.xs },
  header: {
    paddingTop: rt.insets.top + theme.space.xs,
    paddingBottom: theme.space.xs,
    paddingHorizontal: theme.space.screen,
  },
  content: {
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.xs,
    paddingBottom: theme.space.xl,
    gap: theme.space.gap,
  },
  contentBottomSafe: { paddingBottom: rt.insets.bottom + theme.space.xl },
  footer: {
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.sm,
    gap: theme.space.sm,
  },
  footerBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  footerBottomSafe: { paddingBottom: rt.insets.bottom + theme.space.sm },
}));
