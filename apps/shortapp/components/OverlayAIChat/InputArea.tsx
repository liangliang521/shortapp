import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Icon from '../icons/SvgIcons';
import ImagePreview from './ImagePreview';
import { getModelDisplayName } from '../../config/models';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';

interface InputAreaProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onStopAgent?: () => void; // 停止 agent 回调
  onAddImage: () => void;
  onBuildPress: () => void;
  onModelPress: () => void;
  selectedModel: string;
  isSending: boolean;
  isTyping?: boolean;
  selectedImages?: string[];
  onRemoveImage?: (index: number) => void;
  isKeyboardVisible?: boolean; // 键盘是否可见
  onCollapsePress?: () => void; // 下拉折叠按钮点击回调
  // 项目类型选择（仅创建页面使用）
  projectType?: 'nativeapp' | 'web';
  onProjectTypeChange?: (type: 'nativeapp' | 'web') => void;
}

// SVG 加载圈圈组件
const SYSTEM_COLOR = '#FF6B35'; // 与左上角首页按钮背景色保持一致
const THEME_COLOR = '#FF5C00'; // App 主题色

const LoadingSpinner = () => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    
    return () => {
      spinAnimation.stop();
    };
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Svg width="22" height="22" viewBox="0 0 20 20">
        <Circle
          cx="10"
          cy="10"
          r="8"
          stroke={SYSTEM_COLOR}
          strokeWidth="2"
          fill="none"
          strokeDasharray="25.13 25.13"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

