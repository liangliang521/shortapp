/**
 * VersionHistoryModal - 版本历史弹窗
 * 使用流动玻璃效果（LiquidGlassView）
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';
import Icon from '../icons/SvgIcons';
import { WarningBellIcon } from '../icons/WarningBellIcon';

export interface VersionHistoryItem {
  id: string;
  content: string; // 消息内容（兼容旧字段）
  message?: string; // 消息内容
  timestamp: number; // 时间戳（毫秒）
  createdAt?: string; // 创建时间 ISO 字符串
  version: string; // 版本号（已废弃，不再显示）
}

interface VersionHistoryModalProps {
  visible: boolean;
  versions: VersionHistoryItem[];
  currentVersionId?: string; // 当前版本ID（第一个版本）
  onClose: () => void;
  onRestore?: (version: VersionHistoryItem, dontRemind?: boolean) => void; // 恢复版本回调，dontRemind表示是否不再提醒
  onLoadMore?: () => void; // 加载更多回调
  onRefresh?: () => void; // 下拉刷新回调
  isLoadingMore?: boolean; // 是否正在加载更多
  isRefreshing?: boolean; // 是否正在刷新
  hasMore?: boolean; // 是否还有更多数据
}

// 确认恢复弹窗组件
export interface RestoreConfirmModalProps {
  visible: boolean;
  onConfirm: (dontRemind: boolean) => void; // 传递dontRemind状态
  onCancel: () => void;
  onDontRemind: (checked: boolean) => void;
}

export function RestoreConfirmModal({ visible, onConfirm, onCancel, onDontRemind }: RestoreConfirmModalProps) {
  const [dontRemind, setDontRemind] = useState(false);
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  console.log('🔔 [RestoreConfirmModal] Render', { visible });

  if (!visible) return null;

  return (
    <View style={confirmStyles.modalOverlay} pointerEvents="box-none">
      <Pressable 
        style={StyleSheet.absoluteFillObject}
        onPress={onCancel}
      >
        <View style={confirmStyles.backdrop} />
      </Pressable>

      <View style={confirmStyles.modalWrapper} pointerEvents="box-none">
        {isIOS && isLiquidGlassSupported ? (
          <LiquidGlassView
            style={confirmStyles.modalContainer}
            interactive
            effect="clear"
          >
            <View style={confirmStyles.modalContent}>
              {/* 图标 - 警告图标 */}
              <View style={confirmStyles.iconContainer}>
                <WarningBellIcon size={60} color="#D8D8D8" />
              </View>

              {/* 警告消息 */}
              <Text style={confirmStyles.warningText}>
                If you revert to the previous version, all changes made after that version will be lost.
              </Text>

              {/* 不再提醒选项 */}
              <TouchableOpacity
                style={confirmStyles.checkboxContainer}
                onPress={() => {
                  setDontRemind(!dontRemind);
                  onDontRemind(!dontRemind);
                }}
              >
                <View style={[confirmStyles.checkbox, dontRemind && confirmStyles.checkboxChecked]}>
                  {dontRemind && (
                    <Icon name="Checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={confirmStyles.checkboxLabel}>Don't remind me anymore.</Text>
              </TouchableOpacity>

              {/* 按钮 */}
              <View style={confirmStyles.buttonRow}>
                <TouchableOpacity
                  style={confirmStyles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={confirmStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={confirmStyles.restoreButton}
                  onPress={() => onConfirm(dontRemind)}
                >
                  <Text style={confirmStyles.restoreButtonText}>Restore Version</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        ) : (
          <View style={[confirmStyles.modalContainer, confirmStyles.modalContainerFallback]}>
            <BlurView
              blurType="light"
              blurAmount={30}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={confirmStyles.modalContent}>
              {/* 图标 - 警告图标 */}
              <View style={confirmStyles.iconContainer}>
                <WarningBellIcon size={60} color="#D8D8D8" />
              </View>

              {/* 警告消息 */}
              <Text style={confirmStyles.warningText}>
                If you revert to the previous version, all changes made after that version will be lost.
              </Text>

              {/* 不再提醒选项 */}
              <TouchableOpacity
                style={confirmStyles.checkboxContainer}
                onPress={() => {
                  setDontRemind(!dontRemind);
                  onDontRemind(!dontRemind);
                }}
              >
                <View style={[confirmStyles.checkbox, dontRemind && confirmStyles.checkboxChecked]}>
                  {dontRemind && (
                    <Icon name="Checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={confirmStyles.checkboxLabel}>Don't remind me anymore.</Text>
              </TouchableOpacity>

              {/* 按钮 */}
              <View style={confirmStyles.buttonRow}>
                <TouchableOpacity
                  style={confirmStyles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={confirmStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={confirmStyles.restoreButton}
                  onPress={() => onConfirm(dontRemind)}
                >
                  <Text style={confirmStyles.restoreButtonText}>Restore Version</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function VersionHistoryModal({
  visible,
  versions,
  currentVersionId,
  onClose,
  onRestore,
  onLoadMore,
  onRefresh,
  isLoadingMore = false,
  isRefreshing = false,
  hasMore = false,
}: VersionHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // 当弹窗打开时，默认选中第一个版本
  useEffect(() => {
    if (visible && versions.length > 0) {
      setSelectedVersionId(versions[0].id);
    }
  }, [visible, versions]);

  // 获取当前版本ID（第一个版本或传入的currentVersionId）
  const getCurrentVersionId = () => {
    if (currentVersionId) return currentVersionId;
    if (versions.length > 0) return versions[0].id;
    return null;
  };

  const currentVersion = getCurrentVersionId();
  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  // 处理版本选择
  const handleVersionSelect = (version: VersionHistoryItem) => {
    setSelectedVersionId(version.id);
  };

  // 处理恢复按钮点击
  const handleRestorePress = () => {
    if (!selectedVersion) {
      return;
    }
    
    // 直接调用onRestore，让父组件决定是否显示确认弹窗
    onRestore?.(selectedVersion);
  };


  // 格式化时间显示
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // 格式化创建时间显示
  const formatCreatedAt = (createdAt?: string): string => {
    if (!createdAt) return '';
    try {
      const date = new Date(createdAt);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
    } catch (e) {
      return '';
    }
  };

  // 截断内容显示
  const truncateContent = (content: string | undefined | null, maxLength: number = 50): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.modalOverlay} pointerEvents="box-none">
      {/* 背景遮罩 */}
      <Pressable 
        style={StyleSheet.absoluteFillObject}
        onPress={onClose}
      >
        <View style={styles.backdrop} />
      </Pressable>

      {/* 流动玻璃效果容器 */}
      <View style={styles.modalWrapper} pointerEvents="box-none">
          {isIOS && isLiquidGlassSupported ? (
            <LiquidGlassView
              style={[styles.modalContainer]}
              interactive
              effect="clear"
            >
            <View style={styles.modalContent}>
              {/* 标题栏 */}
              <View style={styles.header}>
                <Text style={styles.title}>Version history</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="Close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {/* 版本列表 */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor="#8E8E93"
                    colors={['#8E8E93']}
                  />
                }
                onScroll={(event) => {
                  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                  const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                  if (isCloseToBottom && hasMore && !isLoadingMore && !isRefreshing && onLoadMore) {
                    onLoadMore();
                  }
                }}
                scrollEventThrottle={400}
              >
                {versions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No version history</Text>
                  </View>
                ) : (
                  <>
                    {versions.map((item) => {
                      const isCurrentVersion = item.id === currentVersion;
                      const isSelected = item.id === selectedVersionId;
                      
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.versionItem,
                            isSelected && styles.versionItemSelected,
                          ]}
                          onPress={() => handleVersionSelect(item)}
                        >
                          <View style={styles.versionItemContent}>
                            <View style={styles.versionContentRow}>
                              {isCurrentVersion && (
                                <View style={styles.currentVersionDot} />
                              )}
                              <Text style={styles.versionContent} numberOfLines={2}>
                                {truncateContent(item.message || item.content)}
                              </Text>
                            </View>
                            <View style={styles.versionMeta}>
                              <Text style={styles.versionTime}>
                                {item.createdAt ? formatCreatedAt(item.createdAt) : formatTime(item.timestamp)}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {isLoadingMore && (
                      <View style={styles.loadingMoreContainer}>
                        <Text style={styles.loadingMoreText}>Loading more...</Text>
                      </View>
                    )}
                    {!hasMore && versions.length > 0 && (
                      <View style={styles.loadingMoreContainer}>
                        <Text style={styles.loadingMoreText}>No more versions</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* 底部按钮 */}
              {selectedVersion && (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={handleRestorePress}
                  >
                    <Text style={styles.restoreButtonText}>Restore Version</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LiquidGlassView>
        ) : (
          // 降级方案：使用 BlurView
          <View style={[styles.modalContainer, styles.modalContainerFallback, { paddingTop: insets.top + 20 }]}>
            <BlurView
              blurType="light"
              blurAmount={30}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalContent}>
              {/* 标题栏 */}
              <View style={styles.header}>
                <Text style={styles.title}>Version history</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="Close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {/* 版本列表 */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor="#8E8E93"
                    colors={['#8E8E93']}
                  />
                }
                onScroll={(event) => {
                  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                  const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                  if (isCloseToBottom && hasMore && !isLoadingMore && !isRefreshing && onLoadMore) {
                    onLoadMore();
                  }
                }}
                scrollEventThrottle={400}
              >
                {versions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No version history</Text>
                  </View>
                ) : (
                  <>
                    {versions.map((item) => {
                      const isCurrentVersion = item.id === currentVersion;
                      const isSelected = item.id === selectedVersionId;
                      
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.versionItem,
                            isSelected && styles.versionItemSelected,
                          ]}
                          onPress={() => handleVersionSelect(item)}
                        >
                          <View style={styles.versionItemContent}>
                            <View style={styles.versionContentRow}>
                              {isCurrentVersion && (
                                <View style={styles.currentVersionDot} />
                              )}
                              <Text style={styles.versionContent} numberOfLines={2}>
                                {truncateContent(item.message || item.content)}
                              </Text>
                            </View>
                            <View style={styles.versionMeta}>
                              <Text style={styles.versionTime}>
                                {item.createdAt ? formatCreatedAt(item.createdAt) : formatTime(item.timestamp)}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {isLoadingMore && (
                      <View style={styles.loadingMoreContainer}>
                        <Text style={styles.loadingMoreText}>Loading more...</Text>
                      </View>
                    )}
                    {!hasMore && versions.length > 0 && (
                      <View style={styles.loadingMoreContainer}>
                        <Text style={styles.loadingMoreText}>No more versions</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* 底部按钮 */}
              {selectedVersion && (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={handleRestorePress}
                  >
                    <Text style={styles.restoreButtonText}>Restore Version</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        </View>

    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalWrapper: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    zIndex: 10000,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '100%',
    minHeight: 500,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  modalContainerFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  versionItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  versionItemSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  versionItemContent: {
    flex: 1,
  },
  versionContent: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 8,
    lineHeight: 20,
  },
  versionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  versionNumber: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  restoreButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FF6B20',
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currentVersionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 8,
    marginTop: 6,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

// 确认弹窗样式
const confirmStyles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10001,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalWrapper: {
    width: '85%',
    maxWidth: 400,
    zIndex: 10002,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  modalContainerFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#FF6B20',
    backgroundColor: '#FF6B20',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  restoreButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FF6B20',
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

