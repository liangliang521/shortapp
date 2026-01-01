import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import Icon from '../icons/SvgIcons';

const { height } = Dimensions.get('window');

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

interface ModelModalProps {
  visible: boolean;
  selectedModel: string;
  modelOptions: ModelOption[];
  onClose: () => void;
  onModelSelect: (modelId: string) => void;
  onViewPricing: () => void;
}

export default function ModelModal({
  visible,
  selectedModel,
  modelOptions,
  onClose,
  onModelSelect,
  onViewPricing,
}: ModelModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modelModalOverlay}>
        <View style={styles.modelModalContainer}>
          <View style={styles.modelModalHeader}>
            <Text style={styles.modelModalTitle}>Model Selection</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="Close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modelModalContent}>
            {/* <TouchableOpacity 
              style={styles.viewPricingButton} 
              onPress={onViewPricing}
            >
              <Text style={styles.viewPricingText}>View pricing</Text>
            </TouchableOpacity> */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modelListContent}
            >
            {modelOptions.map((model) => (
              <TouchableOpacity 
                key={model.id}
                style={[
                  styles.modelOptionButton,
                  selectedModel === model.id && styles.modelOptionButtonSelected
                ]} 
                onPress={() => onModelSelect(model.id)}
              >
                <View style={styles.modelInfo}>
                  <Text style={[
                    styles.modelName,
                    selectedModel === model.id && styles.modelNameSelected
                  ]}>
                    {model.name}
                  </Text>
                  <Text style={styles.modelDescription}>{model.description}</Text>
                </View>
                {selectedModel === model.id && (
                  <Icon name="Checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modelModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxHeight: height * 0.5,
    minHeight: height * 0.35,
  },
  modelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modelModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modelModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20 + 34, // Bottom safe area
    maxHeight: height * 0.5 - 56, // 留出 header 高度，列表区域可滚动
  },
  viewPricingButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  viewPricingText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modelOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  modelOptionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 4,
  },
  modelNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modelDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modelListContent: {
    paddingBottom: 12,
  },
});
