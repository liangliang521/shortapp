import  { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { CheckmarkCircleIcon, ImageIcon, ChatbubblesIcon, SettingsIcon, ShareIcon } from '../components/icons/SvgIcons';
import OverlayAIChat from './OverlayAIChat';

interface FullScreenPreviewProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
  onOpenAIChat: () => void;
}

const { width, height } = Dimensions.get('window');

export default function FullScreenPreview({ 
  projectId, 
  projectName, 
  onBack, 
  onOpenAIChat 
}: FullScreenPreviewProps) {
  const [showMenu, setShowMenu]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false);
  const [showOverlayChat, setShowOverlayChat]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false);

  // 模拟项目数据
  const projectData = {
    '1': {
      name: 'Photo Organizer',
      description: 'A feature-complete photo management app with upload, categorization and management support',
      features: ['Photo Upload', 'Smart Classification', 'Search Function', 'Cloud Sync'],
      mockImages: [
        { id: 1, url: 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=Photo+1' },
        { id: 2, url: 'https://via.placeholder.com/300x200/34C759/FFFFFF?text=Photo+2' },
        { id: 3, url: 'https://via.placeholder.com/300x200/007AFF/FFFFFF?text=Photo+3' },
        { id: 4, url: 'https://via.placeholder.com/300x200/FF9500/FFFFFF?text=Photo+4' },
      ],
    },
    '2': {
      name: 'Note Taking App',
      description: 'Clean and efficient note-taking app with rich text editing and tag management',
      features: ['Rich Text Editing', 'Tag Management', 'Search Function', 'Export Feature'],
      mockImages: [
        { id: 1, url: 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=Note+1' },
        { id: 2, url: 'https://via.placeholder.com/300x200/34C759/FFFFFF?text=Note+2' },
        { id: 3, url: 'https://via.placeholder.com/300x200/007AFF/FFFFFF?text=Note+3' },
      ],
    },
    '3': {
      name: 'Weather Widget',
      description: 'Beautiful weather widget providing real-time weather information and forecasts',
      features: ['Real-time Weather', 'Multi-city Support', 'Weather Forecast', 'Desktop Widget'],
      mockImages: [
        { id: 1, url: 'https://via.placeholder.com/300x200/87CEEB/FFFFFF?text=Sunny' },
        { id: 2, url: 'https://via.placeholder.com/300x200/708090/FFFFFF?text=Cloudy' },
        { id: 3, url: 'https://via.placeholder.com/300x200/4682B4/FFFFFF?text=Rainy' },
      ],
    },
  };

  const project = projectData[projectId as keyof typeof projectData] || projectData['1'];

  // Monitor status changes
  useEffect(() => {
    console.log('🔄 showOverlayChat changed:', showOverlayChat);
  }, [showOverlayChat]);

  useEffect(() => {
    console.log('🔄 showMenu changed:', showMenu);
  }, [showMenu]);

  const handleMenuPress = () => {
    console.log('🎯 Menu button pressed - opening AI chat directly');
    setShowMenu(false); // Ensure menu is closed
    setShowOverlayChat((prev) => {
      console.log(`📝 showOverlayChat changing from ${prev} to true`);
      return true;
    });
  };

  const handleAIChatPress = () => {
    console.log('=== 🎯 AI Chat Press ===');
    console.log(`📝 Before: showMenu = ${showMenu}, showOverlayChat = ${showOverlayChat}`);
    
    setShowMenu(false);
    setShowOverlayChat((prev) => {
      console.log(`📝 showOverlayChat changing from ${prev} to true`);
      return true;
    });
    
    // Delayed status check
    setTimeout(() => {
      console.log('⏰ After 100ms: showOverlayChat should be true');
    }, 100);
  };

  const handleCloseOverlayChat = () => {
    console.log('=== 🚪 Close Overlay Chat ===');
    setShowOverlayChat((prev) => {
      console.log(`📝 showOverlayChat changing from ${prev} to false`);
      return false;
    });
  };

  console.log('🎨 FullScreenPreview render - showMenu:', showMenu, ', showOverlayChat:', showOverlayChat);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* Main content - simulated app interface */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App header */}
        <View style={styles.appHeader}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>
              {project.name.charAt(0)}
            </Text>
          </View>
          <Text style={styles.appTitle}>{project.name}</Text>
          <Text style={styles.appSubtitle}>{project.description}</Text>
        </View>

        {/* Feature showcase area */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Main Features</Text>
          <View style={styles.featuresGrid}>
            {project.features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <CheckmarkCircleIcon size={24} color="#34C759" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Simulated content area */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Content Preview</Text>
          <View style={styles.imageGrid}>
            {project.mockImages.map((image) => (
              <View key={image.id} style={styles.imageCard}>
                <View style={styles.imagePlaceholder}>
                  <ImageIcon size={40} color="#8E8E93" />
                </View>
                <Text style={styles.imageLabel}>Image {image.id}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating AI chat button */}
      <TouchableOpacity 
        style={styles.floatingMenuButton} 
        onPress={handleMenuPress}
        activeOpacity={0.8}
      >
        <ChatbubblesIcon size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Menu background overlay - must render first so menu items can be on top */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuBackdrop} 
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        />
      )}

      {/* Menu options - render later to ensure clickable above overlay */}
      {showMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleAIChatPress}
          >
            <ChatbubblesIcon size={20} color="#FFFFFF" />
            <Text style={styles.menuItemText}>AI Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowMenu(false)}
          >
            <SettingsIcon size={20} color="#FFFFFF" />
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowMenu(false)}
          >
            <ShareIcon size={20} color="#FFFFFF" />
            <Text style={styles.menuItemText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* AI chat overlay */}
      <OverlayAIChat
        isVisible={showOverlayChat}
        onClose={handleCloseOverlayChat}
        onGoHome={onBack}
        projectId={projectId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  contentSection: {
    padding: 20,
    paddingTop: 0,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageCard: {
    width: '48%',
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  floatingMenuButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuOverlay: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 2, // 确保在遮罩上层
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1, // 在菜单下层
  },
});
