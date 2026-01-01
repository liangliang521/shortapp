import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { VersionHistoryIcon } from './VersionHistoryIcon';
import { WarningBellIcon } from './WarningBellIcon';

interface IconProps {
  size?: number;
  color?: string;
}

// 加号
export const PlusIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14m-7-7h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 人像
export const PersonIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <Path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 返回箭头
export const ChevronBackIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 前进箭头
export const ChevronForwardIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 向下箭头
export const ChevronDownIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 向上箭头
export const ChevronUpIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 15l-6-6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 关闭 X
export const CloseIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 勾选
export const CheckmarkIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 勾选圆圈
export const CheckmarkCircleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 设置
export const SettingsIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <Path d="M12 1v6m0 6v10M1 12h6m6 0h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 分享
export const ShareIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path d="M11.7784 9.32418C10.8619 9.32418 10.1126 9.83923 9.76368 10.6389L5.33396 8.66047C5.59235 8.24018 5.73432 7.72503 5.73432 7.16954C5.73432 6.93939 5.70846 6.70885 5.65671 6.49189L8.48505 4.18781C8.85979 4.48593 9.33781 4.66212 9.86724 4.66212C11.1459 4.66212 12.1015 3.65913 12.1015 2.3313C12.1015 1.00299 11.1456 0 9.86724 0C8.58851 0 7.64585 1.00297 7.64585 2.3313C7.64585 2.67018 7.7105 2.98181 7.81366 3.25279L5.20456 5.3533C4.68811 4.54013 3.83564 3.97078 2.86705 3.97078C1.28756 3.96664 0.00393917 5.30767 5.83373e-05 6.96612C-1.94458e-05 6.97066 -1.94458e-05 6.9752 5.83373e-05 6.97974C-0.00297356 8.63821 1.27506 9.98519 2.85456 9.98838H2.86715C3.46122 9.98838 4.0164 9.82611 4.46852 9.52792L9.55731 11.8046C9.62204 13.0649 10.5518 14 11.7783 14C13.0574 14 14 12.9973 14 11.6691C14 10.3409 13.0438 9.32418 11.7784 9.32418Z" fill={color} />
  </Svg>
);

// 主页
export const HomeIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 搜索
export const SearchIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 图片
export const ImageIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
    <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
    <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 时间
export const TimeIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 播放
export const PlayIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3l14 9-14 9V3z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 编辑/创建
export const CreateIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 垃圾桶
export const TrashIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 扫把图标
export const BroomIcon = ({ size = 24, color = '#000' }: IconProps) => {
  // 计算缩放比例，保持原始宽高比 (15:21)
  const aspectRatio = 15 / 21;
  const width = size * aspectRatio;
  const height = size;
  
  return (
    <Svg width={width} height={height} viewBox="0 0 15 21" fill="none">
      <Path 
        d="M7.1084 0.101562C7.39517 0.0978428 7.67969 0.154048 7.94531 0.269531C8.21143 0.385275 8.45364 0.556734 8.65723 0.773438C8.86083 0.990191 9.02249 1.24844 9.13281 1.53223C9.2431 1.81595 9.30001 2.12039 9.30078 2.42773V9.01465L10.8955 9.01172C11.276 9.01174 11.7964 9.12351 12.251 9.44434C12.7088 9.76756 13.0943 10.2996 13.2021 11.1279C13.3327 12.133 14.1393 18.408 14.2637 19.376C14.2957 19.4779 14.3064 19.5859 14.293 19.6924C14.2791 19.8025 14.2414 19.9083 14.1816 20C14.1219 20.0917 14.0418 20.1672 13.9482 20.2197C13.8546 20.2723 13.75 20.2997 13.6436 20.2998H0.754883C0.66165 20.2995 0.569846 20.2782 0.485352 20.2373C0.400912 20.1963 0.325547 20.1369 0.264648 20.0635C0.20372 19.9899 0.157559 19.9035 0.129883 19.8105C0.102209 19.7176 0.0928847 19.6193 0.102539 19.5225C0.337659 17.116 0.784532 12.3945 0.800781 11.707C0.824313 10.7004 1.25318 10.0373 1.78906 9.62305C2.32085 9.21203 2.95401 9.04919 3.39258 9.02832H3.39746L5.08594 9.02441V2.4668C5.0802 1.85703 5.26556 1.27617 5.6123 0.84082C5.79642 0.609196 6.02519 0.42293 6.2832 0.294922C6.54106 0.167072 6.8221 0.101475 7.10645 0.101562V0.100586L7.10742 0.101562L7.1084 0.100586V0.101562ZM3.42285 10.4346V10.4336C3.35395 10.4387 3.03776 10.4718 2.7334 10.6445C2.42456 10.8199 2.1251 11.1401 2.11133 11.7422V11.7432C2.09292 12.4888 1.66042 17.0428 1.48145 18.8945H3.26855L3.43457 15.5879C3.44367 15.4046 3.51986 15.2306 3.64844 15.1055C3.77727 14.9802 3.94868 14.914 4.125 14.9238L4.25488 14.9453C4.38045 14.9807 4.49387 15.0558 4.58008 15.1602C4.69468 15.2991 4.75254 15.4799 4.74316 15.6631L4.58105 18.8945H6.37109L6.54395 15.5859C6.55409 15.4028 6.63089 15.2291 6.75977 15.1045C6.88888 14.9798 7.06017 14.914 7.23633 14.9238H7.2373C7.41349 14.9353 7.57678 15.0217 7.69141 15.1611C7.80572 15.3004 7.86336 15.4818 7.85352 15.665L7.68359 18.8945H9.58398L9.75391 15.5869C9.76321 15.4038 9.83932 15.2304 9.96777 15.1055C10.0966 14.9802 10.2681 14.914 10.4443 14.9238L10.5742 14.9453C10.7 14.9807 10.8131 15.0556 10.8994 15.1602C11.0142 15.2993 11.0721 15.4806 11.0625 15.6641L10.8965 18.8945H12.8789C12.6315 16.9729 12.0156 12.1879 11.9033 11.3223C11.8464 10.8837 11.6322 10.663 11.4199 10.5479C11.202 10.4298 10.9773 10.419 10.9033 10.4189L3.42285 10.4346ZM7.11816 1.50684C6.93635 1.50897 6.78053 1.57486 6.65918 1.69824L6.6084 1.75488C6.47214 1.92612 6.39415 2.17448 6.39746 2.45898L6.39941 2.56055H6.39746V9.02051L7.99023 9.01758V2.43555L7.98438 2.33984C7.93389 1.8679 7.54913 1.51153 7.11816 1.50684Z" 
        fill={color} 
        stroke="black" 
        strokeWidth="0.2"
      />
    </Svg>
  );
};

