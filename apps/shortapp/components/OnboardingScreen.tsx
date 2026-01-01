import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ArrowForwardIcon } from './icons/SvgIcons';
// import { router } from 'expo-router'; // TODO: Replace with React Navigation if needed

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  currentIndex: number;
  onNext: () => void;
  onFinish: () => void;
}

const onboardingData = [
  {
    id: 1,
    title: 'Welcome to ShortApp',
    subtitle: 'Build any iPhone app you imagine',
    description: 'Create stunning mobile applications with the power of AI',
    icon: '🚀',
    color: '#FF6B35',
  },
  {
    id: 2,
    title: 'AI-Powered Development',
    subtitle: 'Just describe your idea',
    description: 'Our AI assistant helps you build complete apps from simple prompts',
    icon: '🤖',
    color: '#4ECDC4',
  },
  {
    id: 3,
    title: 'Instant Preview',
    subtitle: 'See your app in real-time',
    description: 'Preview your app instantly as you build with our live development environment',
    icon: '⚡',
    color: '#45B7D1',
  },
  {
    id: 4,
    title: 'Ready to Build?',
    subtitle: 'Let\'s create something amazing',
    description: 'Start building your dream app today with ShortApp\'s powerful tools',
    icon: '✨',
    color: '#96CEB4',
  },
];

export default function OnboardingScreen({ currentIndex, onNext, onFinish }: OnboardingScreenProps) {
  const currentData = onboardingData[currentIndex];
  const isLastScreen = currentIndex === onboardingData.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: currentData.color }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{currentData.icon}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{currentData.title}</Text>
          <Text style={styles.subtitle}>{currentData.subtitle}</Text>
          <Text style={styles.description}>{currentData.description}</Text>
        </View>

        <View style={styles.paginationContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {!isLastScreen ? (
            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <ArrowForwardIcon size={20} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.finishButton} onPress={onFinish}>
              <Text style={styles.finishButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 60,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  finishButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
