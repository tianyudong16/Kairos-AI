import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { fonts, useTheme, useThemedStyles } from '@/constants/theme';

export function FocusRing({ score = 87 }: { score?: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: {
      width: 96,
      height: 96,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    center: {
      position: 'absolute' as const,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    score: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: c.ink,
    },
  }));
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.lineStrong}
          strokeWidth={stroke}
          fill="none"
        />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.ink}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{score}%</Text>
      </View>
    </View>
  );
}
