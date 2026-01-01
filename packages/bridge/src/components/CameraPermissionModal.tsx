/**
 * CameraPermissionModal - 相机权限引导弹窗
 * 当用户需要开启相机权限时显示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';

interface CameraPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function CameraPermissionModal({
  visible,
  onClose,
  onOpenSettings,
}: CameraPermissionModalProps) {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  if (!visible) return null;

  const handleOpenSettings = () => {
    onOpenSettings();
    onClose();
  };

  return (
    <View style={styles.modalOverlay} pointerEvents="box-none">
      <View style={styles.modalWrapper} pointerEvents="box-none">
        {isIOS && isLiquidGlassSupported ? (
          <LiquidGlassView
            style={styles.modalContainer}
            interactive
            effect="clear"
          >
            <View style={styles.modalContent}>
              <Text style={styles.title}>相机权限未开启</Text>
              <Text style={styles.message}>
                请前往系统设置开启相机权限，以继续使用拍照功能。
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={handleOpenSettings}
                >
                  <Text style={styles.settingsButtonText}>去设置</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        ) : (
          <View style={[styles.modalContainer, styles.modalContainerFallback]}>
            <BlurView
              blurType="light"
              blurAmount={30}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalContent}>
              <Text style={styles.title}>相机权限未开启</Text>
              <Text style={styles.message}>
                请前往系统设置开启相机权限，以继续使用拍照功能。
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={handleOpenSettings}
                >
                  <Text style={styles.settingsButtonText}>去设置</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
  },
  modalWrapper: {
    width: '85%',
    maxWidth: 400,
    zIndex: 10001,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  modalContainerFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  settingsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FF6B20',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