// 登出
export const LogOutIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 星星
export const StarIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Sparkle Icon (带渐变，支持 color 参数)
export const SparkleIcon = ({ size = 24, color = '#000' }: IconProps) => {
  // 如果 color 是白色或接近白色，使用纯色填充；否则使用渐变
  const isWhite = color === '#FFFFFF' || color === '#fff' || color === 'white';
  const gradientId = `paint0_linear_930_239_${color.replace('#', '')}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M20.6985 11.7523C20.9188 11.0827 21.029 10.7478 21.2112 10.6866C21.2905 10.66 21.3762 10.66 21.4555 10.6866C21.6377 10.7478 21.7479 11.0827 21.9682 11.7523C22.8905 14.5571 23.3518 15.9595 24.2221 17.0704C24.623 17.5823 25.0844 18.0437 25.5963 18.4447C26.7072 19.3148 28.1097 19.7762 30.9143 20.6985C31.584 20.9188 31.919 21.029 31.9801 21.2112C32.0066 21.2905 32.0066 21.3762 31.9801 21.4555C31.919 21.6377 31.584 21.7479 30.9143 21.9682C28.1097 22.8905 26.7072 23.3518 25.5963 24.2221C25.0844 24.623 24.623 25.0844 24.2221 25.5963C23.3518 26.7072 22.8905 28.1097 21.9682 30.9144C21.7479 31.584 21.6377 31.919 21.4555 31.9801C21.3762 32.0066 21.2905 32.0066 21.2112 31.9801C21.029 31.919 20.9188 31.584 20.6985 30.9144C19.7762 28.1097 19.3148 26.7072 18.4446 25.5963C18.0437 25.0844 17.5823 24.623 17.0704 24.2221C15.9595 23.3518 14.557 22.8905 11.7523 21.9682C11.0826 21.7479 10.7478 21.6377 10.6866 21.4555C10.66 21.3763 10.66 21.2905 10.6866 21.2112C10.7478 21.029 11.0826 20.9188 11.7523 20.6985C14.557 19.7762 15.9595 19.3148 17.0704 18.4447C17.5823 18.0437 18.0437 17.5823 18.4446 17.0704C19.3148 15.9595 19.7762 14.5571 20.6985 11.7523ZM6.68794 6.05714C6.83475 5.6107 6.90818 5.38746 7.02971 5.34667C7.08253 5.32894 7.1397 5.32894 7.19253 5.34667C7.31406 5.38746 7.38748 5.6107 7.53429 6.05714C8.14925 7.92696 8.45675 8.86187 9.03693 9.60256C9.30424 9.94376 9.61185 10.2514 9.95305 10.5187C10.6937 11.0989 11.6287 11.4064 13.4985 12.0213C13.9449 12.1681 14.1681 12.2415 14.2089 12.3631C14.2267 12.4159 14.2267 12.4731 14.2089 12.5259C14.1681 12.6474 13.9449 12.7209 13.4985 12.8677C11.6287 13.4826 10.6937 13.7901 9.95305 14.3703C9.61185 14.6376 9.30424 14.9452 9.03693 15.2864C8.45675 16.0271 8.14925 16.962 7.53429 18.8319C7.38748 19.2783 7.31406 19.5016 7.19253 19.5423C7.13971 19.56 7.08253 19.56 7.02971 19.5423C6.90818 19.5016 6.83475 19.2783 6.68794 18.8319C6.07299 16.962 5.76549 16.0271 5.18526 15.2864C4.91798 14.9452 4.61038 14.6376 4.26919 14.3703C3.52849 13.7901 2.59358 13.4826 0.723764 12.8677C0.277281 12.7209 0.0540864 12.6474 0.0132993 12.5259C-0.0044331 12.4731 -0.0044331 12.4159 0.0132993 12.3631C0.0540864 12.2415 0.277281 12.1681 0.723764 12.0213C2.59358 11.4064 3.52849 11.0989 4.26919 10.5187C4.61038 10.2514 4.91798 9.94377 5.18526 9.60256C5.76549 8.86187 6.07299 7.92696 6.68794 6.05714ZM16.6244 0.452362C16.7161 0.173333 16.7621 0.0338424 16.8381 0.00833309C16.871 -0.0027777 16.9068 -0.0027777 16.9397 0.00833309C17.0157 0.0338424 17.0617 0.173333 17.1534 0.452362C17.5378 1.62102 17.73 2.20533 18.0925 2.66824C18.2596 2.88148 18.4519 3.07374 18.6651 3.24084C19.128 3.60343 19.7124 3.79565 20.8811 4.17996C21.16 4.27172 21.2996 4.31764 21.325 4.39357C21.3362 4.42657 21.3362 4.46234 21.325 4.49533C21.2996 4.5713 21.16 4.61718 20.8811 4.70899C19.7124 5.09329 19.128 5.28547 18.6651 5.64811C18.4519 5.81521 18.2596 6.00747 18.0925 6.2207C17.73 6.68362 17.5378 7.26793 17.1534 8.43654C17.0617 8.71557 17.0157 8.85511 16.9397 8.88062C16.9067 8.89168 16.871 8.89168 16.8381 8.88062C16.7621 8.85511 16.7161 8.71557 16.6244 8.43654C16.24 7.26793 16.0478 6.68362 15.6853 6.2207C15.5182 6.00745 15.3259 5.81519 15.1127 5.64811C14.6498 5.28547 14.0655 5.09329 12.8968 4.70899C12.6178 4.61718 12.4783 4.5713 12.4528 4.49533C12.4417 4.46232 12.4417 4.42658 12.4528 4.39357C12.4783 4.31764 12.6178 4.27172 12.8968 4.17996C14.0655 3.79565 14.6498 3.60343 15.1127 3.24084C15.3259 3.07376 15.5182 2.8815 15.6853 2.66824C16.0478 2.20533 16.24 1.62102 16.6244 0.452362Z" fill={isWhite ? color : `url(#${gradientId})`}/>
      {!isWhite && (
        <Defs>
          <LinearGradient id={gradientId} x1="16" y1="11" x2="16" y2="32" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FF6B20"/>
            <Stop offset="1" stopColor="#F6B63F"/>
          </LinearGradient>
        </Defs>
      )}
    </Svg>
  );
};

