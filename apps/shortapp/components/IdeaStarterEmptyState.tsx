/**
 * IdeaStarterEmptyState - 创意启动器空状态组件
 * 首页中间区域带入场动画的 UI
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { SparkleIcon, ArrowForwardIcon } from './icons/SvgIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 音乐图标组件
const MusicIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18V5l12-2v13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth="2" />
    <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

// 笔记本/日记图标组件
const BookIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 7h8M8 11h8M8 15h4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// 礼物/星星图标组件
const GiftIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 8v13M12 8c0-1.105-.895-2-2-2s-2 .895-2 2c0 1.105.895 2 2 2s2-.895 2-2zm0 0c0-1.105.895-2 2-2s2 .895 2 2c0 1.105-.895 2-2 2s-2-.895-2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 12h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 8V3a1 1 0 0 0-1-1H8a2 2 0 0 0-2 2v4M12 8V3a1 1 0 0 1 1-1h3a2 2 0 0 1 2 2v4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 画笔/画板图标组件
const BrushIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21.12 21.12a5 5 0 0 1-7.08 0L9 17l1.88-4.12L15 15l6.12 6.12z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 17H4v-5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 房子/建筑图标组件
const HomeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 指南针图标组件
const CompassIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 2v4M12 18v4M2 12h4M18 12h4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// 宠物/爪子图标组件
const PawIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* 四个脚趾 */}
    <Circle cx="8" cy="10" r="2.5" fill={color} />
    <Circle cx="16" cy="10" r="2.5" fill={color} />
    <Circle cx="9.5" cy="15" r="2" fill={color} />
    <Circle cx="14.5" cy="15" r="2" fill={color} />
    {/* 主掌垫 */}
    <Path
      d="M12 18c-2 0-3.5-1.5-3.5-3.5 0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5c0 2-1.5 3.5-3.5 3.5z"
      fill={color}
    />
  </Svg>
);

// 统一的数据结构：用于 Banner 和 Card
interface IdeaData {
  title: string;
  description: string;
  prompt: string;
  buttonLabel?: string;
  icon?: string;
  iconColor?: string;
  backgroundColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  buttonGradient?: string[];
  direction?: 'left' | 'right'; // 用于 Card 布局
}

interface PrimaryIdea {
  title: string;
  description: string;
  buttonLabel: string;
  icon?: string;
  iconColor?: string;
  backgroundColor: string;
  titleColor: string;
  descriptionColor: string;
  buttonGradient: string[];
  onPress: () => void;
}

interface Suggestion {
  title: string;
  description?: string;
  direction?: 'left' | 'right';
  onPress: () => void;
}

interface IdeaStarterEmptyStateProps {
  suggestions?: Suggestion[];
  footerHint?: string;
  onBannerPress?: (prompt: string) => void; // Banner/卡片点击回调
}

// 首页 Title 文案（逐词动画）
const TITLE = 'Hi, where to start today?';
const TITLE_WORDS = TITLE.split(' ');

