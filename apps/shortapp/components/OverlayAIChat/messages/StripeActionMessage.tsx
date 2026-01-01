import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';
import { httpClient } from '@vibecoding/api-client';

interface StripeActionMessageProps {
  message: ChatMessage;
  onPress?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  projectId?: string;
}

export default function StripeActionMessage({ message, onPress, onContinue, onSkip, projectId }: StripeActionMessageProps) {
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isStep2Expanded, setIsStep2Expanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 🔍 打印历史消息中的 Stripe action 消息信息
  useEffect(() => {
    console.log('🔍 [StripeActionMessage] Component mounted/updated:', {
      messageId: message.id,
      messageType: message.type,
      metadata: message.metadata,
      hasSubtype: !!message.metadata?.subtype,
      subtype: message.metadata?.subtype,
      isStripe: message.metadata?.subtype === 'stripe',
      fullMessage: JSON.stringify(message, null, 2),
    });
    
    // 检查 metadata 中是否有已保存的状态
    const metadata = message.metadata;
    const isSubmitted = metadata?.isSubmitted === true;
    // 兼容其他可能的字段名（向后兼容）
    const metadataAny = metadata as any;
    const hasOtherSavedFlags = metadataAny?.isSaved || metadataAny?.isSuccess || metadataAny?.saved || 
                               metadataAny?.is_submitted === true || metadataAny?.is_submitted === 'true';
    
    if (isSubmitted || hasOtherSavedFlags) {
      console.log('✅ [StripeActionMessage] Found saved state in metadata, setting isSuccess to true', {
        isSubmitted,
        isSubmittedValue: metadata?.isSubmitted,
        hasOtherSavedFlags,
        metadataKeys: Object.keys(metadata || {}),
      });
      setIsSuccess(true);
    } else {
      console.log('❌ [StripeActionMessage] No saved state found in metadata', {
        isSubmitted: metadata?.isSubmitted,
        metadataKeys: Object.keys(metadata || {}),
        fullMetadata: metadata,
      });
    }
  }, [message]);

  const handleSave = async () => {
    console.log('💾 [StripeActionMessage] handleSave called');
    // 使用 metadata.actionId 作为 action ID（来自 data._id）
    const actionId = message.metadata?.actionId || message.id;
    
    console.log('💾 [StripeActionMessage] Current state:', {
      publishableKey: publishableKey ? `${publishableKey.substring(0, 10)}...` : 'empty',
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : 'empty',
      projectId,
      messageId: message.id,
      actionId: actionId,
      isSubmitting,
      isSuccess,
    });

    if (!publishableKey.trim() || !secretKey.trim()) {
      Alert.alert('Error', 'Please fill in both Publishable Key and Secret Key');
      return;
    }

    // if (!publishableKey.startsWith('pk_live_')) {
    //   Alert.alert('Error', 'Invalid publishable key format. It should start with pk_live_');
    //   return;
    // }

    // if (!secretKey.startsWith('sk_live_')) {
    //   Alert.alert('Error', 'Invalid secret key format. It should start with sk_live_');
    //   return;
    // }

    if (!projectId) {
      Alert.alert('Error', 'Project ID is missing');
      return;
    }

    if (!actionId) {
      Alert.alert('Error', 'Action ID is missing');
      return;
    }

    console.log('💾 [StripeActionMessage] Setting isSubmitting to true');
    setIsSubmitting(true);

    try {
      console.log('💾 [StripeActionMessage] Calling configureIntegration API with actionId:', actionId);
      // 调用 API 提交 Stripe keys，使用 metadata.actionId
      const response = await httpClient.configureIntegration(
        projectId,
        'stripe',
        actionId,
        {
          publicKey: publishableKey.trim(),
          secretKey: secretKey.trim(),
        }
      );

      console.log('💾 [StripeActionMessage] API response received:', {
        code: response.code,
        info: response.info,
        data: response.data,
        fullResponse: JSON.stringify(response, null, 2),
      });

      if (response.code === 0) {
        console.log('✅ [StripeActionMessage] Save successful! Setting isSuccess to true');
        // 提交成功，显示成功状态
        setIsSuccess(true);
        console.log('✅ [StripeActionMessage] isSuccess state updated to:', true);
        
        // 调用 onContinue 回调，让 Agent 继续执行
        if (onContinue) {
          console.log('✅ [StripeActionMessage] Calling onContinue callback after 1500ms');
          // 延迟一下，让用户看到成功状态
          setTimeout(() => {
            console.log('✅ [StripeActionMessage] Executing onContinue callback now');
            onContinue();
          }, 1500);
        } else {
          console.warn('⚠️ [StripeActionMessage] onContinue callback is not provided');
        }
      } else {
        console.error('❌ [StripeActionMessage] Save failed:', {
          code: response.code,
          info: response.info,
        });
        Alert.alert('Error', response.info || 'Failed to save Stripe keys');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('❌ [StripeActionMessage] Exception during save:', error);
      console.error('❌ [StripeActionMessage] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save Stripe keys');
      setIsSubmitting(false);
    }
  };

  // 🔍 打印渲染时的状态
  useEffect(() => {
    console.log('🎨 [StripeActionMessage] Component rendering with state:', {
      messageId: message.id,
      isSuccess,
      isSubmitting,
      hasPublishableKey: !!publishableKey,
      hasSecretKey: !!secretKey,
    });
  });

  // 如果已成功，显示成功状态
  if (isSuccess) {
    console.log('✅ [StripeActionMessage] Rendering success state UI');
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={1}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stripeLogo}>
            <Text style={styles.stripeLogoText}>S</Text>
          </View>
          <Text style={styles.headerText}>Connect your live Stripe account</Text>
        </View>

        {/* Success Status */}
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Icon name="Checkmark" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.successText}>Stripe has completed payment configuration</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stripeLogo}>
          <Text style={styles.stripeLogoText}>S</Text>
        </View>
        <Text style={styles.headerText}>Connect your live Stripe account</Text>
      </View>

      {/* Step 1: Claim your sandbox */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <Text style={styles.stepTitle}>Claim your sandbox</Text>
      </View>

      {/* Step 2: Find your live API keys - Collapsible */}
      <View style={styles.step2Container}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>2</Text>
        </View>
        <View style={styles.step2Content}>
          <TouchableOpacity
            style={styles.step2Header}
            onPress={() => setIsStep2Expanded(!isStep2Expanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.stepTitle, styles.step2Title]} numberOfLines={1}>Find your live API keys</Text>
            <Icon
              name={isStep2Expanded ? 'ChevronUp' : 'ChevronDown'}
              size={20}
              color="#000000"
            />
          </TouchableOpacity>

          {isStep2Expanded && (
            <View style={styles.step2Body}>
              {/* What is a live Stripe account? */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What is a live Stripe account?</Text>
                <Text style={styles.sectionText}>
                  A live Stripe account is one that has been fully activated and verified with your business information. Only live accounts can process real payments.
                </Text>
              </View>

              {/* How do I find my live API keys? */}
              <View style={styles.sectionLast}>
                <Text style={styles.sectionTitle}>How do I find my live API keys?</Text>
                <View style={styles.instructionList}>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>1.</Text>
                    <Text style={styles.instructionText}>
                      Open your Stripe Dashboard and switch to your live account. You can select your account from the drop-down menu in the upper-left corner of the dashboard.
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>2.</Text>
                    <Text style={styles.instructionText}>
                      In the left navigation, scroll to the bottom and click Developers → API Keys.
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>3.</Text>
                    <Text style={styles.instructionText}>
                      On the API Keys page, select Publishable key and Secret key, and copy and paste them into the form. For details, please refer to the{' '}
                      <Text style={styles.linkText}>Stripe API Key Lookup Operation Manual</Text>.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Step 3: Copy and paste your live keys */}
      <View style={styles.step3Wrapper}>
        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepTitle}>Copy and paste your live keys</Text>
        </View>

        {/* Live publishable key */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Live publishable key</Text>
          <TextInput
            style={styles.input}
            placeholder="pk_live_..."
            placeholderTextColor="#8E8E93"
            value={publishableKey}
            onChangeText={setPublishableKey}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
            keyboardType="default"
            importantForAutofill="no"
          />
        </View>

        {/* Live secret key */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Live secret key</Text>
          <TextInput
            style={styles.input}
            placeholder="sk_live_..."
            placeholderTextColor="#8E8E93"
            value={secretKey}
            onChangeText={setSecretKey}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
            importantForAutofill="no"
            keyboardType="default"
          />
        </View>
      </View>

      {/* Sync Stripe live account with Stripe sandbox */}
      <View style={styles.syncContainer}>
        <View style={styles.syncTextContainer}>
          <Text style={styles.syncTitle}>Sync Stripe live account with Stripe sandbox</Text>
          <Text style={styles.syncDescription}>
            Automatically sync your sandbox products and prices to your live account.
          </Text>
        </View>
        <Switch
          value={syncEnabled}
          onValueChange={setSyncEnabled}
          trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled, onSkip && styles.saveButtonWithSkip]}
          onPress={() => {
            console.log('🔘 [StripeActionMessage] Save button pressed, current state:', {
              isSubmitting,
              isSuccess,
              messageId: message.id,
            });
            handleSave();
          }}
          activeOpacity={0.8}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    padding: 10,
    width: '100%',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stripeLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#635BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stripeLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 0,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
  },
  stepTitle: {
    fontSize: 14,
    height: 24,
    lineHeight: 24,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    textAlignVertical: 'center',
  },
  step2Container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingRight: 10,
    paddingLeft: 10,
  },
  step2Content: {
    flex: 1,
  },
  step2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  step2Title: {
    marginBottom: 0,
    marginRight: 8,
    flexShrink: 1,
  },
  step2Body: {
    marginTop: 12,
    marginLeft: -36, // 抵消 stepNumber 的宽度(24) + marginRight(12) = 36
  },
  section: {
    marginBottom: 0,
  },
  sectionLast: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  instructionList: {
    marginTop: 8,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    marginRight: 8,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    flex: 1,
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  step3Wrapper: {
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#F9F9F9',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 24,
  },
  syncTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  syncDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  skipButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6B20',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonWithSkip: {
    flex: 1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  successContainer: {

  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  successText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
});

