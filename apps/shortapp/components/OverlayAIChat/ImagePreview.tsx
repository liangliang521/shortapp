import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import Icon from '../icons/SvgIcons';

interface ImagePreviewProps {
  selectedImages: string[]; // base64数组（data:image/jpeg;base64,...）
  onRemoveImage: (index: number) => void;
}

export default function ImagePreview({ selectedImages, onRemoveImage }: ImagePreviewProps) {
  if (selectedImages.length === 0) {
    return null;
  }

  return (
    <View style={styles.imagePreviewContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.imagePreviewScroll}
        contentContainerStyle={styles.scrollContent}
      >
        {selectedImages.map((imageBase64, index) => (
          <View key={index} style={styles.imagePreviewItem}>
            <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.removeImageButton} 
              onPress={() => {
                console.log('🗑️ Removing image at index:', index);
                onRemoveImage(index);
              }}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              activeOpacity={0.7}
            >
              <Icon name="CloseCircle" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  imagePreviewContainer: {
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
    paddingBottom: 12,
  },
  imagePreviewScroll: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: 5,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 15,
    marginVertical: 5,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