// 统一的创意数据（紫色、蓝色、绿色、橙色、珊瑚色）
const IDEA_DATA: IdeaData[] = [
  {
    title: 'SoulNote',
    description: 'A tranquil, paper-like private diary with multimodal input, mood tracking, and privacy features',
    prompt: `App Name: SoulNote (Private Diary)

1. Bottom Nav:

Write: Minimalist writing homepage. Features include: multimodal input (text/voice/image), daily mood bubble selection, and a "one-click blur" privacy button.

Timeline: History review page. Features include: mood calendar view (mark moods with colored dots), timeline list, and "On This Day" to automatically recall memories.

Stats: Data analysis page. Features include: mood fluctuation graph, high-frequency word cloud statistics, and consecutive check-in achievement badges.

Vault: Settings and security page. Features include: Face ID/fingerprint lock on/off, fake password (enter a fake password to enter a fake space), iCloud backup, and theme/font changing.

2. UI Design Style:

Core Concept: "A tranquil, paper-like writing experience."

Visuals: Beige/parchment textured background with ample white space. Remove dividing lines and use soft card-like shadows.

Color scheme: Morandi colors (low-saturation sage green, hazy blue, earth tones), non-aggressive and visually comfortable.

Font: Elegant serif font for headings (such as Songti/Serif), clear and legible body text with ample line spacing.`,
    buttonLabel: 'Generate',
    icon: 'book',
    iconColor: '#8137F6',
    backgroundColor: '#D3B6FF',
    titleColor: '#47025D',
    descriptionColor: '#47025D',
    buttonGradient: ['#8433FF', '#9D5EFF'],
    direction: 'right',
  },
  {
    title: 'GiftSpark',
    description: 'AI-powered gift creation studio with smart guides, dual generation, and personalized gift recommendations',
    prompt: `App Name: GiftSpark

1. Bottom Nav:

Create: Core generation studio. Features include:

Smart Guide: Select recipient (e.g., "Mom"), scenario (e.g., "Birthday"), and tone (e.g., "Humorous/Touching").

Dual Generation: AI generates greeting messages (text) + matching greeting card cover image (DALL-E/MJ illustration) with one click.

Editing Console: Simple text and image layout tool, supports handwritten signatures.

Ideas: Gift recommendation engine. Features include:

Profile Analysis: Input the recipient's interests (e.g., "Tech Enthusiast," "Pet Owner"), AI recommends a precise gift list.

Budget Filtering: Slide bar controls price range.

One-Click Purchase: Direct link to e-commerce platform (Amazon).

Events: Smart Calendar. Features include: Import birthdays from contacts, anniversary countdown, smart reminder 3 days in advance "It's time to prepare a gift."

Gallery: Personal center. Features include: a cloud-based album of pre-made greeting cards, a wishlist, and an entry point for physical greeting card printing and mailing services.

2. UI Design Style:

Core Concept: "A warm sense of celebration" and "creativity."

Visuals: A rounded and lively card design (Rounded UI) is used, avoiding sharp right angles. Interactions feature subtle celebratory effects (such as confetti bursts when liking).

Color Scheme: Vibrant and bright colors. The main colors are coral pink paired with mint green, creating a festive yet modern look while avoiding the tacky feel of traditional bright red and green.

Typography: Headlines use a rounded sans font to convey a friendly and welcoming feeling.`,
    buttonLabel: 'Generate',
    icon: 'gift',
    iconColor: '#3B82F6',
    backgroundColor: '#BFDBFE',
    titleColor: '#1E3A8A',
    descriptionColor: '#1E3A8A',
    buttonGradient: ['#2563EB', '#3B82F6'],
    direction: 'left',
  },
  {
    title: 'StorySketch',
    description: 'Interactive storytelling app with split-screen drawing, real-time collaboration, and AR artwork showcase',
    prompt: `App Name: StorySketch

1. Bottom Nav:

📚 Library: Content selection center. Features include:

Interactive Picture Book Shelf: Select classic stories or AI-generated new stories.

Character Assignment: Mark "who reads the narration, who reads the main character," supports recording and reading aloud.

Difficulty Levels: Switch between modes for children (picture book style) and adults (novel/comic adaptation style).

🎨 Studio: Core split-screen experience page. Features include:

Split-screen Mode: The upper half of the screen displays scrolling story text/illustrations, and the lower half is a synchronized canvas.

Real-time Synchronization: Two people can draw on different devices, with brush strokes synchronized and visible in milliseconds.

Brush Transfer: A fun feature; one person draws the outline, and clicking "transfer" allows the other to color it.

🖼️ Gallery: Artwork showcase. Features include:

Audio Artwork: Generates a time-lapse video of the painting process, accompanied by an audio recording of the artwork being read aloud.

AR Wall: Virtually hang collaborative artwork on your wall using your camera.

❤️ Connect: Social features and settings. Features include:

Real-time Voice Chat: A floating window for voice/video chat during the painting process.

Teamwork Challenge: Entry point for the "I Say, You Draw" mini-game.

2. UI Design Style:

Core Concept: "Playful and Immersive".

Visuals: Uses a Bento Grid layout with large, round character blocks for easy touch control. Icons are in a hand-drawn doodle style.

Color Scheme: Dopamine colors. The background uses warm cream, with bright sky blue and lemon yellow as the main colors to inspire creativity.

Font: The headings use the chubby Bubble Font, while the body text uses a clean, rounded font.`,
    buttonLabel: 'Generate',
    icon: 'brush',
    iconColor: '#10B981',
    backgroundColor: '#D1FAE5',
    titleColor: '#065F46',
    descriptionColor: '#065F46',
    buttonGradient: ['#059669', '#10B981'],
    direction: 'right',
  },
  {
    title: 'DreamSpace',
    description: 'AI-powered interior design app with style exploration, AR preview, and visual search for furniture',
    prompt: `App Name: DreamSpace

1. Bottom Nav:

🏠 Inspire: Discover page. Features include:

Style Exploration: AI accurately analyzes your decorating taste (e.g., "Japanese Wabi-sabi" or "Mid-century style") through an image quiz where you swipe left to indicate you don't like it and right to indicate you do.

Case Studies: A waterfall layout showingcasing real-life home renovation examples, with filtering by apartment type and area.

✨ Redesign: Core AI feature page. Features include:

One-Click Makeover: Take a photo of your room; AI automatically removes clutter and generates renderings in various decorating styles.

AR Preview: Use your camera to project virtual furniture (sofas, lamps) in their true proportions onto your real space.

Material Replacement: Click on the floor or wall to see the effect of replacing wood flooring or painting in real time.

🛍️ Shop: Soft furnishing list. Features include:

Visual Search: Identifies furniture appearing in design drawings and recommends similar or comparable items on e-commerce platforms.

Budget Calculator: Automatically generates a renovation quote list based on the design plan.

📂 Projects: Personal project library. Features include:

Comparison Mode: Before/After comparison images with a slider.

Floor Plan Archives: Stores your home's 2D/3D floor plan data.

2. UI Design Style:

Core Concept: "High-end magazine feel" and "Immersive canvas".

Visuals: Employs an edge-to-edge design, maximizing the screen area of ​​​​the house images. Function panels use semi-transparent frosted glass to float above the images, without obstructing the view.

Color Scheme: Neutral color palette. The background is pure white (#FFFFFF) or light gray (#F5F5F5), with matte black as the accent color, creating a minimalist and restrained look that allows the furniture's color to take center stage.

Font: The title uses a geometric sans-serif font, mimicking the rational lines of architectural drawings.`,
    buttonLabel: 'Generate',
    icon: 'home',
    iconColor: '#F97316',
    backgroundColor: '#FED7AA',
    titleColor: '#9A3412',
    descriptionColor: '#9A3412',
    buttonGradient: ['#EA580C', '#F97316'],
    direction: 'left',
  },
  {
    title: 'Travel Compass',
    description: 'Mood-based travel inspiration with instant itinerary generation, visual maps, and localized AI assistant',
    prompt: `App Name: Travel Compass

1. Bottom Nav:

Explore: Inspiration Trigger. Features include:

Mood Compass: Instead of selecting a destination, choose "mood keywords" (e.g., #EscapeTheCity, #HavingABeach, #BudgetUnder2000), and AI will recommend matching cities.

Video Slideshow: Immersive full-screen short video stream similar to TikTok. Swipe left for no effect, swipe right to add to your "wish list."

Vibe Match: Scan your Spotify playlist and recommend travel destinations that match your style (e.g., recommend New Orleans if you like jazz).

Plan: Smart Planner. Features include:

Instant Itinerary Generation: Select a destination, and AI will automatically generate a "3-day 2-night special forces" or "5-day relaxing" route map.

Visual Map: Pin attractions, restaurants, and hotels directly onto a 3D map to show the best order of visits.

Route Convenience Detection:** Automatically detects whether a route is convenient, avoiding backtracking.

Guide:A localized assistant. Features include:

Lightning Rod: AI-powered analysis of real social media reviews, marking "tourist traps" and "local gems."

Pre-Trip Checklist:Automatically generates a packing list based on local weather and culture (e.g., reminding you to bring a windproof jacket when going to Iceland).

Bucket List:Your dream warehouse. Features include:

Price Drop Alerts: Instant push notifications when your saved flights or hotels drop in price.

Collaborative Editing: Invite travel companions to vote on where to go on this page.

2.UI Design Style:

Core Concept:"Breathing" and "Desire to Explore."

Visuals: Employs a floating card design with blurred destination images in the background to create an immersive experience.

Color Scheme:Sunset Gradient. The primary color scheme transitions from Coral Orange to Deep Ocean Blue, symbolizing a journey from sunrise to sunset.

Font: The headings use an expressive handwritten script, like notes in a travel journal; the information hierarchy uses a clear sans-serif font.`,
    buttonLabel: 'Generate',
    icon: 'compass',
    iconColor: '#EC4899',
    backgroundColor: '#FBCFE8',
    titleColor: '#9F1239',
    descriptionColor: '#9F1239',
    buttonGradient: ['#DB2777', '#EC4899'],
    direction: 'right',
  },
  {
    title: 'PawPedia',
    description: 'AI-powered pet identification, health screening, and comprehensive pet care guide with breed database',
    prompt: `App Name: PawPedia 

1. Bottom Nav:

Scan: Core AI visual entry point. Features include:

Breed Identification: Photograph cats, dogs, birds, or reptiles; AI identifies the breed in milliseconds, even analyzing the pedigree of mixed-breed pets (e.g., 20% Corgi + 80% Shiba Inu).

Face Decoding: Fun feature; scan your pet's facial expressions, and AI interprets its current mood (e.g., "It wants a treat" or "It's anxious").

Health Self-Check: Point the camera at your pet's eyes or affected skin area; AI performs a preliminary screening for potential health problems.

Wiki: Structured knowledge base. Features include:

3D Pet Database: Includes detailed personality radar charts, shedding index, and exercise requirements.

Avoidance Guide: Warnings about common genetic diseases and feeding contraindications for this breed (e.g., "This breed is prone to hip dysplasia").

Comparison Tool: Allows users to compare two breeds side-by-side, helping them decide which pet to get.

Training Guide: AI-powered plan generator. Features include:

 Recipe Generation: Input the pet's weight, age, and allergens; AI generates a customized weekly feeding plan (BARF feeding or dry food ratio).

Name Generator: Generates creative names based on the pet's physical characteristics (e.g., "white paws").

Training Generation: Generates step-by-step correction training plans for bad habits (e.g., "inappropriate urination").

My Pets Profile: Personal center. Features include:

 Vaccination Passport: Electronic vaccination records and deworming reminders.

Growth Timeline: Automatically captures photos from the album to generate videos showcasing the pet's growth and development.

2. UI Design Style:

 Core Concept: "Friendliness" and "Healing Feeling"

Visuals: Employing rounded corners (Squircle UI) and claymorphic 3D icons, the icons appear soft and cute, like toys, with no aggression.

Color Scheme: Nature Palette. The main color is Sage Green paired with Oatmeal, with Sunny Yellow as the secondary color, creating a relaxed and cheerful atmosphere.

Typography: The titles use a rounded and cute font (Rounded Sans) to increase friendliness.`,
    buttonLabel: 'Generate',
    icon: 'paw',
    iconColor: '#4A6741',
    backgroundColor: '#D4E6C7',
    titleColor: '#4A6741',
    descriptionColor: '#4A6741',
    buttonGradient: ['#87AE73', '#6B8E5A'],
    direction: 'left',
  },
];