export default function InputArea({
  inputText,
  onInputChange,
  onSendMessage,
  onStopAgent,
  onAddImage,
  onBuildPress,
  onModelPress,
  selectedModel,
  isSending,
  isTyping = false,
  selectedImages = [],
  onRemoveImage,
  isKeyboardVisible = false,
  onCollapsePress,
  projectType,
  onProjectTypeChange,
}: InputAreaProps) {
  const isLoading = isSending || isTyping;
  const isDisabled = inputText.trim() === '' || isLoading;
  const insets = useSafeAreaInsets();
  const modelDisplayName = getModelDisplayName(selectedModel);
  const isIOS = Platform.OS === 'ios';
  const [showProjectTypeMenu, setShowProjectTypeMenu] = useState(false);
  const projectTypeButtonRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // 项目类型显示名称
  const projectTypeDisplayName = projectType === 'web' ? 'Web app' : 'Mobile app';
  
  // 计算菜单位置
  const handleOpenMenu = () => {
    if (projectTypeButtonRef.current) {
      projectTypeButtonRef.current.measureInWindow((x, y, width, height) => {
        // 菜单高度约为 80px（两个选项）
        const menuHeight = 80;
        setMenuPosition({
          top: y - menuHeight + 4, // 在按钮上方，留出 4px 间距（减小间距）
          left: x + (width - 140) / 2, // 菜单宽度 140px，相对于按钮居中
        });
        setShowProjectTypeMenu(true);
      });
    } else {
      setShowProjectTypeMenu(true);
    }
  };

  // 键盘弹起时，不使用 SafeAreaView 的底部边缘，改用 paddingBottom
  const bottomPadding = isKeyboardVisible ? 0 : insets.bottom;
  // 键盘弹起时，设置底部 padding 以保持与键盘的合适间距（创建页面和预览页面保持一致）
  const contentPaddingBottom = isKeyboardVisible ? 30 : 0;

  return (
    <View style={[styles.safeAreaContainer, { paddingBottom: 0 }]}>
      <View style={styles.inputContent}>
        {/* 下拉折叠按钮，固定在输入部分顶部，始终保持约 10px 间距 */}
        {onCollapsePress && (
          <View style={styles.collapseButtonContainer}>
            <TouchableOpacity
              style={styles.collapseButtonPressable}
              onPress={onCollapsePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isIOS && isLiquidGlassSupported ? (
                <LiquidGlassView style={styles.collapseButton} interactive effect="clear">
                  <Icon name="ChevronDown" size={18} color="#000000" />
                </LiquidGlassView>
              ) : (
                <View style={styles.collapseButtonFallback}>
                  <BlurView
                    blurType="light"
                    blurAmount={30}
                    reducedTransparencyFallbackColor="rgba(255,255,255,0.95)"
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Icon name="ChevronDown" size={18} color="#000000" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
        {/* 图片预览 */}
        {selectedImages && selectedImages.length > 0 && onRemoveImage && (
        <ImagePreview 
          selectedImages={selectedImages}
          onRemoveImage={onRemoveImage}
        />
      )}
      {/* 流动玻璃输入卡片 */}
      {isIOS && isLiquidGlassSupported ? (
        <LiquidGlassView style={[styles.glassContainer, { paddingBottom: bottomPadding }]} interactive effect="regular">
          <View style={[styles.glassContent, { paddingBottom: contentPaddingBottom }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={onInputChange}
                placeholder="What do you want to build?"
                multiline
                maxLength={5000}
              />
      <TouchableOpacity 
                style={styles.sendButton} 
                onPress={isLoading && onStopAgent ? onStopAgent : onSendMessage}
                disabled={!isLoading && isDisabled}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isLoading && onStopAgent ? (
                  // 中间方块 + 外圈旋转加载圆
                  <View style={styles.stopComposite}>
                    <LoadingSpinner />
                    <View style={styles.stopInnerSquare} />
                  </View>
                ) : (
                  <Icon 
                    name="Send" 
                    size={20} 
                    color={isDisabled ? '#C7C7CC' : THEME_COLOR} 
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* 模型切换 + 项目类型选择 + 右侧按钮 */}
            <View style={styles.bottomActionsRow}>
              <View style={styles.modelRow}>
                <TouchableOpacity
                  style={styles.modelChip}
                  onPress={onModelPress}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.modelChipText} numberOfLines={1}>
                    {modelDisplayName}
                  </Text>
                </TouchableOpacity>
                {/* 项目类型选择器（仅创建页面显示） */}
                {projectType !== undefined && onProjectTypeChange && (
                  <View style={styles.projectTypeContainer}>
                    <View ref={projectTypeButtonRef} collapsable={false}>
                      <TouchableOpacity
                        style={styles.projectTypeChip}
                        onPress={handleOpenMenu}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Icon 
                          name={projectType === 'web' ? 'WebApp' : 'MobileApp'} 
                          size={11} 
                          color="#545454" 
                        />
                        <Text style={styles.projectTypeChipText} numberOfLines={1}>
                          {projectTypeDisplayName}
                        </Text>
                        <Icon name="ChevronDown" size={14} color="#454545" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* 项目类型选择菜单 - 使用 Modal，点击屏幕任意位置关闭 */}
                    <Modal
                      visible={showProjectTypeMenu}
                      transparent={true}
                      animationType="none"
                      onRequestClose={() => setShowProjectTypeMenu(false)}
                    >
                      <TouchableOpacity
                        style={styles.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowProjectTypeMenu(false)}
                      >
                        <View 
                          style={[
                            styles.projectTypeMenuWrapper,
                            {
                              position: 'absolute',
                              top: menuPosition.top,
                              left: menuPosition.left,
                            }
                          ]}
                          pointerEvents="box-none"
                        >
                          <View pointerEvents="auto">
                          {isLiquidGlassSupported && isIOS ? (
                            <LiquidGlassView effect="clear" style={styles.projectTypeMenuGlass}>
                              <View style={styles.projectTypeMenuContent}>
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('nativeapp');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="MobileApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Mobile app
                                  </Text>
                                  {projectType === 'nativeapp' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('web');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="WebApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Web app
                                  </Text>
                                  {projectType === 'web' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </LiquidGlassView>
                          ) : (
                            <View style={styles.projectTypeMenuContent}>
                              <BlurView
                                blurType="light"
                                blurAmount={30}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.95)"
                                style={StyleSheet.absoluteFillObject}
                              />
                              <View style={styles.projectTypeMenuContent}>
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('nativeapp');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="MobileApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Mobile app
                                  </Text>
                                  {projectType === 'nativeapp' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('web');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="WebApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Web app
                                  </Text>
                                  {projectType === 'web' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </View>
                )}
              </View>

              <View style={styles.rightActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={onAddImage}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Icon name="Image" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LiquidGlassView>
      ) : (
        // 非 iOS 或不支持 LiquidGlass 的降级样式
        <View style={[styles.glassContainer, styles.glassFallback]}>
          <BlurView
            blurType="light"
            blurAmount={30}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.95)"
            style={StyleSheet.absoluteFillObject}
          />

          <View style={[styles.glassContent, { paddingBottom: contentPaddingBottom }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={onInputChange}
                placeholder="What do you want to build?"
                multiline
                maxLength={5000}
              />
      <TouchableOpacity 
                style={styles.sendButton} 
                onPress={isLoading && onStopAgent ? onStopAgent : onSendMessage}
                disabled={!isLoading && isDisabled}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isLoading && onStopAgent ? (
                  // 中间方块 + 外圈旋转加载圆
                  <View style={styles.stopComposite}>
                    <LoadingSpinner />
                    <View style={styles.stopInnerSquare} />
                  </View>
                ) : (
                  <Icon 
                    name="Send" 
                    size={20} 
                    color={isDisabled ? '#C7C7CC' : THEME_COLOR} 
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.bottomActionsRow}>
              <View style={styles.modelRow}>
                <TouchableOpacity
                  style={styles.modelChip}
                  onPress={onModelPress}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.modelChipText} numberOfLines={1}>
                    {modelDisplayName}
                  </Text>
                </TouchableOpacity>
                {/* 项目类型选择器（仅创建页面显示） */}
                {projectType !== undefined && onProjectTypeChange && (
                  <View style={styles.projectTypeContainer}>
                    <View ref={projectTypeButtonRef} collapsable={false}>
                      <TouchableOpacity
                        style={styles.projectTypeChip}
                        onPress={handleOpenMenu}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Icon 
                          name={projectType === 'web' ? 'WebApp' : 'MobileApp'} 
                          size={11} 
                          color="#545454" 
                        />
                        <Text style={styles.projectTypeChipText} numberOfLines={1}>
                          {projectTypeDisplayName}
                        </Text>
                        <Icon name="ChevronDown" size={14} color="#454545" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* 项目类型选择菜单 - 使用 Modal，点击屏幕任意位置关闭 */}
                    <Modal
                      visible={showProjectTypeMenu}
                      transparent={true}
                      animationType="none"
                      onRequestClose={() => setShowProjectTypeMenu(false)}
                    >
                      <TouchableOpacity
                        style={styles.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowProjectTypeMenu(false)}
                      >
                        <View 
                          style={[
                            styles.projectTypeMenuWrapper,
                            {
                              position: 'absolute',
                              top: menuPosition.top,
                              left: menuPosition.left,
                            }
                          ]}
                          pointerEvents="box-none"
                        >
                          <View pointerEvents="auto">
                          {isLiquidGlassSupported && isIOS ? (
                            <LiquidGlassView effect="clear" style={styles.projectTypeMenuGlass}>
                              <View style={styles.projectTypeMenuContent}>
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('nativeapp');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="MobileApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Mobile app
                                  </Text>
                                  {projectType === 'nativeapp' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('web');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="WebApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Web app
                                  </Text>
                                  {projectType === 'web' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </LiquidGlassView>
                          ) : (
                            <View style={styles.projectTypeMenuContent}>
                              <BlurView
                                blurType="light"
                                blurAmount={30}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.95)"
                                style={StyleSheet.absoluteFillObject}
                              />
                              <View style={styles.projectTypeMenuContent}>
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('nativeapp');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="MobileApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Mobile app
                                  </Text>
                                  {projectType === 'nativeapp' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.projectTypeMenuItem}
                                  onPress={() => {
                                    onProjectTypeChange('web');
                                    setShowProjectTypeMenu(false);
                                  }}
                                >
                                  <Icon name="WebApp" size={11} color="#545454" />
                                  <Text style={styles.projectTypeMenuItemText}>
                                    Web app
                                  </Text>
                                  {projectType === 'web' && (
                                    <View style={styles.activeDot} />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </View>
                )}
              </View>

              <View style={styles.rightActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={onAddImage}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Icon name="Image" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },
  inputContent: {
    position: 'relative',
    zIndex: 1,
  },
  collapseButtonContainer: {
    position: 'absolute',
    top: -45, // 距离输入部分顶部约 10px
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  collapseButtonPressable: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  glassContainer: {
    marginTop: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  glassContent: {
    marginTop: 0,
    borderRadius: 24,
    paddingTop: 16,
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 16, // 默认值，会被动态覆盖
    overflow: 'hidden',
    backgroundColor: 'transparent',
  }, 
  glassFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    maxHeight: 100,
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 20,
  },
  sendButton: {
    marginLeft: 12,
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopComposite: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInnerSquare: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: SYSTEM_COLOR,
  },
  quickActionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelChip: {
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    marginRight: 8,
  },
  modelChipText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  projectTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginLeft: 8,
  },
  projectTypeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#454545',
  },
  projectTypeContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  projectTypeMenuWrapper: {
    width: 140, // 比按钮宽度小一些
  },
  projectTypeMenu: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  projectTypeMenuGlass: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  projectTypeMenuContent: {
    borderRadius: 12,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  projectTypeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  projectTypeMenuItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#454545',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759', // 绿色
  },
});