// 刷新
export const RefreshIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 聊天气泡
export const ChatbubblesIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 帮助/问号圆圈
export const HelpCircleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 警告圆圈
export const AlertCircleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 8v4m0 4h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 文件夹
export const FolderIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 链接
export const LinkIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 钻石
export const DiamondIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l3 7h6l-5 6 2 7-6-4-6 4 2-7-5-6h6l3-7z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 三个点（横向）
export const EllipsisHorizontalIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="1" fill={color} />
    <Circle cx="19" cy="12" r="1" fill={color} />
    <Circle cx="5" cy="12" r="1" fill={color} />
  </Svg>
);

// 打开/外部链接
export const OpenIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6m0 0v6m0-6L10 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Google Logo (简化版)
export const GoogleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={color} strokeWidth="2" />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Apple Logo (简化版)
export const AppleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2a3 3 0 00-3 3c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3z" stroke={color} strokeWidth="2" />
    <Path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7c0 2.763 1.604 5.154 3.931 6.289A10.952 10.952 0 0012 22a10.952 10.952 0 003.069-3.711C17.396 17.154 19 14.763 19 12z" stroke={color} strokeWidth="2" />
  </Svg>
);

// 箭头向前
export const ArrowForwardIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14m-7-7l7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 服务器
export const ServerIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="2" width="20" height="8" rx="2" stroke={color} strokeWidth="2" />
    <Rect x="2" y="14" width="20" height="8" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M6 6h.01M6 18h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 文档