// 通用洗牌函数（Fisher-Yates）
const shuffleArray = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function IdeaStarterEmptyState({
  suggestions,
  footerHint,
  onBannerPress,
}: IdeaStarterEmptyStateProps) {
  // Banner 数据（用于轮播），默认先取前 4 条，之后进入页面会随机
  const [bannerData, setBannerData] = useState<IdeaData[]>(
    IDEA_DATA.slice(0, Math.min(4, IDEA_DATA.length))
  );

  const randomizeBannerData = React.useCallback(() => {
    if (IDEA_DATA.length === 0) {
      setBannerData([]);
      return;
    }
    const randomized = shuffleArray(IDEA_DATA);
    setBannerData(randomized.slice(0, Math.min(4, IDEA_DATA.length)));
  }, []);

  useEffect(() => {
    randomizeBannerData();
  }, [randomizeBannerData]);

  // 在组件内部生成 primaryIdeas，使用传入的 onBannerPress 回调
  const primaryIdeas: PrimaryIdea[] = useMemo(() => {
    return bannerData.map((idea) => ({
      title: idea.title,
      description: idea.description,
      buttonLabel: idea.buttonLabel || 'Generate',
      icon: idea.icon,
      iconColor: idea.iconColor,
      backgroundColor: idea.backgroundColor || '#D3B6FF',
      titleColor: idea.titleColor || '#47025D',
      descriptionColor: idea.descriptionColor || '#47025D',
      buttonGradient: idea.buttonGradient || ['#8433FF', '#9D5EFF'],
      onPress: () => {
        if (onBannerPress) {
          onBannerPress(idea.prompt);
        }
      },
    }));
  }, [bannerData, onBannerPress]);

  // 默认建议（当外部未提供时使用）：从所有数据中随机选择
  const defaultSuggestions = useMemo(() => {
    return IDEA_DATA.map((item) => ({
      title: `Create "${item.title}" mini-app.`,
      description: item.description,
      direction: item.direction,
      onPress: () => {
        if (onBannerPress) {
          onBannerPress(item.prompt);
        }
      },
    }));
  }, [onBannerPress]);

  const [displaySuggestions, setDisplaySuggestions] = useState<Suggestion[]>([]);
  const hasInitializedSuggestionsRef = useRef(false);

  // 随机选择卡片的函数
  const selectRandomSuggestions = React.useCallback(() => {
    if (suggestions && suggestions.length > 0) {
      setDisplaySuggestions(suggestions.slice(0, 2));
      return;
    }

    const shuffled = shuffleArray(defaultSuggestions);
    setDisplaySuggestions(shuffled.slice(0, 2));
  }, [suggestions, defaultSuggestions]);

  // 初始挂载时选择（只执行一次）
  useEffect(() => {
    if (hasInitializedSuggestionsRef.current) {
      return;
    }
    selectRandomSuggestions();
    hasInitializedSuggestionsRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 不依赖 selectRandomSuggestions，避免父组件函数变化导致重新随机

  // 每次页面获得焦点时重新随机选择（如果没有传入 suggestions）
  useFocusEffect(
    React.useCallback(() => {
      randomizeBannerData();
      if (!suggestions || suggestions.length === 0) {
        selectRandomSuggestions();
      }
    }, [randomizeBannerData, selectRandomSuggestions, suggestions])
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false); // 防止在滚动过程中触发跳转
  
  // 创建无限循环的数组：在前后各添加一个重复项
  const infiniteBanners = useMemo(() => {
    if (primaryIdeas.length <= 1) {
      return primaryIdeas;
    }
    return [
      primaryIdeas[primaryIdeas.length - 1], // 最后一个放在最前面
      ...primaryIdeas,
      primaryIdeas[0], // 第一个放在最后面
    ];
  }, [primaryIdeas]);
  
  // 初始索引应该是 1（第一个真实项）
  const [currentBannerIndex, setCurrentBannerIndex] = useState(1);
  /**
   * 注意：Reanimated 的 hooks（useSharedValue/useAnimatedStyle）必须在组件内部调用，
   * 不能在模块顶层。这里通过 useRef 创建一次动画状态，保证在多次渲染间复用。
   */

  const insets = useSafeAreaInsets();
  const [showTitle, setShowTitle] = useState(false); // 控制 titleRow 的渲染

  // 计算容器高度：通过屏幕高度减去外层组件高度来计算
  // 不需要等待 onLayout 事件，直接计算即可
  // New App 按钮距离底部：insets.bottom + 60
  // Header 高度：120px
  // 组件 paddingTop：20px
  // 预留一些间距：20px
  const HEADER_HEIGHT = 120;
  const NEW_APP_BUTTON_BOTTOM = insets.bottom + 60;
  const COMPONENT_PADDING_TOP = 20;
  const SPACING = 20;
  const containerHeight = SCREEN_HEIGHT - HEADER_HEIGHT - insets.top - NEW_APP_BUTTON_BOTTOM - COMPONENT_PADDING_TOP - SPACING - 20;

  // 为每个单词准备 shared values（opacity + translateY）
  const wordAnimationsRef = useRef(
    TITLE_WORDS.map(() => ({
      opacity: useSharedValue(0),
      // 初始位置更低一些，打字完成后整体上移一r段距离
      translateY: useSharedValue(48),
    }))
  );
  const wordAnimations = wordAnimationsRef.current;

  // Title 整体位置：从中间位置（50%）上移到距离顶部 50px
  // 使用 top 值来控制位置，初始为中间位置，最终为 50px
  // 直接使用计算出的容器高度，不需要等待布局完成
  const initialCenter = containerHeight / 2;
  const titleTop = useSharedValue(initialCenter); // 直接使用计算出的高度，立即开始动画
  const titleTranslateY = useSharedValue(-20); // 用于垂直居中偏移（标题高度的一半）
  const titleRowOpacity = useSharedValue(0); // 控制整个 titleRow 的显示，初始完全隐藏

  // Banner 动画（只做 Y 轴轻微上移 + 淡入）
  // Banner 需要从 title 下方开始，避免被遮挡
  // title 最终在顶部 30px，高度约 30-40px，所以 Banner 应该从约 80px 开始
  const bannerOpacity = useSharedValue(0);
  const bannerY = useSharedValue(10); // 初始位置稍低，然后上移到最终位置

  // 建议卡片动画（两张，只做 Y 轴轻微上移 + 淡入）
  const card1Opacity = useSharedValue(0);
  const card1Y = useSharedValue(16);

  const card2Opacity = useSharedValue(0);
  const card2Y = useSharedValue(20);

  // FooterHint 动画（淡入）
  const footerHintOpacity = useSharedValue(0);

  // 入场动画序列
  // 直接使用计算出的高度，立即开始动画，不需要等待布局完成
  useEffect(() => {
    // 立即开始动画，不等待任何布局事件
    // 0. 在动画开始前，先渲染 titleRow（使用 setTimeout 确保在下一帧渲染）
    // 这样可以确保所有动画值都已经初始化，避免闪烁
    setTimeout(() => {
      setShowTitle(true);
      titleRowOpacity.value = 1;
    }, 0);
    
    // 1. Title 按单词依次出现 + 上浮
    TITLE_WORDS.forEach((_, index) => {
      const delay = index * 120; // 每个单词约 120ms 间隔（加快显示速度）
      const duration = 200; // 动画时长也稍微缩短
      const word = wordAnimations[index];

      word.opacity.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
      );
      word.translateY.value = withDelay(
        delay,
        withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
      );
    });

    // 粗略计算 Title 完成时间（按单词）
    const titleDuration = TITLE_WORDS.length * 120 + 200; // 更新为新的延迟时间
    const bannerDelay = titleDuration + 150;
    const card1Delay = bannerDelay + 100;
    const card2Delay = card1Delay + 100;

    // 1.5 Title 整体在打字结束后从中间位置上移到距离顶部 50px
    // 使用 titleTop.value（已用计算出的 containerHeight 初始化）作为起始位置
    const finalTop = 50; // 距离顶部 50px
    
    // 动画：上移到距离顶部 50px
    titleTop.value = withDelay(
      titleDuration,
      withTiming(finalTop, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    titleTranslateY.value = withDelay(
      titleDuration,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // 2. Banner：在稍低位置淡入，然后轻微上移到最终位置
    bannerOpacity.value = withDelay(
      bannerDelay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
    bannerY.value = withDelay(
      bannerDelay,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) })
    );

    // 3. 第一张白色卡片：从稍低位置淡入 + 上移
    card1Opacity.value = withDelay(
      card1Delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    card1Y.value = withDelay(
      card1Delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // 4. 第二张浅灰卡片：从更低位置淡入 + 上移
    card2Opacity.value = withDelay(
      card2Delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    card2Y.value = withDelay(
      card2Delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // 5. FooterHint：在 card 动画结束后淡入
    const footerHintDelay = card2Delay + 400; // card2 动画完成时间
    footerHintOpacity.value = withDelay(
      footerHintDelay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 初始化滚动位置到第一个真实项（索引 1）
  useEffect(() => {
    if (primaryIdeas.length <= 1) {
      return;
    }
    const bannerWidth = SCREEN_WIDTH - 40;
    // 延迟一下，确保 ScrollView 已经渲染
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: 1 * bannerWidth, // 滚动到第一个真实项
          animated: false,
        });
      }
    }, 100);
  }, [primaryIdeas.length]);

  // 自动轮播功能
  useEffect(() => {
    if (primaryIdeas.length <= 1) {
      return; // 只有一个或没有 banner，不需要轮播
    }

    // 清除之前的定时器
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    const bannerWidth = SCREEN_WIDTH - 40; // 减去左右 padding

    // 设置自动轮播定时器（每 3 秒切换一次）
    autoScrollTimerRef.current = setInterval(() => {
      if (isScrollingRef.current) {
        return; // 如果正在滚动，跳过本次
      }
      
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        // 滚动到下一个 banner
        if (scrollViewRef.current) {
          isScrollingRef.current = true;
          scrollViewRef.current.scrollTo({
            x: nextIndex * bannerWidth,
            animated: true,
          });
          // 滚动完成后重置标志
          setTimeout(() => {
            isScrollingRef.current = false;
          }, 500);
        }
        
        return nextIndex;
      });
    }, 3000);

    // 清理函数
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [primaryIdeas.length]);

  // Title 整体动画样式
  const titleAnimatedStyle = useAnimatedStyle(() => {
    // 使用 titleTop.value，它已经用计算出的高度初始化了
    // 确保值不为 0（如果为 0，说明初始化有问题，使用一个合理的默认值）
    const topValue = titleTop.value > 0 ? titleTop.value : 300; // 300 是一个合理的默认中间位置
    
    return {
      opacity: titleRowOpacity.value,
      top: topValue,
      transform: [{ translateY: titleTranslateY.value }],
    };
  });

  // Banner 动画样式
  const bannerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  // 卡片动画样式
  const card1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ translateY: card1Y.value }],
  }));

  const card2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ translateY: card2Y.value }],
  }));

  // FooterHint 动画样式
  const footerHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerHintOpacity.value,
  }));

  // 为每个单词创建动画样式（必须在组件顶层，使用固定的 hooks 调用）
  // TITLE_WORDS 有 6 个单词："Hi," "where" "to" "start" "today?"
  const word0Style = useAnimatedStyle(() => ({
    opacity: wordAnimations[0]?.opacity.value ?? 0,
    transform: [{ translateY: wordAnimations[0]?.translateY.value ?? 0 }],
  }));
  const word1Style = useAnimatedStyle(() => ({
    opacity: wordAnimations[1]?.opacity.value ?? 0,
    transform: [{ translateY: wordAnimations[1]?.translateY.value ?? 0 }],
  }));
  const word2Style = useAnimatedStyle(() => ({
    opacity: wordAnimations[2]?.opacity.value ?? 0,
    transform: [{ translateY: wordAnimations[2]?.translateY.value ?? 0 }],
  }));
  const word3Style = useAnimatedStyle(() => ({
    opacity: wordAnimations[3]?.opacity.value ?? 0,
    transform: [{ translateY: wordAnimations[3]?.translateY.value ?? 0 }],
  }));
  const word4Style = useAnimatedStyle(() => ({
    opacity: wordAnimations[4]?.opacity.value ?? 0,
    transform: [{ translateY: wordAnimations[4]?.translateY.value ?? 0 }],
  }));
  const word5Style = useAnimatedStyle(() => ({
    opacity: wordAnimations[5]?.opacity.value ?? 0,
    transform: [{ translateY: wordAnimations[5]?.translateY.value ?? 0 }],
  }));

  // 将样式放入数组，方便在 map 中使用
  const wordAnimatedStylesArray = useMemo(() => [
    word0Style,
    word1Style,
    word2Style,
    word3Style,
    word4Style,
    word5Style,
  ], [word0Style, word1Style, word2Style, word3Style, word4Style, word5Style]);

  // 渲染图标
  const renderIcon = (iconName?: string, iconColor?: string) => {
    const color = iconColor || '#8137F6';
    switch (iconName) {
      case 'book':
        return <BookIcon size={24} color={color} />;
      case 'gift':
        return <GiftIcon size={24} color={color} />;
      case 'brush':
        return <BrushIcon size={24} color={color} />;
      case 'home':
        return <HomeIcon size={24} color={color} />;
      case 'compass':
        return <CompassIcon size={24} color={color} />;
      case 'paw':
        return <PawIcon size={24} color={color} />;
      case 'music':
      default:
        return <MusicIcon size={24} color={color} />;
    }
  };

  return (
    <View style={[styles.container, { minHeight: containerHeight }]}>
      {/* 顶部标题 - 使用绝对定位，从中间位置上移到顶部 50px */}
      {showTitle && (
        <Animated.View style={[styles.titleRow, titleAnimatedStyle]}>
          {TITLE_WORDS.map((word, index) => (
            <Animated.Text
              key={`${word}-${index}`}
              style={[styles.headerTitleLetter, wordAnimatedStylesArray[index] || word0Style]}
            >
              {word}
              {index < TITLE_WORDS.length - 1 ? ' ' : ''}
            </Animated.Text>
          ))}
        </Animated.View>
      )}
      
      {/* 顶部主要创意横幅 - 轮播 */}
      <Animated.View style={[styles.bannerContainer, bannerAnimatedStyle]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const bannerWidth = SCREEN_WIDTH - 40; // 减去左右 padding
            const index = Math.round(offsetX / bannerWidth);
            
            // 处理无限循环：如果滚动到最后一个（重复项），跳转到第一个真实项
            if (index === infiniteBanners.length - 1) {
              // 滚动到最后一个重复项，无缝跳转到第一个真实项
              setTimeout(() => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({
                    x: 1 * bannerWidth,
                    animated: false,
                  });
                  setCurrentBannerIndex(1);
                }
              }, 50);
            } else if (index === 0) {
              // 滚动到第一个重复项，无缝跳转到最后一个真实项
              setTimeout(() => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({
                    x: (infiniteBanners.length - 2) * bannerWidth,
                    animated: false,
                  });
                  setCurrentBannerIndex(infiniteBanners.length - 2);
                }
              }, 50);
            } else {
              setCurrentBannerIndex(index);
            }
            
            isScrollingRef.current = false;
            
            // 用户手动滑动后，重置自动轮播定时器
            if (autoScrollTimerRef.current) {
              clearInterval(autoScrollTimerRef.current);
            }
            autoScrollTimerRef.current = setInterval(() => {
              if (isScrollingRef.current) {
                return;
              }
              setCurrentBannerIndex((prevIndex) => {
                const nextIndex = prevIndex + 1;
                if (scrollViewRef.current) {
                  isScrollingRef.current = true;
                  scrollViewRef.current.scrollTo({
                    x: nextIndex * bannerWidth,
                    animated: true,
                  });
                  setTimeout(() => {
                    isScrollingRef.current = false;
                  }, 500);
                }
                return nextIndex;
              });
            }, 3000);
          }}
          onScrollBeginDrag={() => {
            isScrollingRef.current = true;
            // 用户开始拖拽时，暂停自动轮播
            if (autoScrollTimerRef.current) {
              clearInterval(autoScrollTimerRef.current);
            }
          }}
          style={styles.bannerScrollView}
        >
          {infiniteBanners.map((idea, index) => (
            <View key={index} style={styles.bannerItem}>
              <Pressable
                style={styles.primaryBannerPressable}
                onPress={idea.onPress}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
              >
                <View style={[styles.primaryBanner, { backgroundColor: idea.backgroundColor }]}>
                  <View style={styles.primaryBannerContent}>
                    {/* 左侧图标 */}
                    <LinearGradient
                      colors={idea.buttonGradient && idea.buttonGradient.length >= 2 ? idea.buttonGradient : ['#8433FF', '#9D5EFF']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.iconGradient}
                    >
                      <View style={styles.iconInner}>
                        {renderIcon(idea.icon, '#FFFFFF')}
                      </View>
                    </LinearGradient>

                    {/* 中间文字区域 */}
                    <View style={styles.primaryTextContainer}>
                      <Text style={[styles.primaryTitle, { color: idea.titleColor }]} numberOfLines={1}>
                        {idea.title}
                      </Text>
                      <Text style={[styles.primaryDescription, { color: idea.descriptionColor }]} numberOfLines={2}>
                        {idea.description}
                      </Text>
                    </View>

                    {/* 右侧生成按钮 */}
                    <Pressable
                      style={styles.generateButton}
                      onPress={idea.onPress}
                      android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                    >
                      <LinearGradient
                        colors={idea.buttonGradient}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.generateButtonGradient}
                      >
                        <SparkleIcon size={16} color="#FFFFFF" />
                        <Text style={styles.generateButtonText}>
                          {idea.buttonLabel}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* 建议卡片列表 */}
      <View style={styles.suggestionsContainer}>
        {displaySuggestions.map((suggestion, index) => {
          const animatedStyle =
            index === 0 ? card1AnimatedStyle : card2AnimatedStyle;
          return (
            <Animated.View
              key={index}
              style={[
                styles.suggestionCard,
                index === 0 ? styles.suggestionCardLeft : styles.suggestionCardRight,
                animatedStyle,
              ]}
            >
              <Pressable
                style={styles.suggestionPressable}
                onPress={suggestion.onPress}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
              >
                <Text style={styles.suggestionTitle}>
                  {suggestion.title}
                </Text>
                <View style={styles.arrowIconContainer}>
                  <View style={styles.arrowIconCircle}>
                    <ArrowForwardIcon size={12} color="#999999" />
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* 底部提示文字 - 在剩余空间中居中 */}
      {footerHint && (
        <View style={styles.footerHintContainer}>
          <Animated.Text style={[styles.footerHint, footerHintAnimatedStyle]}>
            {footerHint}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'column',
  },
  titleRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 0,
    zIndex: 10,
  },
  headerTitleLetter: {
    fontSize: 24, // 从 20 增大到 24
    fontWeight: '400',
    color: '#000000',
  },
  bannerContainer: {
    width: '100%',
    marginTop: 85, // 确保在 title 下方（title 在 50px，高度约 30-35px，间距约 5px，所以从 85px 开始）
    marginBottom: 30, // 与两个 card 之间的间隔一致（gap: 20，但左侧 card 有 marginTop: -10，所以需要 20+10=30 才能达到 20px 的实际间距）
  },
  bannerScrollView: {
    width: '100%',
  },
  bannerItem: {
    width: SCREEN_WIDTH - 40, // 减去左右 padding (20 * 2)
    paddingHorizontal: 0,
    paddingRight: 0,
  },
  primaryBanner: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 0,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBannerPressable: {
    overflow: 'hidden',
  },
  primaryBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#47025D',
    marginBottom: 6,
  },
  primaryDescription: {
    fontSize: 12,
    color: '#47025D',
    lineHeight: 16,
  },
  generateButton: {
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    width: 100,
    height:36,
    gap: 6,
  },
  generateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  suggestionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 18,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  suggestionCardLeft: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 0,
    marginTop: -10,
  },
  suggestionCardRight: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 0,
    marginTop: 30,
    backgroundColor: '#F8F8F8',
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 22,
    paddingRight: 8,
    marginBottom: 8,
  },
  arrowIconContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  arrowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerHintContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60, // 确保至少有一定高度
  },
  footerHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionPressable: {
    flex: 1,
  },
});

