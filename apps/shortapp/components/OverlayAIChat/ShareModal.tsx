import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Icon from '../icons/SvgIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface ShareModalProps {
  visible: boolean;
  appClipLink: string;
  onClose: () => void;
  onShare: () => void;
  onUnpublish: () => void;
}

export default function ShareModal({ visible, appClipLink, onClose, onShare, onUnpublish }: ShareModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.shareModalOverlay}>
        <View style={styles.shareModalContainer}>
          {/* Title bar */}
          <View style={styles.shareModalHeader}>
            <Text style={styles.shareModalTitle}>Publish to AppClip</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.shareModalDoneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {/* Content area */}
          <View style={styles.shareModalContent}>
            {/* App Clip link */}
            <View style={styles.appClipLinkContainer}>
              <Text style={styles.appClipLink} numberOfLines={1}>
                {appClipLink}
              </Text>
            </View>
            
            {/* Description text */}
            <Text style={styles.shareDescription}>
              Share this App Clip link so others can open your app instantly — no installation required.
            </Text>
          </View>
          
          {/* Bottom buttons */}
          <View style={[
            styles.shareModalActions,
            { paddingBottom: 10 + insets.bottom }
          ]}>
            <TouchableOpacity 
              style={styles.unpublishButton} 
              onPress={onUnpublish}
            >
              <Text style={styles.unpublishButtonText}>Unpublish</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={onShare}
            >
              <Icon name="ShareOutline" size={16} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxHeight: height * 0.7,
    minHeight: height * 0.5,
    flex: 1,
    justifyContent: 'space-between',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  shareModalDoneButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  shareModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flex: 1,
    justifyContent: 'flex-start',
  },
  appClipLinkContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  appClipLink: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  shareDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
  },
  shareModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  unpublishButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  unpublishButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
