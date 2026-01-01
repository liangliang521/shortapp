import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import PreviewScreen from './src/PreviewScreen';
import { normalizeExpUrlToHttp } from './src/utils/url';

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [previewParams, setPreviewParams] = useState(null);

  const handleOpenPreview = () => {
    // 默认 manifest URL（示例）
    const defaultManifestUrl = 'http://127.0.0.1:8081/apps/text-sample/manifest.json';
    const rawUrl = inputUrl.trim() || defaultManifestUrl;
    
    // 验证 URL 格式
    if (!rawUrl) {
      return;
    }

    // 跳转到预览页面
    setPreviewParams({
      manifestUrl: rawUrl,
      moduleName: 'main',
      initialProps: {
        projectId: 'test-project',
      },
    });
  };

  const handleClosePreview = () => {
    setPreviewParams(null);
  };

  // 如果正在预览，显示预览页面
  if (previewParams) {
    return (
      <PreviewScreen
        manifestUrl={previewParams.manifestUrl}
        moduleName={previewParams.moduleName}
        initialProps={previewParams.initialProps}
        onClose={handleClosePreview}
      />
    );
  }

  // 主页面 - 输入 URL
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>子 App 预览</Text>
          <Text style={styles.description}>
            输入 manifest URL 开始预览
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="输入 manifest URL（留空则用默认）"
            placeholderTextColor="#999"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleOpenPreview}
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleOpenPreview}
          >
            <Text style={styles.buttonText}>开始预览</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>示例 URL：</Text>
          <Text style={styles.infoText}>
            http://127.0.0.1:8081/apps/text-sample/manifest.json
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

