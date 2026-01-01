import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Icon from '../icons/SvgIcons';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

interface TopButtonsProps {
  onGoHome: () => void;
  onRefresh: () => void;
}

export default function TopButtons({ onGoHome, onRefresh }: TopButtonsProps) {
  const isIOS = Platform.OS === 'ios';

  return (
    <View style={styles.topButtonsBar}>
      <TouchableOpacity style={styles.homeButtonWrapper} onPress={onGoHome}>
        {isIOS && isLiquidGlassSupported ? (
          <LiquidGlassView
            style={styles.homeButtonGlass}
            interactive
            effect="clear"
          >
            <Icon name="Home" size={24} color="white" />
          </LiquidGlassView>
        ) : (
          <View style={styles.homeButtonFallback}>
            <Icon name="Home" size={24} color="white" />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.refreshButtonWrapper} onPress={onRefresh}>
        {isIOS && isLiquidGlassSupported ? (
          <LiquidGlassView
            style={styles.refreshButtonGlass}
            interactive
            effect="clear" // 使用 clear 类型的流动玻璃效果
          >
            <Icon name="Refresh" size={24} color="white" />
          </LiquidGlassView>
        ) : (
          <View style={styles.refreshButtonFallback}>
            <Icon name="Refresh" size={24} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topButtonsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  homeButtonWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: 'transparent',
  },
  homeButtonGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  homeButtonFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: 'transparent',
  },
  refreshButtonGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  refreshButtonFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
