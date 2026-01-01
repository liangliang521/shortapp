/**
 * LiquidGlassBackdrop - 液态玻璃背景组件
 * 包含背景色和圆形渐变效果
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Circle } from 'react-native-svg';

interface LiquidGlassBackdropProps {
  /**
   * 背景颜色，默认为 #F3F2F8
   */
  backgroundColor?: string;
  /**
   * 圆形渐变的大小，默认为 700
   */
  circleSize?: number;
  /**
   * 圆形渐变的位置偏移（marginBottom），默认为 -520
   */
  marginBottom?: number;
}

export const LiquidGlassBackdrop: React.FC<LiquidGlassBackdropProps> = ({
  backgroundColor = '#F3F2F8',
  circleSize = 700,
  marginBottom = -520,
}) => {
  const CIRCLE_RADIUS = circleSize / 2;

  return (
    <View style={[styles.backdrop, { backgroundColor }]}>
      {/* 圆形渐变背景 - 从中心向外逐渐透明 */}
      <View style={[styles.circularGradient, { 
        width: circleSize,
        height: circleSize,
        borderRadius: CIRCLE_RADIUS,
        marginLeft: -CIRCLE_RADIUS,
        marginBottom,
      }]}>
        {/* <Svg width={circleSize} height={circleSize} style={styles.gradientSvg}>
          <Defs>
            <SvgRadialGradient id="circleGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#5D86FF" stopOpacity="1" />
              <Stop offset="0%" stopColor="#5D86FF" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#5D86FF" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>
          <Circle
            cx={CIRCLE_RADIUS}
            cy={CIRCLE_RADIUS}
            r={CIRCLE_RADIUS}
            fill="url(#circleGradient)"
          />
        </Svg> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  circularGradient: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    overflow: 'hidden',
  },
  gradientSvg: {
    width: '100%',
    height: '100%',
  },
});

