import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Icon from '../icons/SvgIcons';
import { Category } from '@vibecoding/api-client/src/types';

const { height } = Dimensions.get('window');

interface CategoryModalProps {
  visible: boolean;
  selectedCategoryKey: string | null;
  categories: Category[];
  onClose: () => void;
  onCategorySelect: (categoryKey: string) => void;
}

export default function CategoryModal({
  visible,
  selectedCategoryKey,
  categories,
  onClose,
  onCategorySelect,
}: CategoryModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {isLiquidGlassSupported ? (
          <LiquidGlassView effect="clear" style={styles.modalContainerLiquid}>
            <View style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity onPress={onClose}>
                  <Icon name="Close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {categories.map((category) => (
                  <TouchableOpacity 
                    key={category.id}
                    style={[
                      styles.categoryOptionButton,
                      selectedCategoryKey === category.key && styles.categoryOptionButtonSelected
                    ]} 
                    onPress={() => {
                      onCategorySelect(category.key);
                      onClose();
                    }}
                  >
                    <View style={styles.categoryInfo}>
                      <Text style={[
                        styles.categoryName,
                        selectedCategoryKey === category.key && styles.categoryNameSelected
                      ]}>
                        {category.name}
                      </Text>
                      {category.description && (
                        <Text style={styles.categoryDescription}>{category.description}</Text>
                      )}
                    </View>
                    {selectedCategoryKey === category.key && (
                      <Icon name="Checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </LiquidGlassView>
        ) : (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={onClose}>
                <Icon name="Close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity 
                  key={category.id}
                  style={[
                    styles.categoryOptionButton,
                    selectedCategoryKey === category.key && styles.categoryOptionButtonSelected
                  ]} 
                  onPress={() => {
                    onCategorySelect(category.key);
                    onClose();
                  }}
                >
                  <View style={styles.categoryInfo}>
                    <Text style={[
                      styles.categoryName,
                      selectedCategoryKey === category.key && styles.categoryNameSelected
                    ]}>
                      {category.name}
                    </Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>{category.description}</Text>
                    )}
                  </View>
                  {selectedCategoryKey === category.key && (
                    <Icon name="Checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainerLiquid: {
    width: '100%',
    maxHeight: height * 0.6,
    minHeight: height * 0.4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxHeight: height * 0.6,
    minHeight: height * 0.4,
  },
  modalInner: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20 + 34, // Bottom safe area
  },
  categoryOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryOptionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

