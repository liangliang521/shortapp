import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Icon from '../icons/SvgIcons';

const { height } = Dimensions.get('window');

interface BuildModalProps {
  visible: boolean;
  onClose: () => void;
  onBuildAction: (action: string) => void;
}

export default function BuildModal({ visible, onClose, onBuildAction }: BuildModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.buildModalOverlay}>
        <View style={styles.buildModalContainer}>
          <View style={styles.buildModalHeader}>
            <Text style={styles.buildModalTitle}>Build</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="Close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.buildModalContent}>
            <TouchableOpacity 
              style={styles.buildOptionButton} 
              onPress={() => onBuildAction('build')}
            >
              <Icon name="Build" size={20} color="#007AFF" />
              <Text style={styles.buildOptionText}>Build</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.buildOptionButton} 
              onPress={() => onBuildAction('plan')}
            >
              <Icon name="Document" size={20} color="#007AFF" />
              <Text style={styles.buildOptionText}>Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buildModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  buildModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxHeight: height * 0.4,
    minHeight: height * 0.25,
  },
  buildModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  buildModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  buildModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20 + 34, // Bottom safe area
  },
  buildOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  buildOptionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
