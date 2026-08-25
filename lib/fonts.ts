import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import { FontDisplay, type FontSource } from 'expo-font';

/** Use swap on web so labels stay visible while custom fonts load. */
function withSwap(source: number): FontSource {
  return { uri: source, display: FontDisplay.SWAP };
}

/**
 * Single font map for web, iOS, and Android.
 * Ionicons lives in assets/ so Metro always emits the .ttf into static exports.
 */
export const appFonts: Record<string, FontSource> = {
  DMSans_400Regular: withSwap(DMSans_400Regular),
  DMSans_500Medium: withSwap(DMSans_500Medium),
  DMSans_600SemiBold: withSwap(DMSans_600SemiBold),
  DMSans_700Bold: withSwap(DMSans_700Bold),
  Fraunces_600SemiBold: withSwap(Fraunces_600SemiBold),
  Fraunces_600SemiBold_Italic: withSwap(Fraunces_600SemiBold_Italic),
  ionicons: withSwap(require('../assets/fonts/Ionicons.ttf')),
};
