/**
 * SettingsScreen - 设置页面
 * 使用 React Navigation 进行路由管理
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import SettingsScreenComponent from '../components/SettingsScreen';
import { ModalScreenWrapper } from '../components/ModalScreenWrapper';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const routeName = route?.name ?? '';
  const shouldShowHeader = routeName === 'Settings';

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUpgrade = () => {
    navigation.navigate('Subscription' as never);
  };

  const handleLogout = () => {
    // 返回到首页（设置页面是 modal，goBack 即可关闭）
    navigation.goBack();
  };

  const handleLogoutWithRefresh = () => {
    // 删除账号后返回首页（设置页面是 modal，goBack 即可关闭）
    navigation.goBack();
  };

  return (
    <ModalScreenWrapper edges={['top']}>
      <SettingsScreenComponent
        onBack={handleBack}
        onUpgrade={handleUpgrade}
        onLogout={handleLogout}
        onDeleteAccount={handleLogoutWithRefresh}
        showHeader={shouldShowHeader}
      />
    </ModalScreenWrapper>
  );
};

