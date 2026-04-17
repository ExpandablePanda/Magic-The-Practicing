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
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webContainer: {
    width: '100%',
    maxWidth: 500,
    height: '100%',
    maxHeight: Platform.OS === 'web' ? '92vh' : '100%',
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    marginVertical: Platform.OS === 'web' ? 20 : 0,
  },
});
