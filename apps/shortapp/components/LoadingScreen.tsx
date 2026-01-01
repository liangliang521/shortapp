import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from './icons/SvgIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadingScreenProps {
  onComplete: () => void;
  projectName?: string;
}

const { width } = Dimensions.get('window');

export default function LoadingScreen({ onComplete, projectName = 'Your App' }: LoadingScreenProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const steps = [
    { text: 'Acquiring sandbox', subtext: 'Waiting for the sandbox engine...' },
    { text: 'Building', subtext: 'anthropic has begun execution' },
    { text: 'ShortApp Agent', subtext: 'I will create a fully functional app for you with all the described features. Let me first understand the existing project structure.' },
    { text: 'Reading file', subtext: 'Read: package.json' },
    { text: 'Generating code', subtext: 'Creating app components and logic...' },
    { text: 'Finalizing', subtext: 'Almost ready...' },
  ];

  useEffect(() => {
    const animateProgress = () => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 8000, // 8 seconds total
        useNativeDriver: false,
      }).start();
    };

    const updateStep = () => {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(onComplete, 1000);
            return prev;
          }
        });
      }, 1200);

      return interval;
    };

    // Add progress listener
    const progressListener = progress.addListener(({ value }) => {
      setProgressPercent(Math.round(value * 100));
    });

    animateProgress();
    const stepInterval = updateStep();

    return () => {
      clearInterval(stepInterval);
      progress.removeListener(progressListener);
    };
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 80],
  });

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(!menuVisible)}>
          <Text style={styles.menuText}>MENU</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚡</Text>
        </View>
        
        <Text style={styles.title}>Creating {projectName}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>

        <Text style={styles.downloadingText}>Downloading...</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <View style={styles.stepIconContainer}>
                {index <= currentStep ? (
                  <View style={[styles.stepIcon, styles.stepIconActive]}>
                    <Text style={styles.stepIconText}>●</Text>
                  </View>
                ) : (
                  <View style={[styles.stepIcon, styles.stepIconInactive]}>
                    <Text style={styles.stepIconTextInactive}>○</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepText,
                  index <= currentStep ? styles.stepTextActive : styles.stepTextInactive
                ]}>
                  {step.text}
                </Text>
                {index === currentStep && (
                  <Text style={styles.stepSubtext}>{step.subtext}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Menu Overlay */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="HomeOutline" size={20} color="#000" />
            <Text style={styles.menuItemText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="SettingsOutline" size={20} color="#000" />
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="Help" size={20} color="#000" />
            <Text style={styles.menuItemText}>Help</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'flex-end',
  },
  menuButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  downloadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 40,
  },
  stepsContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  stepIconContainer: {
    marginRight: 16,
    marginTop: 2,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconActive: {
    backgroundColor: '#FF6B35',
  },
  stepIconInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepIconText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  stepIconTextInactive: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 16,
    marginBottom: 4,
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepTextInactive: {
    color: 'rgba(255,255,255,0.5)',
  },
  stepSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  menuOverlay: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    color: '#000',
    marginLeft: 12,
  },
});