export const DocumentIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8m8 4H8m2-8H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 构建/工具
export const BuildIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Discord Logo (简化版)
export const DiscordIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 12h.01M15 12h.01M9 18h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 关闭圆圈
export const CloseCircleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M15 9l-6 6m0-6l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 文件夹打开
export const FolderOpenIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 帮助（简化版，使用圆圈问号）
export const HelpIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 17h.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 省略号（横向）
export const EllipsisIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="1" fill={color} />
    <Circle cx="19" cy="12" r="1" fill={color} />
    <Circle cx="5" cy="12" r="1" fill={color} />
  </Svg>
);

// 下载
export const DownloadIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 10l5 5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 发送
export const SendIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 聊天气泡（单个）
export const ChatbubbleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 眼睛图标（公开/可见）
export const EyeIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

// 锁图标（私有/锁定）
export const LockIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 标签图标（分类）
export const TagIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="7" cy="7" r="1.5" fill={color} />
  </Svg>
);

// 停止/圆圈中间有点
export const StopCircleIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM1.3 8C1.3 11.3668 4.63318 14.7 8 14.7C11.3668 14.7 14.7 11.3668 14.7 8C14.7 4.63318 11.3668 1.3 8 1.3C4.63318 1.3 1.3 4.63318 1.3 8Z" fill={color}/>
    <Circle cx="8" cy="8" r="3" fill={color}/>
  </Svg>
);

