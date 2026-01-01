import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export const StopCircleIcon = ({ size = 24, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM1.3 8C1.3 11.3668 4.63318 14.7 8 14.7C11.3668 14.7 14.7 11.3668 14.7 8C14.7 4.63318 11.3668 1.3 8 1.3C4.63318 1.3 1.3 4.63318 1.3 8Z" fill={color}/>
    <Circle cx="8" cy="8" r="3" fill={color}/>
  </Svg>
);


