import { View, StyleSheet, Platform } from 'react-native';

export default function WebShell({ children }) {
  if (Platform.OS !== 'web') return <View style={styles.mobileContainer}>{children}</View>;

  return (
    <View style={styles.webOuter}>
      <View style={styles.webContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  webOuter: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    width: '100%',
    height: '100%',
  },
  webContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
    zIndex: 1,
  },
});