// AI Chat Bubble Icon (for toggle button)
export const AIChatIcon = ({ size = 24, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path d="M20.6985 11.7523C20.9188 11.0827 21.029 10.7478 21.2112 10.6866C21.2905 10.66 21.3762 10.66 21.4555 10.6866C21.6377 10.7478 21.7479 11.0827 21.9682 11.7523C22.8905 14.5571 23.3518 15.9595 24.2221 17.0704C24.623 17.5823 25.0844 18.0437 25.5963 18.4447C26.7072 19.3148 28.1097 19.7762 30.9143 20.6985C31.584 20.9188 31.919 21.029 31.9801 21.2112C32.0066 21.2905 32.0066 21.3762 31.9801 21.4555C31.919 21.6377 31.584 21.7479 30.9143 21.9682C28.1097 22.8905 26.7072 23.3518 25.5963 24.2221C25.0844 24.623 24.623 25.0844 24.2221 25.5963C23.3518 26.7072 22.8905 28.1097 21.9682 30.9144C21.7479 31.584 21.6377 31.919 21.4555 31.9801C21.3762 32.0066 21.2905 32.0066 21.2112 31.9801C21.029 31.919 20.9188 31.584 20.6985 30.9144C19.7762 28.1097 19.3148 26.7072 18.4446 25.5963C18.0437 25.0844 17.5823 24.623 17.0704 24.2221C15.9595 23.3518 14.557 22.8905 11.7523 21.9682C11.0826 21.7479 10.7478 21.6377 10.6866 21.4555C10.66 21.3763 10.66 21.2905 10.6866 21.2112C10.7478 21.029 11.0826 20.9188 11.7523 20.6985C14.557 19.7762 15.9595 19.3148 17.0704 18.4447C17.5823 18.0437 18.0437 17.5823 18.4446 17.0704C19.3148 15.9595 19.7762 14.5571 20.6985 11.7523ZM6.68794 6.05714C6.83475 5.6107 6.90818 5.38746 7.02971 5.34667C7.08253 5.32894 7.1397 5.32894 7.19253 5.34667C7.31406 5.38746 7.38748 5.6107 7.53429 6.05714C8.14925 7.92696 8.45675 8.86187 9.03693 9.60256C9.30424 9.94376 9.61185 10.2514 9.95305 10.5187C10.6937 11.0989 11.6287 11.4064 13.4985 12.0213C13.9449 12.1681 14.1681 12.2415 14.2089 12.3631C14.2267 12.4159 14.2267 12.4731 14.2089 12.5259C14.1681 12.6474 13.9449 12.7209 13.4985 12.8677C11.6287 13.4826 10.6937 13.7901 9.95305 14.3703C9.61185 14.6376 9.30424 14.9452 9.03693 15.2864C8.45675 16.0271 8.14925 16.962 7.53429 18.8319C7.38748 19.2783 7.31406 19.5016 7.19253 19.5423C7.13971 19.56 7.08253 19.56 7.02971 19.5423C6.90818 19.5016 6.83475 19.2783 6.68794 18.8319C6.07299 16.962 5.76549 16.0271 5.18526 15.2864C4.91798 14.9452 4.61038 14.6376 4.26919 14.3703C3.52849 13.7901 2.59358 13.4826 0.723764 12.8677C0.277281 12.7209 0.0540864 12.6474 0.0132993 12.5259C-0.0044331 12.4731 -0.0044331 12.4159 0.0132993 12.3631C0.0540864 12.2415 0.277281 12.1681 0.723764 12.0213C2.59358 11.4064 3.52849 11.0989 4.26919 10.5187C4.61038 10.2514 4.91798 9.94377 5.18526 9.60256C5.76549 8.86187 6.07299 7.92696 6.68794 6.05714ZM16.6244 0.452362C16.7161 0.173333 16.7621 0.0338424 16.8381 0.00833309C16.871 -0.0027777 16.9068 -0.0027777 16.9397 0.00833309C17.0157 0.0338424 17.0617 0.173333 17.1534 0.452362C17.5378 1.62102 17.73 2.20533 18.0925 2.66824C18.2596 2.88148 18.4519 3.07374 18.6651 3.24084C19.128 3.60343 19.7124 3.79565 20.8811 4.17996C21.16 4.27172 21.2996 4.31764 21.325 4.39357C21.3362 4.42657 21.3362 4.46234 21.325 4.49533C21.2996 4.5713 21.16 4.61718 20.8811 4.70899C19.7124 5.09329 19.128 5.28547 18.6651 5.64811C18.4519 5.81521 18.2596 6.00747 18.0925 6.2207C17.73 6.68362 17.5378 7.26793 17.1534 8.43654C17.0617 8.71557 17.0157 8.85511 16.9397 8.88062C16.9067 8.89168 16.871 8.89168 16.8381 8.88062C16.7621 8.85511 16.7161 8.71557 16.6244 8.43654C16.24 7.26793 16.0478 6.68362 15.6853 6.2207C15.5182 6.00745 15.3259 5.81519 15.1127 5.64811C14.6498 5.28547 14.0655 5.09329 12.8968 4.70899C12.6178 4.61718 12.4783 4.5713 12.4528 4.49533C12.4417 4.46232 12.4417 4.42658 12.4528 4.39357C12.4783 4.31764 12.6178 4.27172 12.8968 4.17996C14.0655 3.79565 14.6498 3.60343 15.1127 3.24084C15.3259 3.07376 15.5182 2.8815 15.6853 2.66824C16.0478 2.20533 16.24 1.62102 16.6244 0.452362Z" fill="url(#paint0_linear_930_239)"/>
    <Defs>
      <LinearGradient id="paint0_linear_930_239" x1="16" y1="11" x2="16" y2="32" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FF6B20"/>
        <Stop offset="1" stopColor="#F6B63F"/>
      </LinearGradient>
    </Defs>
  </Svg>
);

// Assistant Icon (hexagonal icon for AI Assistant)
export const AssistantIcon = ({ size = 12, color = '#000' }: IconProps) => (
  <Svg width={size} height={size * 13 / 12} viewBox="0 0 12 13" fill="none">
    <Path d="M11.1717 5.29389V3.27721C11.1717 3.12181 11.0936 2.96642 10.9389 2.96642L9.54244 2.19083C9.38704 2.11347 9.23165 2.11347 9.1543 2.19083L7.2937 3.12181C7.06095 3.27721 7.06095 3.66466 7.2937 3.82006L8.53479 4.51761C8.63193 4.62409 8.68693 4.76233 8.68949 4.90644V6.22488C8.68949 6.53567 9.00028 6.69037 9.31038 6.53567L10.9396 5.60399C11.0943 5.60399 11.1724 5.44929 11.1724 5.29389H11.1717Z" fill="#FFAC74"/>
    <Path d="M3.56954 5.52693V7.31155C3.56954 7.46625 3.64689 7.62165 3.80229 7.62165L5.43152 8.55264C5.58622 8.62999 5.74162 8.62999 5.81897 8.55264L7.44889 7.62165C7.60359 7.5443 7.68094 7.3889 7.68094 7.31086V5.52762C7.68094 5.37222 7.60359 5.21683 7.4482 5.21683L5.74162 4.28653C5.58622 4.20918 5.43083 4.20918 5.35347 4.28653L3.72493 5.21683C3.64689 5.29418 3.56954 5.44888 3.56954 5.52693ZM9.31017 10.492L10.9394 9.56098C11.0941 9.48363 11.1722 9.32823 11.1722 9.25019V7.5443C11.1722 7.23351 10.8614 7.0788 10.5513 7.23351L8.92203 8.1645C8.76733 8.24185 8.68928 8.39724 8.68928 8.47529V10.1038C8.68928 10.492 9.07743 10.6474 9.31017 10.492ZM5.58622 12.4313C5.81897 12.4313 6.05171 12.3539 6.28446 12.1985L7.37084 11.5777C7.52555 11.5003 7.60359 11.3449 7.60359 11.2676V9.63833C7.60359 9.32823 7.2928 9.17284 6.9827 9.32823L5.74162 10.0258C5.58622 10.1038 5.43083 10.1038 5.35347 10.0258L4.11239 9.32823C3.87964 9.17284 3.49219 9.32823 3.49219 9.63902V11.2676C3.49219 11.423 3.56954 11.5783 3.72493 11.5783L4.88798 12.1985C5.12073 12.3539 5.35347 12.4313 5.58622 12.4313Z" fill="#F1770C"/>
    <Path d="M6.28448 0.174444C6.05577 0.059733 5.80343 0 5.54756 0C5.29169 0 5.03936 0.059733 4.81065 0.174444L3.49152 0.950037C3.25946 1.10543 3.25946 1.49288 3.56956 1.64759L5.43153 2.73466C5.58624 2.8127 5.74163 2.8127 5.81899 2.73466L7.68096 1.64897C7.91371 1.49357 7.91371 1.10612 7.68096 0.950728L6.28448 0.174444Z" fill="#FFAC74"/>
    <Path d="M0.232821 9.56089L1.78401 10.4919C2.01676 10.6473 2.40559 10.4919 2.40559 10.1811V8.55255C2.40559 8.39716 2.32754 8.24176 2.17215 8.24176L0.621654 7.31147C0.388907 7.00068 0.000764882 7.23342 0.000764882 7.54421V9.17275C0.000764882 9.32815 0.078117 9.48354 0.233512 9.56089H0.232821ZM2.63764 4.59585L3.87873 3.8983C4.11148 3.74291 4.11148 3.35477 3.87873 3.19937L2.01676 2.11368C1.86205 2.03633 1.70666 2.03633 1.6293 2.11368L0.232821 2.88927C0.161541 2.92564 0.101921 2.98132 0.0607671 3.04995C0.019613 3.11858 -0.00141804 3.1974 7.42412e-05 3.27741V5.37145C7.42412e-05 5.52684 0.0774264 5.68224 0.232821 5.68224L1.78401 6.61322C2.01676 6.76793 2.40559 6.61322 2.40559 6.30243V4.90664C2.40559 4.75125 2.48225 4.59585 2.63764 4.59585Z" fill="#F1770C"/>
  </Svg>
);

// Copy Icon
export const CopyIcon = ({ size = 15, color = '#CBCBCB' }: IconProps) => (
  <Svg width={size} height={size * 16 / 15} viewBox="0 0 15 16" fill="none">
    <Path d="M3.94737 0H13.4211C14.2934 0 15 0.650909 15 1.45455V11.6364H13.4211V1.45455H3.94737V0ZM1.57895 2.90909H10.2632C11.1355 2.90909 11.8421 3.56073 11.8421 4.36364V14.5455C11.8421 15.3484 11.1355 16 10.2632 16H1.57895C0.707369 16 0 15.3484 0 14.5455V4.36364C0 3.56073 0.707369 2.90909 1.57895 2.90909ZM10.2632 4.36364H1.57895V14.5455H10.2632V4.36364Z" fill={color}/>
  </Svg>
);

// AI Thinking Icon - 渐变背景的图标
export const ThinkingIcon = ({ size = 28, color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Rect width="28" height="28" rx="12" fill="url(#paint0_linear_thinking)"/>
    <Path d="M15.0372 13.9991C15.0372 16.691 12.855 18.8731 10.1631 18.8731C7.47126 18.8731 5.28906 16.691 5.28906 13.9991C5.28906 11.3072 7.47126 9.125 10.1631 9.125C12.855 9.125 15.0372 11.3072 15.0372 13.9991ZM7.59161 13.9991C7.59161 15.4193 8.74292 16.5706 10.1631 16.5706C11.5834 16.5706 12.7347 15.4193 12.7347 13.9991C12.7347 12.5789 11.5834 11.4275 10.1631 11.4275C8.74292 11.4275 7.59161 12.5789 7.59161 13.9991Z" fill="#F4F4F4"/>
    <Path d="M22.691 13.9991C22.691 16.691 20.5088 18.8731 17.8169 18.8731C15.1251 18.8731 12.9429 16.691 12.9429 13.9991C12.9429 11.3072 15.1251 9.125 17.8169 9.125C20.5088 9.125 22.691 11.3072 22.691 13.9991ZM15.2386 13.9991C15.2386 15.423 16.393 16.5774 17.8169 16.5774C19.2409 16.5774 20.3953 15.423 20.3953 13.9991C20.3953 12.5751 19.2409 11.4208 17.8169 11.4208C16.393 11.4208 15.2386 12.5751 15.2386 13.9991Z" fill="#F4F4F4"/>
    <Defs>
      <LinearGradient id="paint0_linear_thinking" x1="14" y1="0" x2="14" y2="28" gradientUnits="userSpaceOnUse">
        <Stop offset="0.54211" stopColor="#FF6B20"/>
        <Stop offset="1" stopColor="#FFBA97"/>
      </LinearGradient>
    </Defs>
  </Svg>
);

// Mobile App Icon - 手机图标
export const MobileAppIcon = ({ size = 11, color = '#545454' }: IconProps) => (
  <Svg width={size} height={size * 15 / 11} viewBox="0 0 11 15" fill="none">
    <Path 
      d="M8.63281 0.0498047C9.46612 0.0498047 10.1484 0.731161 10.1484 1.56445V13.2822L10.1465 13.4365C10.0999 14.2001 9.45084 14.7997 8.66992 14.7998H1.56445C0.731161 14.7997 0.0498047 14.1175 0.0498047 13.2842V1.56445C0.0498835 0.731209 0.731209 0.0498833 1.56445 0.0498047H8.63281ZM1.56445 0.881836C1.18931 0.881915 0.881915 1.18931 0.881836 1.56445V13.2842C0.881836 13.6594 1.18926 13.9667 1.56445 13.9668H8.63281C9.00807 13.9668 9.31543 13.6594 9.31543 13.2842V1.56445C9.31535 1.18926 9.00802 0.881836 8.63281 0.881836H1.56445Z" 
      fill={color} 
      stroke={color} 
      strokeWidth="0.1"
    />
  </Svg>
);

// Web App Icon - 地球/网络图标
export const WebAppIcon = ({ size = 11, color = '#545454' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 11 11" fill="none">
    <Path 
      d="M8.86875 8.81375C8.58279 8.59046 8.27579 8.39552 7.95208 8.23167C8.23892 7.43087 8.39371 6.58878 8.41042 5.73833H10.2438C10.1805 6.89799 9.69079 7.99334 8.86875 8.81375ZM6.76042 10.0558C7.11743 9.74132 7.4114 9.36181 7.62667 8.9375C7.84872 9.04906 8.06173 9.17778 8.26375 9.3225C7.81177 9.65416 7.30423 9.9025 6.765 10.0558H6.76042ZM5.95833 9.69375V8.45166C6.29767 8.48277 6.63266 8.55038 6.9575 8.65333C6.74936 9.10156 6.39778 9.46765 5.95833 9.69375ZM5.95833 5.73833H7.64042C7.62625 6.48787 7.49956 7.23102 7.26458 7.94292C6.84156 7.80167 6.40292 7.7124 5.95833 7.67708V5.73833ZM5.95833 3.3275C6.40301 3.29281 6.84172 3.20353 7.26458 3.06167C7.47017 3.67812 7.59196 4.31942 7.62667 4.96833H5.95833V3.3275ZM5.95833 1.31083C6.39704 1.53576 6.74853 1.90014 6.9575 2.34667C6.63269 2.44972 6.29769 2.51733 5.95833 2.54833V1.31083ZM8.29583 1.68208C8.09397 1.82703 7.88094 1.95577 7.65875 2.06708C7.4432 1.64295 7.14927 1.26349 6.7925 0.94875C7.32678 1.10174 7.8296 1.3485 8.2775 1.6775L8.29583 1.68208ZM10.2163 4.96833H8.38292C8.33701 4.21972 8.18262 3.48174 7.92458 2.7775C8.24859 2.61418 8.55564 2.41921 8.84125 2.19542C9.5914 2.93974 10.0693 3.91484 10.1979 4.96375L10.2163 4.96833ZM5.17458 2.56208C4.79928 2.53624 4.42844 2.46546 4.07 2.35125C4.28775 1.86476 4.68276 1.47958 5.17458 1.27417V2.56208ZM5.17458 4.96833H3.38709C3.42278 4.31954 3.54454 3.67837 3.74917 3.06167C4.20713 3.21512 4.68331 3.30758 5.16542 3.33667V4.96833H5.17458ZM5.17458 7.6725C4.69241 7.7011 4.21617 7.79358 3.75834 7.9475C3.52336 7.23561 3.39667 6.49245 3.3825 5.74292H5.17458V7.6725ZM5.17458 9.735C4.68328 9.5288 4.28851 9.14387 4.07 8.65792C4.42844 8.54371 4.79928 8.47292 5.17458 8.44708V9.735ZM2.73167 9.32708H2.75C2.95187 9.18213 3.16489 9.0534 3.38709 8.94208C3.60263 9.36621 3.89656 9.74568 4.25333 10.0604C3.70237 9.90974 3.18357 9.65966 2.7225 9.3225L2.73167 9.32708ZM0.779169 5.73833H2.6125C2.62969 6.58873 2.78447 7.43074 3.07084 8.23167C2.74683 8.39498 2.43978 8.58996 2.15417 8.81375C1.33213 7.99334 0.842406 6.89799 0.779169 5.73833ZM2.13125 2.18625C2.42089 2.40368 2.73096 2.59248 3.05709 2.75C2.79905 3.45424 2.64466 4.19222 2.59875 4.94083H0.765419C0.899532 3.89564 1.38048 2.92568 2.13125 2.18625ZM4.23958 0.944166C3.88257 1.25868 3.5886 1.63819 3.37334 2.0625C3.15601 1.95032 2.94762 1.8216 2.75 1.6775C3.19782 1.34729 3.70059 1.09901 4.235 0.944166H4.23958ZM5.5 0C4.4122 0 3.34884 0.322569 2.44437 0.926917C1.5399 1.53126 0.834947 2.39025 0.418665 3.39524C0.00238306 4.40023 -0.106535 5.5061 0.105683 6.573C0.317902 7.63989 0.841726 8.6199 1.61091 9.38909C2.3801 10.1583 3.36011 10.6821 4.42701 10.8943C5.4939 11.1065 6.59977 10.9976 7.60476 10.5813C8.60975 10.1651 9.46874 9.4601 10.0731 8.55563C10.6774 7.65116 11 6.5878 11 5.5C11 4.04131 10.4205 2.64236 9.38909 1.61091C8.35764 0.579463 6.95869 0 5.5 0Z" 
      fill={color}
    />
  </Svg>
);

// 图标映射表
const iconMap: Record<string, React.ComponentType<IconProps>> = {
  Plus: PlusIcon,
  Person: PersonIcon,
  ChevronBack: ChevronBackIcon,
  ChevronForward: ChevronForwardIcon,
  ChevronDown: ChevronDownIcon,
  ChevronUp: ChevronUpIcon,
  Close: CloseIcon,
  CloseCircle: CloseCircleIcon,
  Home: HomeIcon,
  Search: SearchIcon,
  Settings: SettingsIcon,
  Share: ShareIcon,
  Refresh: RefreshIcon,
  Create: CreateIcon,
  Checkmark: CheckmarkIcon,
  CheckmarkCircle: CheckmarkCircleIcon,
  FolderOpen: FolderOpenIcon,
  AlertCircle: AlertCircleIcon,
  Help: HelpIcon,
  Chatbubble: ChatbubbleIcon,
  Diamond: DiamondIcon,
  Document: DocumentIcon,
  Ellipsis: EllipsisIcon,
  Link: LinkIcon,
  Play: PlayIcon,
  Trash: TrashIcon,
  Broom: BroomIcon,
  Time: TimeIcon,
  Server: ServerIcon,
  Image: ImageIcon,
  Build: BuildIcon,
  Google: GoogleIcon,
  Apple: AppleIcon,
  Star: StarIcon,
  Sparkle: SparkleIcon,
  LogOut: LogOutIcon,
  Discord: DiscordIcon,
  Chatbubbles: ChatbubblesIcon,
  ArrowForward: ArrowForwardIcon,
  Download: DownloadIcon,
  Send: SendIcon,
  Eye: EyeIcon,
  Lock: LockIcon,
  Tag: TagIcon,
  StopCircle: StopCircleIcon,
  AIChat: AIChatIcon,
  VersionHistory: VersionHistoryIcon,
  WarningBell: WarningBellIcon,
  Assistant: AssistantIcon,
  Copy: CopyIcon,
  Thinking: ThinkingIcon,
  MobileApp: MobileAppIcon,
  WebApp: WebAppIcon,
};

// 默认导出：根据 name 动态渲染图标
export default function Icon({ name, size = 24, color = '#000' }: IconProps & { name: string }) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }
  return <IconComponent size={size} color={color} />;
}

